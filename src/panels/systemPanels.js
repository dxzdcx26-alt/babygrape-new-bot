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
        '**ใช้สำหรับบันทึกการเข้าร่วมกิจกรรม**',
        '',
        '**Guideline**',
        '• เงื่อนไขการนับคะแนน — ระบบจะนับคะแนนให้เฉพาะผู้ที่กดปุ่มด้านล่างเท่านั้น',
        '• วิธีการบันทึก — โปรดเลือกรายชื่อให้ครบทุกคน (รวมถึงตัวเองด้วย)',
        '• หากมีข้อสงสัย สามารถติดต่อให้แอดมินช่วยตรวจสอบได้',
        '',
        '*Enjoy Activities ! · Baby Grape System 🍇*',
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
    .setTitle('🍇 Leave Zone !')
    .setDescription(
      [
        '**ระบบบันทึกการลา**',
        '',
        '**Guideline**',
        '• เลือกวันที่ต้องการลาให้ถูกต้อง',
        '• ระบุประเภทและเหตุผลสั้น ๆ',
        '• ระบบจะบันทึกข้อมูลและแจ้งเตือนผู้ดูแลให้อัตโนมัติ',
        '',
        '*Take care and see you soon ! · Baby Grape System 🍇*',
      ].join('\n'),
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('leave_request_btn')
      .setLabel('แจ้งลา')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📝'),
  );
  return { embeds: [embed], components: [row] };
}

function checkinPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('🍇 Check-in Zone !')
    .setDescription(
      [
        '**ระบบเช็คชื่อ**',
        '',
        '**Guideline**',
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
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📌'),
  );
  return { embeds: [embed], components: [row] };
}

function storagePanel() {
  return storagePanelLive();
}

function adminPanel() {
  const description = [
    '⸝ **Baby Grape Control Panel** 𓂃 ✿',
    '﹒ 🍇﹕ ✼ ﹒ **Admin Zone !**   ♡   ยินดีต้อนรับสู่หลังบ้านของ Baby Grape นะคะ   ⋆   ⁺',
    '☁️ ﹒ กรุณาเลือกเมนูที่ต้องการตั้งค่าด้านล่าง',
    '',
    '╭ ꔫ ﹒ 📍 **ระบบห้อง**  (Channels)',
    '˙ ╰ ┈ ‧₊˚ ตั้งค่าห้องวางปุ่มและ Panel (แจ้งลา / กิจกรรม / เช็คชื่อ / Leaderboard / Log)',
    '╭ ꔫ ﹒ 🎮 **ระบบกิจกรรม**  (Activities)',
    '˙ ╰ ┈ ‧₊˚ จัดการรายชื่อกิจกรรม กำหนดคะแนน และดูประวัติการลงทะเบียน',
    '╭ ꔫ ﹒ 📅 **ระบบเช็คชื่อ**  (Check-in)',
    '˙ ╰ ┈ ‧₊˚ สร้างหัวข้อเช็คชื่อ เปิด-ปิดรอบ และดูรายชื่อผู้ลงชื่อ',
    '╭ ꔫ ﹒ 👮 **สิทธิ์การใช้งาน**  (Roles)',
    '˙ ╰ ┈ ‧₊˚ กำหนด Role Admin / Helper / Member สำหรับจำกัดสิทธิ์การใช้งาน',
    '╭ ꔫ ﹒ ⚙️ **ตั้งค่าอื่นๆ**  (Settings)',
    '˙ ╰ ┈ ‧₊˚ ตั้งเวลาปิดรับการลา แก้ไขคะแนน ดูประวัติย้อนหลัง และอื่นๆ',
    '☁️ ⁺ ˖ ⸝⸝ Enjoy Managing  !   ‧   Baby Grape System   🍇   ⋆ ♡ ˊ ˎ -',
  ].join('\n');

  const embed = new EmbedBuilder().setColor(0x7c3aed).setDescription(description);

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_channel_settings').setLabel('ตั้งค่าห้อง').setStyle(ButtonStyle.Secondary).setEmoji('📌'),
      new ButtonBuilder().setCustomId('admin_activities').setLabel('กิจกรรม').setStyle(ButtonStyle.Secondary).setEmoji('🎮'),
      new ButtonBuilder().setCustomId('admin_checkin').setLabel('เช็คชื่อ').setStyle(ButtonStyle.Secondary).setEmoji('📅'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_roles').setLabel('ตั้งค่ายศ').setStyle(ButtonStyle.Secondary).setEmoji('👮'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_extra').setLabel('ตั้งค่าเพิ่มเติม').setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
      new ButtonBuilder().setCustomId('admin_delivery').setLabel('ระบบส่งของ').setStyle(ButtonStyle.Secondary).setEmoji('📦'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_storage').setLabel('คลังแก๊ง').setStyle(ButtonStyle.Secondary).setEmoji('🏭'),
    ),
  ];
  return { embeds: [embed], components: rows };
}

function scoreboardPlaceholder(type) {
  const isWeekly = type === 'weekly';
  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle(
      isWeekly
        ? '🍇 ตารางคะแนนประจำสัปดาห์ (ทั้งหมด)'
        : '🍇 ตารางคะแนนสะสมรวม (ทั้งหมด)',
    )
    .setDescription(
      [
        'อัปเดตล่าสุด: เพิ่งสร้าง',
        '',
        'ยังไม่มีข้อมูลคะแนนในหมวดนี้',
        '',
        '*Baby Grape System · Scoreboard !*',
      ].join('\n'),
    );
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
      results.push(`ข้าม ${label}: ไม่มีห้อง`);
      return;
    }
    try {
      await ch.send(payload);
      results.push(`ส่งแผง ${label} → #${ch.name}`);
    } catch (e) {
      results.push(`ล้มเหลว ${label}: ${e.message}`);
    }
  }

  await post(channels.control, activityPanel(), 'ลงทะเบียนกิจกรรม');
  await post(channels.leave, leavePanel(), 'แจ้งลา');
  await post(channels.checkin, checkinPanel(), 'เช็คชื่อ');
  await post(channels.storage, storagePanelLive(), 'คลังของแก๊ง');
  await post(channels.delivery, deliveryPanel(), 'ส่งของ');

  if (channels.score) {
    try {
      await channels.score.send({ embeds: [scoreboardPlaceholder('weekly')] });
      await channels.score.send({
        embeds: [scoreboardPlaceholder('monthly')],
        components: [weeklyResetButton()],
      });
      results.push(`ส่งกระดานคะแนน → #${channels.score.name}`);
    } catch (e) {
      results.push(`ล้มเหลว ตารางคะแนน: ${e.message}`);
    }
  }

  const adminCh = channels.admin || channels.log || channels.control;
  await post(adminCh, adminPanel(), 'แผงจัดการ (heist-score)');

  return results;
}

module.exports = {
  activityPanel,
  leavePanel,
  checkinPanel,
  storagePanel,
  storagePanelLive,
  deliveryPanel,
  adminPanel,
  sendAllPanels,
};
