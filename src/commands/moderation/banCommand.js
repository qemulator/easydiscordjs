const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colorAccent } = require('../../../config/config.json').botSettings;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The member to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for banning'))
        .addNumberOption(option =>
            option.setName('days')
                .setDescription('Number of days of messages to delete')
                .setMinValue(0)
                .setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const deleteMessageDays = interaction.options.getNumber('days') ?? 0;
        
        if (!target.bannable) {
            const errorEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Permission Error')
                .setDescription('I cannot ban this user! They may have higher permissions than me.')
                .setTimestamp();
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            const selfBanEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Invalid Action')
                .setDescription('You cannot ban yourself!')
                .setTimestamp();
            return interaction.reply({ embeds: [selfBanEmbed], ephemeral: true });
        }

        if (target.roles.highest.position >= interaction.member.roles.highest.position) {
            const hierarchyEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Role Hierarchy Error')
                .setDescription('You cannot ban someone with an equal or higher role!')
                .setTimestamp();
            return interaction.reply({ embeds: [hierarchyEmbed], ephemeral: true });
        }

        const confirmationEmbed = new EmbedBuilder()
            .setColor(colorAccent)
            .setTitle('🔨 Ban Confirmation')
            .setDescription(`Are you sure you want to ban ${target.user.tag}?`)
            .addFields(
                { name: 'Target User', value: `${target.user.tag} (${target.id})`, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Message Deletion', value: `${deleteMessageDays} days`, inline: true }
            )
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_ban')
                    .setLabel('Confirm Ban')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_ban')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await interaction.reply({
            embeds: [confirmationEmbed],
            components: [buttons],
            ephemeral: true
        });

        const collector = response.createMessageComponentCollector({
            time: 15000
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: 'You cannot use these buttons!',
                    ephemeral: true
                });
            }

            if (i.customId === 'confirm_ban') {
                try {
                    await target.ban({
                        deleteMessageDays: deleteMessageDays,
                        reason: reason
                    });
                    
                    const successEmbed = new EmbedBuilder()
                        .setColor(colorAccent)
                        .setTitle('✅ Member Banned')
                        .setDescription(`Successfully banned ${target.user.tag}`)
                        .addFields(
                            { name: 'Reason', value: reason },
                            { name: 'Banned by', value: interaction.user.tag },
                            { name: 'Message Deletion', value: `${deleteMessageDays} days` }
                        )
                        .setTimestamp();

                    await i.update({
                        embeds: [successEmbed],
                        components: []
                    });
                } catch (error) {
                    console.error(error);
                    const errorEmbed = new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('❌ Error')
                        .setDescription('An error occurred while trying to ban the member.')
                        .setTimestamp();

                    await i.update({
                        embeds: [errorEmbed],
                        components: []
                    });
                }
            } else if (i.customId === 'cancel_ban') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor(colorAccent)
                    .setTitle('⚠️ Ban Cancelled')
                    .setDescription('The ban command has been cancelled.')
                    .setTimestamp();

                await i.update({
                    embeds: [cancelEmbed],
                    components: []
                });
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(colorAccent)
                    .setTitle('⏰ Time Expired')
                    .setDescription('Ban command timed out.')
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: []
                });
            }
        });
    },
};