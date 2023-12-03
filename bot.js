const { Client, Intents, MessageEmbed } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');

// Function to read the CSV file and return the data as an array of objects
const readCsvFile = () => {
  try {
    const data = fs.readFileSync('voice_channels.csv', 'utf-8');
    const rows = data.trim().split('\n');
    const headers = rows[0].split(',');
    const result = [];

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(',');
      const obj = {};

      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = values[j];
      }

      result.push(obj);
    }

    return result;
  } catch (error) {
    console.error('Error reading CSV file:', error.message);
    return [];
  }
};

// Function to get audio file path based on the genre
const getAudioFileByGenre = (genre) => {
  switch (genre.toLowerCase()) {
    case 'lofi':
      return '../MUSIC/lofi-music.mp3';
    case 'christmas':
      return '../MUSIC/christmas-music.m4a'; // Change this to the actual path or URL for Christmas music
    case 'jazz':
      return '../MUSIC/jazz-music.m4a'; // Change this to the actual path or URL for Jazz music
    case 'minecraft rain':
      return '../MUSIC/minecraft-rain.opus';
    default:
      return '../MUSIC/lofi-music.mp3'; // Default to 'lofi' if genre is not recognized
  }
};

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

const restartDelay = 39600000; // Delay in milliseconds before restarting the audio
const csvFilePath = 'voice_channels.csv';

// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const BOT_TOKEN = 'MTE0NzMwODgzNTgwODIzNTU4MQ.G6DowF.GNgc1v7nP9okTYR12AfqvK_Ta5kAOXo5ypm0mo';

let voiceChannels = readCsvFile();

// Function to write the array of objects to the CSV file
const writeCsvFile = (data) => {
  try {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((obj) => Object.values(obj).join(',')).join('\n');
    fs.writeFileSync(csvFilePath, `${headers}\n${rows}`);
  } catch (error) {
    console.error('Error writing to CSV file:', error.message);
  }
};

// Slash commands
const commands = [
  {
    name: 'roll',
    description: 'Roll a dice with various options.',
    type: 1, // This is a sub-command
    options: [
      {
        name: 'basic',
        description: 'Roll a dice without modifiers.',
        type: 1, // This is a sub-command of the main 'roll' command
        options: [
          {
            name: 'sides',
            description: 'Number of sides on the dice.',
            type: 4,
            required: true,
          },
        ],
      },
      {
        name: 'with-modifiers',
        description: 'Roll a dice with modifiers.',
        type: 1, // This is another sub-command
        options: [
          {
            name: 'sides',
            description: 'Number of sides on the dice.',
            type: 4,
            required: true,
          },
          {
            name: 'amount',
            description: 'Number of dice to roll (default: 1)',
            type: 4,
            required: false,
          },
          {
            name: 'modifier',
            description: 'Modifier to apply to the total roll (e.g., +5 or -2)',
            type: 4,
            required: false,
          },
        ],
      },
    ],
  },
  {
    name: 'setvoicechannel',
    description: 'Set the voice channel for the bot in the server (requires Manage Server permission).',
    type: 1,
    options: [
      {
        name: 'voicechannel',
        type: 7, // Change type to CHANNEL
        description: 'Voice channel to play music in.',
        required: true,
      },
      {
        name: 'genre',
        type: 3, // Change type to STRING
        description: 'Use /genre for a list of genres.',
        required: false,
      },
    ],
  },
  {
    name: 'genres',
    description: 'Show a list of available music genres.',
    type: 1,
  },
  {
    name: 'setgenre',
    description: 'Change the genre and play it in the selected voice channel.',
    type: 1,
    options: [
      {
        name: 'genre',
        type: 3, // Change type to STRING
        description: 'Use /genre for a list of genres.',
        required: true,
      },
    ],
  },
];

// Create a new REST client
const rest = new REST({ version: '9' }).setToken(BOT_TOKEN);

// Function to register slash commands
const registerCommands = async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    // Access the application ID from the client user
    const applicationId = '1147308835808235581';

    await rest.put(
      Routes.applicationCommands(applicationId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(`Failed to register commands: ${error.message}`);
  }
};

