const { SlashCommandBuilder } = require('discord.js');
const {
  addWeeklyScore,
  removeWeeklyScore,
  setWeeklyScore,
  ensureUser,
} = require('../database');
const { updateScoreboard } = require('../services/scoreboard');
const { isAdmin } = require('../utils/permissions');
const { sendScoreToSheet } = require('../services/googleSheets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('score')
    .setDescription('จัดการคะแนนของสมาชิก (แอดมินเท่านั้น)')
    .addStringOption((option) =>
      option
        .setName('action')
        .setDescription('เลือกการกระทำ')
        .setRequired(true)
        .addChoices(
          { name: 'เพิ่ม (Add)', value: 'add' },
          { name: 'ลบ (Remove)', value: 'remove' },
          { name: 'ตั้งค่า (Set)', value: 'set' },
        ),
    )
    .addUserOption((option) =>
      option.setName('user').setDescription('เลือกผู้ใช้').setRequired(true),
    )
    .addNumberOption((option) =>
      option
        .setName('amount')
        .setDescription('จำนวนคะแนน')
        .setRequired(true),
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: '❌ คำสั่งนี้สำหรับแอดมินเท่านั้นนะคับ',
        ephemeral: true,
      });
    }

    const action = interaction.options.getString('action');
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getNumber('amount');

    ensureUser(user.id, user.tag);

    let responseText = '';
    if (action === 'add') {
      addWeeklyScore(user.id, amount, interaction.user.id, 'Admin /score add');
      responseText = `เพิ่มคะแนนรายสัปดาห์ของ ${user.tag} จำนวน ${amount} คะแนนเรียบร้อย`;
    } else if (action === 'remove') {
      removeWeeklyScore(user.id, amount, interaction.user.id, 'Admin /score remove');
      responseText = `ลบคะแนนรายสัปดาห์ของ ${user.tag} จำนวน ${amount} คะแนนเรียบร้อย`;
    } else if (action === 'set') {
      setWeeklyScore(user.id, amount, interaction.user.id, 'Admin /score set');
      responseText = `ตั้งค่าคะแนนรายสัปดาห์ของ ${user.tag} เป็น ${amount} คะแนนเรียบร้อย`;
    }

    await updateScoreboard(interaction.client);
    await sendScoreToSheet({
      action,
      userId: user.id,
      userTag: user.tag,
      amount,
      adminId: interaction.user.id,
      adminTag: interaction.user.tag,
    });

    await interaction.reply({ content: responseText, ephemeral: true });
  },
};
