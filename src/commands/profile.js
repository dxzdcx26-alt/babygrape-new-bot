const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserScore, ensureUser, getUserLeaves } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('ดูโปรไฟล์และคะแนน')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('ดูโปรไฟล์ของคนอื่น (optional)'),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    ensureUser(target.id, target.tag, interaction.guild?.members?.cache?.get(target.id)?.displayName);

    const score = getUserScore(target.id);
    const leaves = getUserLeaves(target.id);
    const pendingLeaves = leaves.filter((l) => l.status === 'pending').length;
    const approvedLeaves = leaves.filter((l) => l.status === 'approved').length;

    const embed = new EmbedBuilder()
      .setColor('Purple')
      .setTitle(`🍇 โปรไฟล์ของ ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: '📅 คะแนนรายสัปดาห์', value: `**${score?.weekly_score ?? 0}**`, inline: true },
        { name: '🗓️ คะแนนสะสมรายเดือน', value: `**${score?.monthly_score ?? 0}**`, inline: true },
        { name: '🏆 คะแนนรวมทั้งหมด', value: `**${score?.total_score ?? 0}**`, inline: true },
        { name: '📋 การลา', value: `รออนุมัติ: ${pendingLeaves} | อนุมัติแล้ว: ${approvedLeaves}` },
      )
      .setTimestamp()
      .setFooter({ text: 'Baby Grape' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
