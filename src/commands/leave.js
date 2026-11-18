const {
  SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
} = require('discord.js');
const {
  createLeave, reviewLeave, getPendingLeaves, getUserLeaves, ensureUser,
} = require('../database');
const { isAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('ระบบแจ้งลา')
    .addSubcommand((sub) => sub.setName('request').setDescription('ยื่นคำขอลา'))
    .addSubcommand((sub) => sub.setName('history').setDescription('ดูประวัติการลาของตัวเอง'))
    .addSubcommand((sub) => sub.setName('pending').setDescription('ดูคำขอลาที่รออนุมัติ (แอดมิน)'))
    .addSubcommand((sub) =>
      sub.setName('approve').setDescription('อนุมัติคำขอลา (แอดมิน)')
        .addIntegerOption((o) => o.setName('id').setDescription('Leave ID').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('reject').setDescription('ปฏิเสธคำขอลา (แอดมิน)')
        .addIntegerOption((o) => o.setName('id').setDescription('Leave ID').setRequired(true))
        .addStringOption((o) => o.setName('reason').setDescription('เหตุผล'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'request') {
      const modal = new ModalBuilder().setCustomId('leave_request_modal').setTitle('แบบฟอร์มแจ้งลา');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('start_date').setLabel('วันเริ่มต้น (YYYY-MM-DD)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('2026-11-20')),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('end_date').setLabel('วันสิ้นสุด (YYYY-MM-DD)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('2026-11-22')),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('เหตุผลการลา').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)),
      );
      return interaction.showModal(modal);
    }

    if (sub === 'history') {
      const leaves = getUserLeaves(interaction.user.id);
      if (leaves.length === 0) return interaction.reply({ content: 'คุณยังไม่มีประวัติการลา', ephemeral: true });
      const text = leaves.slice(0, 10).map((l) => `\`#${l.id}\` ${l.start_date} → ${l.end_date} | **${l.status}** | ${l.reason.slice(0, 40)}`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('Blue').setTitle('📋 ประวัติการลา').setDescription(text).setTimestamp()], ephemeral: true });
    }

    if (sub === 'pending') {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ แอดมินเท่านั้น', ephemeral: true });
      const pending = getPendingLeaves();
      if (pending.length === 0) return interaction.reply({ content: 'ไม่มีคำขอลาที่รออนุมัติ', ephemeral: true });
      const text = pending.map((l) => `\`#${l.id}\` <@${l.user_id}> | ${l.start_date} → ${l.end_date}\n└ ${l.reason.slice(0, 60)}`).join('\n\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('Orange').setTitle('⏳ คำขอลาที่รออนุมัติ').setDescription(text)], ephemeral: true });
    }

    if (sub === 'approve' || sub === 'reject') {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ แอดมินเท่านั้น', ephemeral: true });
      const id = interaction.options.getInteger('id');
      const status = sub === 'approve' ? 'approved' : 'rejected';
      const note = sub === 'reject' ? interaction.options.getString('reason') || 'ไม่มีเหตุผล' : null;
      reviewLeave(id, status, interaction.user.id, note);
      return interaction.reply({ content: `✅ ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} คำขอลา #${id} เรียบร้อย`, ephemeral: true });
    }
  },
};

async function handleLeaveModal(interaction) {
  if (interaction.customId !== 'leave_request_modal') return false;
  await interaction.deferReply({ ephemeral: true });
  const startDate = interaction.fields.getTextInputValue('start_date');
  const endDate = interaction.fields.getTextInputValue('end_date');
  const reason = interaction.fields.getTextInputValue('reason');
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(startDate) || !dateRe.test(endDate)) {
    return interaction.editReply({ content: '❌ รูปแบบวันที่ไม่ถูกต้อง ใช้ YYYY-MM-DD' });
  }
  if (new Date(startDate) > new Date(endDate)) {
    return interaction.editReply({ content: '❌ วันเริ่มต้นต้องไม่เกินวันสิ้นสุด' });
  }
  ensureUser(interaction.user.id, interaction.user.tag);
  const id = createLeave(interaction.user.id, startDate, endDate, reason);
  await interaction.editReply({ content: `✅ ส่งคำขอลา #${id} เรียบร้อยแล้ว\n${startDate} → ${endDate}\nเหตุผล: ${reason}` });
  return true;
}

module.exports.handleLeaveModal = handleLeaveModal;
