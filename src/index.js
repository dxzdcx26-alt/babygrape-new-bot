const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
} = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages];
if (process.env.ENABLE_MESSAGE_CONTENT === '1') {
  intents.push(GatewayIntentBits.MessageContent);
}
if (process.env.ENABLE_GUILD_MEMBERS === '1') {
  intents.push(GatewayIntentBits.GuildMembers);
}

const client = new Client({
  intents,
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command.data?.name) {
    client.commands.set(command.data.name, command);
    console.log(`  ✓ Command loaded: /${command.data.name}`);
  }
}

const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
  console.log(`  ✓ Event loaded: ${event.name}`);
}

const app = express();
app.get('/', (req, res) => res.send('Baby Grape is awake!'));
app.get('/health', (req, res) => {
  res.json({ status: 'ok', bot: client.user?.tag || 'not ready', uptime: process.uptime() });
});

const port = Number(process.env.PORT) || config.port || 3000;
app.listen(port, () => {
  console.log(`เว็บเซิร์ฟเวอร์ Uptime เริ่มที่ port ${port}`);
});

client.login(config.token).catch((err) => {
  console.error('❌ Login failed:', err.message);
  if (String(err.message).includes('disallowed intents')) {
    console.error(
      '→ ปิด ENABLE_MESSAGE_CONTENT / ENABLE_GUILD_MEMBERS หรือเปิด Intents ใน Developer Portal',
    );
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection:', err?.message || err);
});
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err?.message || err);
});
