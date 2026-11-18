/**
 * BabyGrape New Bot v2.0
 * Modular rebuild of https://github.com/marshmayris/baby-grape-bot
 * Application ID: 1572394577724317788
 */

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { runMigrations } = require('./database');

runMigrations();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`  ✓ Command loaded: /${command.data.name}`);
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`  ✓ Event loaded: ${event.name}`);
}

const app = express();
app.get('/', (req, res) => {
  res.send('Baby Grape is awake!');
});
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: client.user?.tag || 'not ready',
    uptime: process.uptime(),
  });
});

app.listen(config.port, () => {
  console.log(`เว็บเซิร์ฟเวอร์สำหรับ UptimeRobot เริ่มทำงานที่ port ${config.port}`);
});

client.login(config.token).catch((err) => {
  console.error('❌ Login failed:', err.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  client.destroy();
  process.exit(0);
});
