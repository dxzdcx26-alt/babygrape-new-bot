#!/usr/bin/env node
const {
  Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
} = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const token = process.env.DISCORD_TOKEN;
const controlChannelId = process.env.CONTROL_CHANNEL_ID;

if (!token || !controlChannelId) {
  console.error('ไม่พบ DISCORD_TOKEN หรือ CONTROL_CHANNEL_ID ใน .env');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log('บอทพร้อมแล้ว! กำลังจะส่งแผงควบคุม...');
  const channel = await client.channels.fetch(controlChannelId);
  if (!channel) {
    console.error(`ไม่พบห้อง CONTROL_CHANNEL_ID: ${controlChannelId}`);
    return client.destroy();
  }
  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    if (messages.size > 0) await channel.bulkDelete(messages, true);
    console.log(`ลบข้อความเก่า ${messages.size} ข้อความในห้องควบคุมเรียบร้อย`);
  } catch (error) {
    console.warn('ไม่สามารถลบข้อความเก่าได้:', error.message);
  }
  const embed = new EmbedBuilder()
    .setColor('DarkGreen')
    .setTitle('💰 Heist Report Panel 💰')
    .setDescription('กดปุ่มด้านล่างเพื่อเริ่มบันทึกผลงานการทำกิจกรรมต่างๆ ของแก๊ง')
    .setThumbnail('https://img2.pic.in.th/pic/LOGO_12ebdf768694f5bef.png');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('start_heist_report')
      .setLabel('📝 เริ่มบันทึกผลงาน')
      .setStyle(ButtonStyle.Success)
      .setEmoji('💰'),
  );
  await channel.send({ embeds: [embed], components: [row] });
  console.log('ส่งแผงควบคุมเรียบร้อยแล้ว!');
  client.destroy();
});

client.login(token);
