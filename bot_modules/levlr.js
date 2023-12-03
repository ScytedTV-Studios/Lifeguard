module.exports = (client) => {
  const { Client, GatewayIntentBits, Collection } = require('discord.js');
  const fs = require('fs').promises;
  const { REST } = require('@discordjs/rest');
  const { Routes } = require('discord-api-types/v9');
  const dotenv = require('dotenv');
  
  dotenv.config();
  
  const TOKEN = process.env.BOT_TOKEN;
  const PREFIX = '!'; // Change this to your desired prefix
  
  client.commands = new Collection();
  
  const commands = [
    'stats', // Add other command names here
  ];
  
  for (const command of commands) {
    const commandModule = require(`./commands/${command}.js`);
    client.commands.set(command, commandModule);
  }
  
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  
  // Cooldown for XP (in milliseconds)
  const xpCooldown = 10000; // 10 seconds
  
  // Map to store the last XP gain time for each user
  const xpCooldowns = new Map();
  
  (async () => {
    try {
      console.log('Started refreshing global (/) commands.');
  
      const commandData = commands.map((command) => {
        const commandModule = client.commands.get(command);
        return {
          name: command,
          description: commandModule.data.description,
          options: commandModule.data.options,
        };
      });
  
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commandData },
      );
  
      console.log('Successfully reloaded global (/) commands.');
    } catch (error) {
      console.error(error);
    }
  })();
  
  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
  });
  
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
  
    const { commandName, options } = interaction;
  
    if (client.commands.has(commandName)) {
      try {
        const command = client.commands.get(commandName);
        await command.execute(interaction, options);
      } catch (error) {
        console.error('Error executing command:', error);
        await interaction.reply('An error occurred while executing the command.');
      }
    }
  });
  
  client.on('messageCreate', async (message) => {
    const userId = message.author.id;
  
    if (xpCooldowns.has(userId)) {
      const lastXPTime = xpCooldowns.get(userId);
      const currentTime = Date.now();
  
      if (currentTime - lastXPTime < xpCooldown) return;
    }
  
    const userData = { userId: userId, username: message.author.username, xp: 10 };
  
    xpCooldowns.set(userId, Date.now());
  
    saveUserDataToJSON(userData);
  });
  
  async function getUserDataFromJSON(userId) {
    try {
      const data = await fs.readFile('../API/levlr/userdata.json', 'utf8');
      const users = JSON.parse(data);
      const user = users.find((user) => user.userId === userId);
      return user;
    } catch (error) {
      console.error('Error reading JSON file:', error);
      throw error;
    }
  }
  
  async function saveUserDataToJSON(userData) {
    try {
      const data = await fs.readFile('../API/levlr/userdata.json', 'utf8');
      const users = JSON.parse(data);
      const userIndex = users.findIndex((user) => user.userId === userData.userId);
  
      if (userIndex !== -1) {
        users[userIndex].xp = parseInt(users[userIndex].xp) + userData.xp;
        let xpRequiredForNextLevel = calculateXpRequiredForNextLevel(users[userIndex].level);
        while (users[userIndex].xp >= xpRequiredForNextLevel) {
          users[userIndex].level++;
          users[userIndex].xp -= xpRequiredForNextLevel;
          xpRequiredForNextLevel = calculateXpRequiredForNextLevel(users[userIndex].level);
        }
      } else {
        userData.level = 1;
        users.push(userData);
      }
  
      await fs.writeFile('../API/levlr/userdata.json', JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
      console.error('Error writing to JSON file:', error);
    }
  }
  
  function calculateXpRequiredForNextLevel(level) {
    return Math.floor(100 * Math.pow(1.2, level));
  }
  
    console.log('Levlr is ready!');
  };