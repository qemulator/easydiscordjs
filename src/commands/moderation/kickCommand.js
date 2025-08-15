const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colorAccent } = require('../../../config/config.json').botSettings;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for kicking'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        
        if (!target.kickable) {
            const errorEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Permission Error')
                .setDescription('I cannot kick this user! They may have higher permissions than me.')
                .setTimestamp();
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            const selfKickEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Invalid Action')
                .setDescription('You cannot kick yourself!')
                .setTimestamp();
            return interaction.reply({ embeds: [selfKickEmbed], ephemeral: true });
        }

        if (target.roles.highest.position >= interaction.member.roles.highest.position) {
            const hierarchyEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Role Hierarchy Error')
                .setDescription('You cannot kick someone with an equal or higher role!')
                .setTimestamp();
            return interaction.reply({ embeds: [hierarchyEmbed], ephemeral: true });
        }

        const confirmationEmbed = new EmbedBuilder()
            .setColor(colorAccent)
            .setTitle('🔨 Kick Confirmation')
            .setDescription(`Are you sure you want to kick ${target.user.tag}?`)
            .addFields(
                { name: 'Target User', value: `${target.user.tag} (${target.id})`, inline: true },
                { name: 'Reason', value: reason, inline: true }
            )
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_kick')
                    .setLabel('Confirm Kick')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_kick')
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

            if (i.customId === 'confirm_kick') {
                try {
                    await target.kick(reason);
                    const successEmbed = new EmbedBuilder()
                        .setColor(colorAccent)
                        .setTitle('✅ Member Kicked')
                        .setDescription(`Successfully kicked ${target.user.tag}`)
                        .addFields(
                            { name: 'Reason', value: reason },
                            { name: 'Kicked by', value: interaction.user.tag }
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
                        .setDescription('An error occurred while trying to kick the member.')
                        .setTimestamp();

                    await i.update({
                        embeds: [errorEmbed],
                        components: []
                    });
                }
            } else if (i.customId === 'cancel_kick') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor(colorAccent)
                    .setTitle('⚠️ Kick Cancelled')
                    .setDescription('The kick command has been cancelled.')
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
                    .setDescription('Kick command timed out.')
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: []
                });
            }
        });
    },
};