const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { storagePanelLive, deliveryPanel } = require('../interactions/logistics');

function activityPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('🍇 Activity Zone !')
    .setDescription(
      [
        '**ใช้สำหรับลงทะเบียนกิจกรรม / Heist Report**',
        '',
        '• กดปุ่มด้านล่างเพื่อเริ่มลงทะเบียน',
        '• เลือกประเภทกิจกรรม ช่วงเวลา และสมาชิก',
        '• แนบหลักฐานตามขั้นตอนที่ระบบกำหนด',
        '',
        '*Baby Grape System · Activity Report 🍇*',
      ].join('\n'),
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('start_heist_report')
      .setLabel('เริ่มลงทะเบียน')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝'),
  );
  return { embeds: [embed], components: [row] };
}

function leavePanel() {
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('✈️ Leave Zone !')
    .setDescription(
      [
        '**ระบบแจ้งลา**',
        '',
        '• กดปุ่มเพื่อเปิดฟอร์มแจ้งลา',
        '• กรอกวันที่ ประเภท และเหตุผล',
        '• แอดมินจะตรวจสอบรายการในระบบ',
        '',
        '*Baby Grape System · Leave 🍇*',
      ].join('\n'),
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('leave_request_btn')
      .setLabel('แจ้งลา')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✈️'),
  );
  return { embeds: [embed], components: [row] };
}

function checkinPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('📌 Check-in Zone !')
    .setDescription(
      [
        '**ระบบเช็คชื่อ**',
        '',
        '• ใช้สำหรับเช็คชื่อเข้าร่วมกิจกรรมหรือช่วงเวลาที่กำหนด',
        '• เลือกรอบเช็คชื่อจากระบบที่แอดมินเปิดไว้',
        '• ระบบจะบันทึกเวลาเช็คชื่อให้อัตโนมัติ',
        '',
        "*Don't forget to check-in ! · Baby Grape System 🍇*",
      ].join('\n'),
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('checkin_join_btn')
      .setLabel('เช็คชื่อ')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
  );
  return { embeds: [embed], components: [row] };
}

function storagePanel() {
  return storagePanelLive();
}

function adminPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('⸝ Baby Grape Control Panel 𓂃 ✿')
    .setDescription('แผงแอดมินถูกปิดจากการสร้างอัตโนมัติ');
  return { embeds: [embed], components: [] };
}

function scoreboardPlaceholder(type) {
  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('ตารางคะแนน')
    .setDescription('ปิดการสร้างอัตโนมัติ');
}

function weeklyResetButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('weekly_reset_btn')
      .setLabel('ตัดยอดคะแนน')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✂️'),
  );
}

async function sendAllPanels(guild, channels) {
  const results = [];
  async function post(ch, payload, label) {
    if (!ch) {
      results.push(`ข้าม ${label} (ไม่มีห้อง)`);
      return;
    }
    try {
      await ch.send(payload);
      results.push(`ส่ง${label} → #${ch.name}`);
    } catch (e) {
      results.push(`ล้มเหลว ${label}: ${e.message}`);
    }
  }

  await post(channels.control, activityPanel(), 'แผง ลงทะเบียนกิจกรรม');
  await post(channels.leave, leavePanel(), 'แผง แจ้งลา');
  await post(channels.checkin, checkinPanel(), 'แผง เช็คชื่อ');
  await post(channels.delivery, deliveryPanel(), 'แผง ส่งของ');

  // ไม่สร้างตารางคะแนน / ไม่ส่งแผงแอดมิน

  return results;
}

module.exports = {
  activityPanel,
  leavePanel,
  checkinPanel,
  storagePanel,
  adminPanel,
  sendAllPanels,
  scoreboardPlaceholder,
  weeklyResetButton,
};
