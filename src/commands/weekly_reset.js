const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { weeklyReset, getScores } = require('../database');
const { updateScoreboard } = require('../services/scoreboard');
const { isAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_reset')
    .setDescription('ตัดรอบคะแนนประจำสัปดาห์ (แอดมินเท่านั้น)'),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: '❌ คำสั่งนี้สำหรับแอดมินเท่านั้นนะคับ',
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: 'กำลังประมวลผลการตัดรอบประจำสัปดาห์...',
      ephemeral: true,
    });

    const scores = getScores();
    const sortedWeekly = Object.entries(scores).sort(
      ([, a], [, b]) => (b.weekly_score || 0) - (a.weekly_score || 0),
    );

    const embed = new EmbedBuilder()
      .setColor('Aqua')
      .setTitle('🎉 สรุปผลและตัดรอบคะแนนประจำสัปดาห์ 🎉')
      .setDescription(
        'คะแนนรายสัปดาห์ทั้งหมดจะถูกนำไปรวมกับคะแนนสะสมรายเดือน และคะแนนรายสัปดาห์จะถูกรีเซ็ตเป็น 0',
      )
      .setTimestamp();

    if (sortedWeekly.length > 0 && sortedWeekly[0][1].weekly_score > 0) {
      const topPlayers = sortedWeekly
        .slice(0, 5)
        .map(([id, data], index) => {
          return `**อันดับที่ ${index + 1}:** <@${id}> - **${(data.weekly_score || 0).toFixed(1)}** คะแนน`;
        })
        .join('\n');
      embed.addFields({
        name: '🏆 5 อันดับสูงสุดประจำสัปดาห์ 🏆',
        value: topPlayers,
      });
    } else {
      embed.addFields({
        name: '🏆 5 อันดับสูงสุดประจำสัปดาห์ 🏆',
        value: 'ไม่มีผู้ทำคะแนนในสัปดาห์นี้',
      });
    }

    await interaction.channel.send({ embeds: [embed] });
    weeklyReset();
    await interaction.editReply({ content: 'ตัดรอบประจำสัปดาห์เรียบร้อยแล้ว! ✅' });
    await updateScoreboard(interaction.client);
  },
};
