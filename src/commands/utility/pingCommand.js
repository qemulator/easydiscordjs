const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colorAccent } = require('../../../config/config.json').botSettings;

function formatUptime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.length > 0 ? parts.join(', ') : 'less than 1s';
}

function createPingEmbed(client, interaction) {
    const roundtripLatency = Date.now() - interaction.createdTimestamp;

    return new EmbedBuilder()
        .setColor(colorAccent)
        .setTitle('🚀 Bot Status')
        .setDescription('Here is a snapshot of the bot\'s current performance and network latency.')
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
            { name: '🌐 API Latency', value: `\`${client.ws.ping}ms\``, inline: true },
            { name: '🤖 Bot Latency', value: `\`${roundtripLatency}ms\``, inline: true },
            { name: '⏳ Uptime', value: `\`${formatUptime(client.uptime)}\``, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Displays bot latency and network information'),
    async execute(interaction) {
        await interaction.deferReply();

        const pingEmbed = createPingEmbed(interaction.client, interaction);
        const refreshButton = new ButtonBuilder()
            .setCustomId('refresh_ping')
            .setLabel('Refresh Status')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Primary);

        const actionRow = new ActionRowBuilder().addComponents(refreshButton);

        await interaction.editReply({ embeds: [pingEmbed], components: [actionRow] });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.customId === 'refresh_ping' && i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async i => {
            await i.deferUpdate();
            const newPingEmbed = createPingEmbed(i.client, i);
            await i.editReply({ embeds: [newPingEmbed], components: [actionRow] });
        });

        collector.on('end', async () => {
            const updatedEmbed = createPingEmbed(interaction.client, interaction);
            await interaction.editReply({ embeds: [updatedEmbed], components: [] });
        });
    }
};