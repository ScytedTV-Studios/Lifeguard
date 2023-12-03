const { Client, Intents } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

// Read all bot module files in the bot_modules folder
const botModuleFiles = fs.readdirSync(path.join(__dirname, 'bot_modules')).filter(file => file.endsWith('.js'));

// Load each bot module
for (const file of botModuleFiles) {
  const botModule = require(`./bot_modules/${file}`);
  botModule(client);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.BOT_TOKEN);