// Register slash commands inside the ready event
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands(); // Register slash commands

  voiceChannels.forEach((channel) => {
    const guild = client.guilds.cache.get(channel.guildId);
    const voiceChannel = guild?.channels.cache.get(channel.channelId);

    if (voiceChannel?.type === 'GUILD_VOICE') {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      const audioPlayer = createAudioPlayer();
      connection.subscribe(audioPlayer);

      const resource = createAudioResource(getAudioFileByGenre(channel.genre), {
        inputType: StreamType.Arbitrary,
      });

      audioPlayer.play(resource);

      audioPlayer.on(VoiceConnectionStatus.Disconnected, () => {
        setTimeout(() => {
          if (audioPlayer.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
            client.destroy();
          }
        }, restartDelay);
      });

      // Use a timer to restart the audio after a certain delay
      setInterval(() => {
        const newResource = createAudioResource(getAudioFileByGenre(channel.genre), {
          inputType: StreamType.Arbitrary,
        });

        audioPlayer.play(newResource);
      }, restartDelay);
    }
  });
});

// Event listener for when a slash command is used
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === 'roll') {
    const basicCommand = options.getSubcommand() === 'basic';
    const sides = basicCommand ? options.get('sides').value : options.get('with-modifiers').options.get('sides').value;
    const amount = basicCommand ? 1 : options.get('with-modifiers').options.get('amount')?.value || 1;
    const modifier = basicCommand ? 0 : options.get('with-modifiers').options.get('modifier')?.value || 0;

    let rolls = [];

    for (let i = 0; i < amount; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const total = rolls.reduce((acc, val) => acc + val, 0) + modifier;

    const rollEmbed = new MessageEmbed()
      .setTitle('Dice Roll')
      .addField('Sides', sides, true)
      .addField('Amount', amount, true)
      .addField('Modifier', modifier, true)
      .addField('Rolls', rolls.join(', '), true)
      .addField('Total', total, true)
      .setColor('#3498db');

    interaction.reply({ embeds: [rollEmbed] });
  } else if (commandName === 'setvoicechannel') {
    // Check if the user has the 'MANAGE_GUILD' permission
    if (!interaction.member.permissions.has('MANAGE_GUILD')) {
      return interaction.reply({
        content: 'You do not have the required permission to use this command.',
        ephemeral: true,
      });
    }

    const voiceChannel = options.get('voicechannel').channel;
    const genre = options.get('genre')?.value || 'lofi';

    const existingChannel = voiceChannels.find((channel) => channel.guildId === interaction.guild.id);

    if (existingChannel) {
      existingChannel.channelId = voiceChannel.id;
      existingChannel.genre = genre;
    } else {
      voiceChannels.push({
        guildId: interaction.guild.id,
        channelId: voiceChannel.id,
        genre: genre,
      });
    }

    writeCsvFile(voiceChannels);

    interaction.reply({
      content: `Voice channel set to <#${voiceChannel.id}>. Genre set to \`${genre}\`.`,
    });
  } else if (commandName === 'genres') {
    const genresEmbed = new MessageEmbed()
      .setTitle('Available Music Genres')
      .setDescription('Choose a genre using the `/setgenre` command.')
      .addField('lofi', 'Lofi Music', true)
      .addField('christmas', 'Christmas Music', true)
      .addField('jazz', 'Jazz Music', true)
      .addField('minecraft rain', 'Minecraft Rain', true)
      .setColor('#2ecc71');

    interaction.reply({ embeds: [genresEmbed] });
  } else if (commandName === 'setgenre') {
    const genre = options.get('genre').value;

    const existingChannel = voiceChannels.find((channel) => channel.guildId === interaction.guild.id);

    if (existingChannel) {
      existingChannel.genre = genre;
    } else {
      voiceChannels.push({
        guildId: interaction.guild.id,
        channelId: null,
        genre: genre,
      });
    }

    writeCsvFile(voiceChannels);

    interaction.reply({
      content: `Default genre set to \`${genre}\`. Use the `/setvoicechannel` command to set the voice channel.`,
    });
  }
});

client.login(BOT_TOKEN);