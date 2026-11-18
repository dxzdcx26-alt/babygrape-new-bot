#!/usr/bin/env node
/**
 * Deploy slash commands
 * - ไม่ใส่ GUILD_ID → ลงทะเบียนแบบ Global (ใช้ได้ทุกเซิร์ฟ, อาจช้า 1 ชม.)
 * - ใส่ GUILD_ID → ลงทะเบียนเฉพาะเซิร์ฟนั้น (ขึ้นทันที, ดีตอนเทส)
 * - FORCE_GLOBAL=1 → บังคับ global แม้มี GUILD_ID
 */
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID || '1572394577724317788';
const guildId = process.env.GUILD_ID;
const forceGlobal = process.env.FORCE_GLOBAL === '1' || process.argv.includes('--global');

if (!token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, '../src/commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const cmd = require(path.join(commandsPath, file));
  if (cmd.data) {
    commands.push(cmd.data.toJSON());
    console.log(`  + /${cmd.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(token);
const useGlobal = forceGlobal || !guildId;

(async () => {
  try {
    console.log(`\nกำลังลงทะเบียน ${commands.length} Slash Commands...`);
    console.log(`  Application ID: ${clientId}`);

    if (useGlobal) {
      console.log('  โหมด: GLOBAL (ทุกเซิร์ฟที่เชิญบอท)');
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('✅ ลงทะเบียน Global Commands สำเร็จ!');
      console.log('   หมายเหตุ: Discord อาจใช้เวลาถึง ~1 ชม. กว่าคำสั่งจะขึ้นครบทุกเซิร์ฟ');
    } else {
      console.log(`  โหมด: GUILD (${guildId})`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log('✅ ลงทะเบียน Guild Commands สำเร็จ! (ขึ้นทันทีในเซิร์ฟนี้)');
    }
  } catch (error) {
    console.error('❌ Deploy failed:', error);
    process.exit(1);
  }
})();
