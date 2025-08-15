const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colorAccent } = require('../../../config/config.json').botSettings;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The member to timeout')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Timeout duration (1m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the timeout'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        const durationMs = parseDuration(duration);
        
        if (!durationMs) {
            const invalidDurationEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Invalid Duration')
                .setDescription('Please provide a valid duration (e.g., 1m, 1h, 1d)')
                .setTimestamp();
            return interaction.reply({ embeds: [invalidDurationEmbed], ephemeral: true });
        }

        if (!target.moderatable) {
            const errorEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Permission Error')
                .setDescription('I cannot timeout this user! They may have higher permissions than me.')
                .setTimestamp();
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            const selfTimeoutEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Invalid Action')
                .setDescription('You cannot timeout yourself!')
                .setTimestamp();
            return interaction.reply({ embeds: [selfTimeoutEmbed], ephemeral: true });
        }

        if (target.roles.highest.position >= interaction.member.roles.highest.position) {
            const hierarchyEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Role Hierarchy Error')
                .setDescription('You cannot timeout someone with an equal or higher role!')
                .setTimestamp();
            return interaction.reply({ embeds: [hierarchyEmbed], ephemeral: true });
        }

        const confirmationEmbed = new EmbedBuilder()
            .setColor(colorAccent)
            .setTitle('⏰ Timeout Confirmation')
            .setDescription(`Are you sure you want to timeout ${target.user.tag}?`)
            .addFields(
                { name: 'Target User', value: `${target.user.tag} (${target.id})`, inline: true },
                { name: 'Duration', value: formatDuration(durationMs), inline: true },
                { name: 'Reason', value: reason, inline: true }
            )
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_timeout')
                    .setLabel('Confirm Timeout')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_timeout')
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

            if (i.customId === 'confirm_timeout') {
                try {
                    await target.timeout(durationMs, reason);
                    
                    const successEmbed = new EmbedBuilder()
                        .setColor(colorAccent)
                        .setTitle('✅ Member Timed Out')
                        .setDescription(`Successfully timed out ${target.user.tag}`)
                        .addFields(
                            { name: 'Duration', value: formatDuration(durationMs) },
                            { name: 'Reason', value: reason },
                            { name: 'Timed out by', value: interaction.user.tag }
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
                        .setDescription('An error occurred while trying to timeout the member.')
                        .setTimestamp();

                    await i.update({
                        embeds: [errorEmbed],
                        components: []
                    });
                }
            } else if (i.customId === 'cancel_timeout') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor(colorAccent)
                    .setTitle('⚠️ Timeout Cancelled')
                    .setDescription('The timeout command has been cancelled.')
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
                    .setDescription('Timeout command timed out.')
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: []
                });
            }
        });
    },
};

function parseDuration(duration) {
    const regex = /^(\d+)([mhd])$/;
    const match = duration.toLowerCase().match(regex);
    
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000
    };
    
    return value * multipliers[unit];
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day(s)`;
    if (hours > 0) return `${hours} hour(s)`;
    if (minutes > 0) return `${minutes} minute(s)`;
    return `${seconds} second(s)`;
}