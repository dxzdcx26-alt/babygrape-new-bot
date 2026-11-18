const { EmbedBuilder } = require('discord.js');
const {
  getScores,
  getLeaderboardMessage,
  saveLeaderboardMessage,
} = require('../database');
const config = require('../config');

async function updateScoreboard(client) {
  try {
    const scoreChannelId = config.channels?.score;
    if (!scoreChannelId) {
      console.log('ข้ามกระดานคะแนน: ยังไม่มี SCORE_CHANNEL_ID (รัน /setup ก่อน)');
      return;
    }

    const scores = getScores();
    const channel = await client.channels.fetch(scoreChannelId).catch(() => null);
    if (!channel) {
      console.error('ไม่พบห้อง scoreChannelId!');
      return;
    }

    const sortedWeekly = Object.entries(scores)
      .sort(([, a], [, b]) => (b.weekly_score || 0) - (a.weekly_score || 0))
      .slice(0, 25);

    const weeklyEmbed = new EmbedBuilder()
      .setColor('Aqua')
      .setTitle('📅 กระดานคะแนนประจำสัปดาห์ 📅')
      .setTimestamp()
      .setFooter({ text: 'อัปเดตล่าสุด' });

    if (sortedWeekly.filter((s) => s[1].weekly_score > 0).length === 0) {
      weeklyEmbed.setDescription('ยังไม่มีผู้ทำคะแนนในสัปดาห์นี้...');
    } else {
      const weeklyText = sortedWeekly
        .map(([id, data], index) => {
          const medals = ['🥇', '🥈', '🥉'];
          const rank = index < 3 ? medals[index] : `**${index + 1}.**`;
          return `${rank} <@${id}> - **${data.weekly_score || 0}** คะแนน`;
        })
        .join('\n');
      weeklyEmbed.setDescription(weeklyText);
    }

    const sortedMonthly = Object.entries(scores)
      .sort(([, a], [, b]) => (b.monthly_score || 0) - (a.monthly_score || 0))
      .slice(0, 20);

    const monthlyEmbed = new EmbedBuilder()
      .setColor('Gold')
      .setTitle('🗓️ กระดานคะแนนสะสมรายเดือน 🗓️')
      .setTimestamp()
      .setFooter({ text: 'อัปเดตล่าสุด' });

    if (sortedMonthly.filter((s) => s[1].monthly_score > 0).length === 0) {
      monthlyEmbed.setDescription('ยังไม่มีคะแนนสะสม...');
    } else {
      const monthlyText = sortedMonthly
        .map(([id, data], index) => {
          const medals = ['🥇', '🥈', '🥉'];
          const rank = index < 3 ? medals[index] : `**${index + 1}.**`;
          return `${rank} <@${id}> - **${data.monthly_score || 0}** คะแนน`;
        })
        .join('\n');
      monthlyEmbed.setDescription(monthlyText);
    }

    await upsertLeaderboard(client, channel, 'weekly', weeklyEmbed);
    await upsertLeaderboard(client, channel, 'monthly', monthlyEmbed);

    console.log('อัปเดตกระดานคะแนนทั้ง 2 บอร์ดเรียบร้อย');
  } catch (error) {
    console.error('เกิดข้อผิดพลาดขณะอัปเดตกระดานคะแนน:', error);
  }
}

async function upsertLeaderboard(client, channel, type, embed) {
  const stored = getLeaderboardMessage(type);
  let message = null;

  if (stored) {
    try {
      message = await channel.messages.fetch(stored.message_id);
    } catch {
      message = null;
    }
  }

  if (!message) {
    try {
      const pinned = await channel.messages.fetchPinned();
      const keyword = type === 'weekly' ? 'ประจำสัปดาห์' : 'สะสมรายเดือน';
      message = pinned.find(
        (msg) =>
          msg.author.id === client.user.id &&
          msg.embeds[0]?.title?.includes(keyword),
      );
    } catch {
      /* ignore */
    }
  }

  if (message) {
    await message.edit({ embeds: [embed] });
    saveLeaderboardMessage(type, channel.id, message.id);
  } else {
    const newMsg = await channel.send({ embeds: [embed] });
    try {
      await newMsg.pin();
    } catch (e) {
      console.warn('ไม่สามารถ pin ข้อความ leaderboard ได้:', e.message);
    }
    saveLeaderboardMessage(type, channel.id, newMsg.id);
  }
}

module.exports = { updateScoreboard };
