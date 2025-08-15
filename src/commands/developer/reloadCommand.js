const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { ownerId } = require('../../../config/config.json').algoraBot;
const { colorAccent } = require('../../../config/config.json').botSettings;
const { reloadCommands } = require('../../context/loadCommands.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads all commands'),
    async execute(interaction) {
        
        if (!ownerId.includes(interaction.user.id)) {
            const permissionEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('🛑 Access Denied')
                .setDescription('You do not have permission to use this command.');
            return interaction.reply({ embeds: [permissionEmbed], flags: MessageFlags.Ephemeral });
        }

        const confirmationEmbed = new EmbedBuilder()
            .setColor(colorAccent)
            .setTitle('🔄 Reload Commands')
            .setDescription('Reloading commands will refresh all available commands in the bot. Are you sure you want to proceed?')
            .setFooter({ text: 'This action is irreversible.' });

        
        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm_reload')
            .setLabel('Confirm')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_reload')
            .setLabel('Cancel')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
        
        const reply = await interaction.reply({
            embeds: [confirmationEmbed],
            components: [actionRow],
            flags: MessageFlags.Ephemeral,
        });
        
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 30000 
        });

        collector.on('collect', async i => {
            await i.deferUpdate();

            if (i.customId === 'confirm_reload') {
                const client = i.client;

                try {
                    await reloadCommands(client);
                    await i.editReply({
                        embeds: [],
                        content: "✅ All commands have been reloaded successfully!",
                        components: [] 
                    });
                } catch (error) {
                    console.error("Error reloading commands:", error);
                    await i.editReply({
                        embeds: [],
                        content: "❌ There was an error reloading the commands.",
                        components: []
                    });
                }
            } else if (i.customId === 'cancel_reload') {
                await i.editReply({
                    embeds: [],
                    content: "Command reload has been canceled.",
                    components: [] 
                });
            }

            collector.stop(); 
        });

        collector.on('end', async (collected) => {
            
            if (collected.size === 0) {
                await interaction.editReply({
                    embeds: [],
                    content: "Command reload timed out. Please try again.",
                    components: []
                });
            }
        });
    }
};