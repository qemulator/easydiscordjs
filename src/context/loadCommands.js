const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

function loadCommands(client, commandsDir = 'src/commands') {
    if (!client.commands) {
        client.commands = new Collection();
    }

    const commandsPath = path.join(process.cwd(), commandsDir);
    
    if (!fs.existsSync(commandsPath)) {
        console.error(`❌ Commands directory not found: ${commandsPath}`);
        return;
    }

    console.log(`📁 Loading commands from: ${commandsPath}`);
    
    try {
        const items = fs.readdirSync(commandsPath, { withFileTypes: true });
        let loadedCount = 0;
        const categoryStats = {};

        for (const item of items) {
            const itemPath = path.join(commandsPath, item.name);
            
            if (item.isDirectory()) {
                const categoryName = item.name;
                const categoryCount = loadCommandsFromCategory(client, itemPath, categoryName);
                
                if (categoryCount > 0) {
                    categoryStats[categoryName] = categoryCount;
                    loadedCount += categoryCount;
                }
                
            } else if (item.name.endsWith('.js')) {
                const command = loadSingleCommand(itemPath, 'general');
                
                if (command) {
                    client.commands.set(command.data.name, command);
                    loadedCount++;
                    
                    if (!categoryStats['general']) {
                        categoryStats['general'] = 0;
                    }
                    categoryStats['general']++;
                    
                    console.log(`✅ Loaded command: ${command.data.name} (Category: general)`);
                }
            }
        }

        console.log(`\n📊 Command Loading Summary:`);
        console.log(`   Total Commands Loaded: ${loadedCount}`);
        console.log(`   Categories Found: ${Object.keys(categoryStats).length}`);
        
        Object.entries(categoryStats).forEach(([category, count]) => {
            console.log(`   📁 ${category}: ${count} commands`);
        });
        
        if (loadedCount === 0) {
            console.warn('⚠️  No commands were loaded. Please check your command files.');
        } else {
            console.log('✨ All commands loaded successfully!\n');
        }

    } catch (error) {
        console.error('❌ Error loading commands:', error);
    }
}

function loadCommandsFromCategory(client, categoryPath, categoryName) {
    try {
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
        let categoryLoadedCount = 0;

        for (const file of commandFiles) {
            const filePath = path.join(categoryPath, file);
            const command = loadSingleCommand(filePath, categoryName);
            
            if (command) {
                client.commands.set(command.data.name, command);
                categoryLoadedCount++;
                console.log(`✅ Loaded command: ${command.data.name} (Category: ${categoryName})`);
            }
        }

        return categoryLoadedCount;
    } catch (error) {
        console.error(`❌ Error loading category "${categoryName}":`, error);
        return 0;
    }
}

function loadSingleCommand(filePath, category) {
    try {
        delete require.cache[require.resolve(filePath)];
        
        const command = require(filePath);
        
        if (!command.data || !command.execute) {
            console.warn(`⚠️  Invalid command structure in ${filePath} - missing 'data' or 'execute' property`);
            return null;
        }

        command.category = category;
        command.filePath = filePath;
        command.loadedAt = new Date();
        
        return command;
        
    } catch (error) {
        console.error(`❌ Failed to load command from ${filePath}:`, error.message);
        return null;
    }
}

function reloadCommands(client, commandsDir = 'src/commands') {
    console.log('🔄 Reloading all commands...');
    
    if (client.commands) {
        client.commands.clear();
    }
    
    loadCommands(client, commandsDir);
}

function reloadCommand(client, commandName) {
    const command = client.commands.get(commandName);
    
    if (!command) {
        console.error(`❌ Command "${commandName}" not found`);
        return false;
    }
    
    if (!command.filePath) {
        console.error(`❌ Cannot reload command "${commandName}" - no file path stored`);
        return false;
    }
    
    try {
        console.log(`🔄 Reloading command: ${commandName}`);
        
        const reloadedCommand = loadSingleCommand(command.filePath, command.category);
        
        if (reloadedCommand) {
            client.commands.set(commandName, reloadedCommand);
            console.log(`✅ Successfully reloaded: ${commandName}`);
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error(`❌ Failed to reload command "${commandName}":`, error.message);
        return false;
    }
}

function getCommandStats(client) {
    if (!client.commands) {
        return { total: 0, categories: {} };
    }

    const stats = {
        total: client.commands.size,
        categories: {}
    };

    client.commands.forEach(command => {
        const category = command.category || 'unknown';
        stats.categories[category] = (stats.categories[category] || 0) + 1;
    });

    return stats;
}

module.exports = {
    loadCommands,
    reloadCommands,
    reloadCommand,
    getCommandStats
};