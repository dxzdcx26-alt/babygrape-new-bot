const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const {
  openCheckinSession, closeCheckinSession, getOpenCheckinSession,
  doCheckin, getCheckinList, ensureUser,
} = require('../database');
const { isAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkin')
    .setDescription('ระบบเช็คชื่อ')
    .addSubcommand((sub) => sub.setName('join').setDescription('เช็คชื่อเข้าร่วมรอบปัจจุบัน'))
    .addSubcommand((sub) =>
      sub.setName('open').setDescription('เปิดรอบเช็คชื่อ (แอดมิน)')
        .addStringOption((o) => o.setName('name').setDescription('ชื่อรอบกิจกรรม').setRequired(true)))
    .addSubcommand((sub) => sub.setName('close').setDescription('ปิดรอบเช็คชื่อ (แอดมิน)'))
    .addSubcommand((sub) => sub.setName('list').setDescription('ดูรายชื่อผู้เช็คชื่อรอบปัจจุบัน')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'open') {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ แอดมินเท่านั้น', ephemeral: true });
      const existing = getOpenCheckinSession();
      if (existing) return interaction.reply({ content: `มีรอบเปิดอยู่แล้ว: **${existing.name}**`, ephemeral: true });
      const name = interaction.options.getString('name');
      ensureUser(interaction.user.id, interaction.user.tag);
      const id = openCheckinSession(name, interaction.user.id);
      const embed = new EmbedBuilder().setColor('Green').setTitle('✅ เปิดรอบเช็คชื่อแล้ว')
        .setDescription(`**${name}**\nกดปุ่มด้านล่างหรือใช้ \`/checkin join\` เพื่อเช็คชื่อ`)
        .setFooter({ text: `Session #${id}` }).setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`checkin_join_${id}`).setLabel('เช็คชื่อ').setStyle(ButtonStyle.Success).setEmoji('✅'),
      );
      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (sub === 'close') {
      if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ แอดมินเท่านั้น', ephemeral: true });
      const session = getOpenCheckinSession();
      if (!session) return interaction.reply({ content: 'ไม่มีรอบเช็คชื่อที่เปิดอยู่', ephemeral: true });
      closeCheckinSession(session.id);
      const list = getCheckinList(session.id);
      const names = list.length > 0 ? list.map((u, i) => `${i + 1}. <@${u.user_id}>`).join('\n') : 'ไม่มีผู้เช็คชื่อ';
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('🔒 ปิดรอบเช็คชื่อแล้ว')
          .setDescription(`**${session.name}**\n\nผู้เข้าร่วม (${list.length} คน):\n${names}`).setTimestamp()],
      });
    }

    if (sub === 'join') {
      const session = getOpenCheckinSession();
      if (!session) return interaction.reply({ content: 'ขณะนี้ไม่มีรอบเช็คชื่อที่เปิดอยู่', ephemeral: true });
      ensureUser(interaction.user.id, interaction.user.tag, interaction.member?.displayName);
      const result = doCheckin(session.id, interaction.user.id);
      if (!result.success) return interaction.reply({ content: 'คุณเช็คชื่อไปแล้วในรอบนี้ ✅', ephemeral: true });
      return interaction.reply({ content: `✅ เช็คชื่อสำเร็จ! รอบ **${session.name}**`, ephemeral: true });
    }

    if (sub === 'list') {
      const session = getOpenCheckinSession();
      if (!session) return interaction.reply({ content: 'ไม่มีรอบเช็คชื่อที่เปิดอยู่', ephemeral: true });
      const list = getCheckinList(session.id);
      const names = list.length > 0
        ? list.map((u, i) => `${i + 1}. <@${u.user_id}>`).join('\n')
        : 'ยังไม่มีผู้เช็คชื่อ';
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('Blue').setTitle(`📋 รายชื่อเช็คชื่อ: ${session.name}`)
          .setDescription(names).setFooter({ text: `รวม ${list.length} คน` }).setTimestamp()],
        ephemeral: true,
      });
    }
  },
};
