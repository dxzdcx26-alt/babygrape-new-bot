const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { db } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('ข้อมูลระบบเบบี้เกรป'),

  async execute(interaction) {
    const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const reportCount = db.prepare('SELECT COUNT(*) as c FROM heist_reports').get().c;
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);

    const embed = new EmbedBuilder()
      .setColor('DarkGreen')
      .setTitle('🍇 BabyGrape New Bot')
      .setDescription('ระบบบันทึกผลงานและคะแนนแก๊ง')
      .addFields(
        { name: 'Application ID', value: config.clientId, inline: true },
        { name: 'Bot User', value: interaction.client.user.tag, inline: true },
        { name: 'Uptime', value: `${hours}h ${mins}m`, inline: true },
        { name: 'สมาชิกในระบบ', value: `${userCount}`, inline: true },
        { name: 'รายงาน Heist', value: `${reportCount}`, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
        { name: 'Discord.js', value: require('discord.js').version, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'v2.0.0 Modular + SQLite' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
