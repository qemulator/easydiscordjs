const { REST, Routes } = require('discord.js');
const { clientId, guildId, clientToken } = require('../../config/config.json').algoraBot;
const fileSystem = require('node:fs');
const path = require('node:path');

const commands = [];
const foldersPath = path.join(__dirname, '..', 'commands');
const commandsFolder = fileSystem.readdirSync(foldersPath);

for (const folder of commandsFolder) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fileSystem.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const rest = new REST().setToken(clientToken);

(async () => {
    try {
        console.log(`Started refreshing" ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded: ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();