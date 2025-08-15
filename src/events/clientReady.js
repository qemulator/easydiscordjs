const { Events, ActivityType } = require('discord.js');
const { loadCommands, getCommandStats } = require('../context/loadCommands.js');
const { presenceMessage } = require('../../config/config.json').algoraBot;

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        loadCommands(client, 'src/commands');
        const stats = getCommandStats(client);

        console.log(`Client online as: ${client.user.tag}`);

        console.log(`📊 Bot ready with ${stats.total} commands in ${Object.keys(stats.categories).length} categories`);

        client.user.setPresence({
            activities: [{ 
                name: presenceMessage, 
                type: ActivityType.Watching 
            }], 
            status: 'online'
        });
    }
};