#!/usr/bin/env node
/**
 * Deploy slash commands to the guild
 * Uses CLIENT_ID = 1572394577724317788
 */
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID || '1572394577724317788';
const guildId = process.env.GUILD_ID;

if (!token || !guildId) {
  console.error('Missing DISCORD_TOKEN or GUILD_ID in .env');
  process.exit(1);
}

if (clientId !== '1572394577724317788') {
  console.warn(`⚠️  CLIENT_ID is ${clientId}, expected 1572394577724317788`);
}

const commands = [];
const commandsPath = path.join(__dirname, '../src/commands');
const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of files) {
  const cmd = require(path.join(commandsPath, file));
  if (cmd.data) {
    commands.push(cmd.data.toJSON());
    console.log(`  + /${cmd.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`\nกำลังลงทะเบียน ${commands.length} Slash Commands...`);
    console.log(`  Application ID: ${clientId}`);
    console.log(`  Guild ID: ${guildId}`);

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });

    console.log('✅ ลงทะเบียน Slash Commands สำเร็จ!');
  } catch (error) {
    console.error('❌ Deploy failed:', error);
    process.exit(1);
  }
})();
