const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags 
} = require('discord.js');

const { colorAccent } = require('../../../config/config.json').botSettings;

const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Provides a list of available commands with an interactive menu.'),
    
    async execute(interaction) {
        try {
            
            const categories = this.getCommandCategories(interaction.client.commands);
            
            
            const mainEmbed = new EmbedBuilder()
                .setTitle('🤖 Bot Help Center')
                .setDescription('Welcome! Select a category below to view available commands.')
                .setColor(colorAccent)
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .addFields(
                    {
                        name: '📊 Statistics',
                        value: `Total Commands: **${interaction.client.commands.size}**\nCategories: **${Object.keys(categories).length}**`,
                        inline: true
                    },
                    {
                        name: '🔧 Quick Actions',
                        value: 'Use the dropdown menu or buttons below to navigate!',
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();

            
            const categoryOptions = Object.entries(categories).map(([categoryName, commands]) => ({
                label: this.formatCategoryName(categoryName),
                description: `${commands.length} commands available`,
                value: categoryName,
                emoji: this.getCategoryEmoji(categoryName)
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('help_category_select')
                .setPlaceholder('📋 Select a command category...')
                .addOptions(categoryOptions);

            
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_all_commands')
                        .setLabel('All Commands')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📜'),
                    new ButtonBuilder()
                        .setCustomId('help_refresh')
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setURL('https://discord.js.org/')
                        .setLabel('Discord.js Docs')
                        .setStyle(ButtonStyle.Link)
                        .setEmoji('📖')
                );

            const selectRow = new ActionRowBuilder().addComponents(selectMenu);

            
            const response = await interaction.reply({
                embeds: [mainEmbed],
                components: [selectRow, buttons],
                flags: MessageFlags.Ephemeral
            });

            
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 300000 
            });

            const buttonCollector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000
            });

            
            collector.on('collect', async (selectInteraction) => {
                if (selectInteraction.user.id !== interaction.user.id) {
                    return selectInteraction.reply({
                        content: '❌ This help menu is not for you!',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const selectedCategory = selectInteraction.values[0];
                const categoryCommands = categories[selectedCategory];
                
                const categoryEmbed = this.createCategoryEmbed(
                    selectedCategory, 
                    categoryCommands, 
                    interaction.user
                );

                
                const backButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('help_back_main')
                            .setLabel('← Back to Main')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🏠'),
                        new ButtonBuilder()
                            .setCustomId('help_refresh')
                            .setLabel('Refresh')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🔄')
                    );

                await selectInteraction.update({
                    embeds: [categoryEmbed],
                    components: [selectRow, backButton]
                });
            });

            
            buttonCollector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    return buttonInteraction.reply({
                        content: '❌ This help menu is not for you!',
                        flags: MessageFlags.Ephemeral
                    });
                }

                switch (buttonInteraction.customId) {
                    case 'help_back_main':
                        await buttonInteraction.update({
                            embeds: [mainEmbed],
                            components: [selectRow, buttons]
                        });
                        break;

                    case 'help_all_commands':
                        const allCommandsEmbed = this.createAllCommandsEmbed(categories, interaction.user);
                        const backButtonRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('help_back_main')
                                    .setLabel('← Back to Main')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('🏠')
                            );

                        await buttonInteraction.update({
                            embeds: [allCommandsEmbed],
                            components: [selectRow, backButtonRow]
                        });
                        break;

                    case 'help_refresh':
                        
                        const refreshedCategories = this.getCommandCategories(interaction.client.commands);
                        const refreshedOptions = Object.entries(refreshedCategories).map(([categoryName, commands]) => ({
                            label: this.formatCategoryName(categoryName),
                            description: `${commands.length} commands available`,
                            value: categoryName,
                            emoji: this.getCategoryEmoji(categoryName)
                        }));

                        const refreshedSelectMenu = new StringSelectMenuBuilder()
                            .setCustomId('help_category_select')
                            .setPlaceholder('📋 Select a command category...')
                            .addOptions(refreshedOptions);

                        const refreshedSelectRow = new ActionRowBuilder().addComponents(refreshedSelectMenu);

                        const refreshedMainEmbed = new EmbedBuilder()
                            .setTitle('🤖 Bot Help Center')
                            .setDescription('Welcome! Select a category below to view available commands.')
                            .setColor('#5865F2')
                            .setThumbnail(interaction.client.user.displayAvatarURL())
                            .addFields(
                                {
                                    name: '📊 Statistics',
                                    value: `Total Commands: **${interaction.client.commands.size}**\nCategories: **${Object.keys(refreshedCategories).length}**`,
                                    inline: true
                                },
                                {
                                    name: '🔧 Quick Actions',
                                    value: 'Use the dropdown menu or buttons below to navigate!',
                                    inline: true
                                }
                            )
                            .setFooter({ 
                                text: `Requested by ${interaction.user.tag} • Refreshed`, 
                                iconURL: interaction.user.displayAvatarURL() 
                            })
                            .setTimestamp();

                        await buttonInteraction.update({
                            embeds: [refreshedMainEmbed],
                            components: [refreshedSelectRow, buttons]
                        });
                        break;
                }
            });

            
            collector.on('end', async () => {
                try {
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            selectMenu.setDisabled(true)
                        );
                    
                    const disabledButtons = new ActionRowBuilder()
                        .addComponents(
                            buttons.components.map(button => 
                                button.data.style === ButtonStyle.Link ? button : button.setDisabled(true)
                            )
                        );

                    await response.edit({
                        components: [disabledRow, disabledButtons]
                    });
                } catch (error) {
                    console.error('Error disabling components:', error);
                }
            });

        } catch (error) {
            console.error('Help command error:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while loading the help menu.')
                .setColor('#FF5555');

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed], components: [] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }
    },

    
    getCommandCategories(commands) {
        const categories = {};
        
        commands.forEach((command, commandName) => {
            
            let category = 'general';
            
            
            if (command.category) {
                category = command.category;
            } else if (command.filePath) {
                
                const pathParts = command.filePath.split(path.sep);
                const commandsIndex = pathParts.findIndex(part => part === 'commands');
                if (commandsIndex !== -1 && pathParts[commandsIndex + 1]) {
                    category = pathParts[commandsIndex + 1];
                }
            }
            
            if (!categories[category]) {
                categories[category] = [];
            }
            
            categories[category].push(command);
        });

        return categories;
    },

    
    createCategoryEmbed(categoryName, commands, user) {
        const embed = new EmbedBuilder()
            .setTitle(`${this.getCategoryEmoji(categoryName)} ${this.formatCategoryName(categoryName)} Commands`)
            .setDescription(`Here are all the commands in the **${this.formatCategoryName(categoryName)}** category:`)
            .setColor('#00FF88')
            .setFooter({ 
                text: `${commands.length} commands • Requested by ${user.tag}`, 
                iconURL: user.displayAvatarURL() 
            })
            .setTimestamp();

        
        const commandChunks = this.chunkArray(commands, 10);
        
        commandChunks.forEach((chunk, index) => {
            const commandList = chunk.map(command => 
                `\`/${command.data.name}\` - ${command.data.description || 'No description available'}`
            ).join('\n');

            embed.addFields({
                name: index === 0 ? '📋 Commands' : '📋 Commands (continued)',
                value: commandList,
                inline: false
            });
        });

        return embed;
    },

    
    createAllCommandsEmbed(categories, user) {
        const embed = new EmbedBuilder()
            .setTitle('📜 All Commands')
            .setDescription('Here\'s a complete list of all available commands organized by category:')
            .setColor('#FFD700')
            .setFooter({ 
                text: `Requested by ${user.tag}`, 
                iconURL: user.displayAvatarURL() 
            })
            .setTimestamp();

        Object.entries(categories).forEach(([categoryName, commands]) => {
            const commandList = commands.slice(0, 10).map(command => 
                `\`/${command.data.name}\``
            ).join(', ');

            const moreText = commands.length > 10 ? ` +${commands.length - 10} more` : '';

            embed.addFields({
                name: `${this.getCategoryEmoji(categoryName)} ${this.formatCategoryName(categoryName)} (${commands.length})`,
                value: commandList + moreText,
                inline: false
            });
        });

        return embed;
    },

    
    formatCategoryName(categoryName) {
        return categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
    },

    getCategoryEmoji(categoryName) {
        const emojiMap = {
            'utility': '🔧',
            'moderation': '🛡️',
            'fun': '🎮',
            'music': '🎵',
            'info': 'ℹ️',
            'admin': '👑',
            'developer': '💻',
            'economy': '💰',
            'general': '📝',
            'games': '🎲',
            'social': '👥'
        };
        return emojiMap[categoryName.toLowerCase()] || '📁';
    },

    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
};