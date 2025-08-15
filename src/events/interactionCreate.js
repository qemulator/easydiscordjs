const { Events, MessageFlags } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        console.log(`Interaction received: ${interaction.commandName}`);
        if (!interaction.isChatInputCommand()) return;
        const botCommands = interaction.client.commands.get(interaction.commandName);
        if (!botCommands) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        try {
            await botCommands.execute(interaction);
        } catch (error) {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
            }
            console.error(error);
        }
    }
};