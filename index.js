const fileSystem = require('node:fs');
const path = require('node:path');

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { clientToken } = require('./config/config.json').algoraBot;

const botClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const foldersPath = path.join(__dirname, 'src', 'commands');
const commandsFolder = fileSystem.readdirSync(foldersPath);
const eventsPath = path.join(__dirname, 'src', 'events');
const eventFiles = fileSystem.readdirSync(eventsPath);

botClient.commands = new Collection();

for (const folder of commandsFolder) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fileSystem.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            botClient.commands.set(command.data.name, command);
        } else {
            console.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        botClient.once(event.name, (...args) => event.execute(...args, botClient));
    } else {
        botClient.on(event.name, (...args) => event.execute(...args, botClient));
    }
}

botClient.login(clientToken);