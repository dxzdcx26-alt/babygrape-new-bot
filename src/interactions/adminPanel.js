const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  RoleSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const {
  getOpenCheckinSession,
  openCheckinSession,
  closeCheckinSession,
  setSetting,
  getSetting,
} = require('../database');
const { activityPanel, leavePanel, checkinPanel, storagePanel } = require('../panels/systemPanels');

const ADMIN_IDS = new Set([
  'admin_channel_settings',
  'admin_activities',
  'admin_checkin',
  'admin_roles',
  'admin_extra',
  'admin_delivery',
  'admin_storage',
  'admin_back',
  'admin_repost_activity',
  'admin_repost_leave',
  'admin_repost_checkin',
  'admin_repost_storage',
  'admin_checkin_open',
  'admin_checkin_close',
  'admin_checkin_status',
]);

function isAdminPanelInteraction(interaction) {
  if (!interaction.isButton() && !interaction.isChannelSelectMenu() && !interaction.isRoleSelectMenu() && !interaction.isModalSubmit()) {
    return false;
  }
  const id = interaction.customId || '';
  return (
    ADMIN_IDS.has(id) ||
    id.startsWith('admin_') ||
    id.startsWith('set_channel_') ||
    id.startsWith('set_role_')
  );
}

function ephemeral(content) {
  return { content, flags: MessageFlags.Ephemeral };
}

function backRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_back')
      .setLabel('กลับเมนูหลัก')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⬅️'),
  );
}

async function requireAdminUser(interaction) {
  if (!isAdmin(interaction.member)) {
    await interaction.reply(ephemeral('❌ เมนูนี้สำหรับแอดมินเท่านั้น'));
    return false;
  }
  return true;
}

/** เมนูหลัก — ข้อความเดียวกับ Control Panel */
function mainMenuPayload() {
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

async function handleAdminPanel(interaction) {
  const id = interaction.customId;

  // กลับเมนูหลัก — แก้ข้อความเดิม
  if (id === 'admin_back') {
    if (!(await requireAdminUser(interaction))) return;
    return interaction.update(mainMenuPayload());
  }

  // --- ตั้งค่าห้อง: เลือกห้องแล้วโพสต์แผง ---
  if (id === 'admin_channel_settings') {
    if (!(await requireAdminUser(interaction))) return;
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('📍 ตั้งค่าห้อง / วาง Panel')
      .setDescription(
        [
          'เลือกประเภทแผงที่ต้องการ**ส่งเข้าห้อง**',
          'จากนั้นเลือกห้องปลายทางในขั้นตอนถัดไป',
          '',
          '• กิจกรรม → ปุ่มเริ่มลงทะเบียน',
          '• แจ้งลา → ปุ่มแจ้งลา',
          '• เช็คชื่อ → ปุ่มเช็คชื่อ',
          '• คลัง → แผงคลังของแก๊ง',
        ].join('\n'),
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_repost_activity').setLabel('แผงกิจกรรม').setStyle(ButtonStyle.Primary).setEmoji('📝'),
      new ButtonBuilder().setCustomId('admin_repost_leave').setLabel('แผงแจ้งลา').setStyle(ButtonStyle.Primary).setEmoji('✈️'),
      new ButtonBuilder().setCustomId('admin_repost_checkin').setLabel('แผงเช็คชื่อ').setStyle(ButtonStyle.Primary).setEmoji('📌'),
      new ButtonBuilder().setCustomId('admin_repost_storage').setLabel('แผงคลัง').setStyle(ButtonStyle.Primary).setEmoji('🏭'),
    );
    return interaction.update({ embeds: [embed], components: [row, backRow()] });
  }

  const repostMap = {
    admin_repost_activity: { key: 'activity', panel: activityPanel, label: 'กิจกรรม' },
    admin_repost_leave: { key: 'leave', panel: leavePanel, label: 'แจ้งลา' },
    admin_repost_checkin: { key: 'checkin', panel: checkinPanel, label: 'เช็คชื่อ' },
    admin_repost_storage: { key: 'storage', panel: storagePanel, label: 'คลัง' },
  };

  if (repostMap[id]) {
    if (!(await requireAdminUser(interaction))) return;
    const { key, label } = repostMap[id];
    const select = new ChannelSelectMenuBuilder()
      .setCustomId(`set_channel_${key}`)
      .setPlaceholder(`เลือกห้องสำหรับแผง${label}`)
      .setChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`ส่งแผง${label}`)
      .setDescription('เลือกห้องด้านล่าง ระบบจะส่ง Panel เข้าไปให้');
    return interaction.update({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(select), backRow()],
    });
  }

  if (interaction.isChannelSelectMenu() && id.startsWith('set_channel_')) {
    if (!(await requireAdminUser(interaction))) return;
    const key = id.replace('set_channel_', '');
    const channel = interaction.channels.first();
    if (!channel) {
      return interaction.reply(ephemeral('ไม่พบห้องที่เลือก'));
    }
    const panels = {
      activity: activityPanel,
      leave: leavePanel,
      checkin: checkinPanel,
      storage: storagePanel,
    };
    const fn = panels[key];
    if (!fn) return interaction.reply(ephemeral('ประเภทแผงไม่ถูกต้อง'));

    setSetting(`${key}_channel_id`, channel.id);
    process.env[`${key.toUpperCase()}_CHANNEL_ID`] = channel.id;

    await channel.send(fn());
    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('✅ ส่งแผงเรียบร้อย')
          .setDescription(`ส่งแผง **${key}** ไปที่ ${channel} แล้ว`),
      ],
      components: [backRow()],
    });
  }

  // --- กิจกรรม ---
  if (id === 'admin_activities') {
    if (!(await requireAdminUser(interaction))) return;
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('🎮 ระบบกิจกรรม')
      .setDescription(
        [
          'กิจกรรมที่ใช้ตอนลงทะเบียน (Heist Report):',
          '',
          '• 💥 ปล้นร้านค้าใหญ่ (Flood)',
          '• ⚡ ปล้นร้านค้าเล็ก (Cholo)',
          '• 🚁 ปล้นเฮลิคอปเตอร์ (Helikopter)',
          '• yacht ปล้นเรือยอร์ช (Yacht)',
          '',
          'คะแนน: **Peak 10** / **Off-peak 2**',
          '',
          'สมาชิกกดปุ่ม **เริ่มลงทะเบียน** ในห้องกิจกรรมเพื่อบันทึก',
        ].join('\n'),
      );
    return interaction.update({ embeds: [embed], components: [backRow()] });
  }

  // --- เช็คชื่อ ---
  if (id === 'admin_checkin') {
    if (!(await requireAdminUser(interaction))) return;
    const session = getOpenCheckinSession();
    const status = session
      ? `🟢 เปิดอยู่: **${session.name}** (id ${session.id})`
      : '🔴 ยังไม่มีรอบที่เปิด';
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('📅 ระบบเช็คชื่อ')
      .setDescription(`${status}\n\nเปิดรอบใหม่ / ปิดรอบปัจจุบันได้ด้านล่าง`);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_checkin_open').setLabel('เปิดรอบใหม่').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('admin_checkin_close').setLabel('ปิดรอบ').setStyle(ButtonStyle.Danger).setEmoji('⏹️'),
      new ButtonBuilder().setCustomId('admin_checkin_status').setLabel('ดูสถานะ').setStyle(ButtonStyle.Secondary),
    );
    return interaction.update({ embeds: [embed], components: [row, backRow()] });
  }

  if (id === 'admin_checkin_open') {
    if (!(await requireAdminUser(interaction))) return;
    const modal = new ModalBuilder().setCustomId('admin_checkin_open_modal').setTitle('เปิดรอบเช็คชื่อ');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('session_name')
          .setLabel('ชื่อรอบ (เช่น ประชุมประจำสัปดาห์)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
    );
    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && id === 'admin_checkin_open_modal') {
    if (!(await requireAdminUser(interaction))) return;
    const name = interaction.fields.getTextInputValue('session_name');
    const session = openCheckinSession(name, interaction.user.id);
    return interaction.reply(
      ephemeral(`✅ เปิดรอบเช็คชื่อ **${name}** แล้ว (id ${session?.id || '—'})\nสมาชิกกดปุ่มเช็คชื่อในห้องเช็คชื่อได้`),
    );
  }

  if (id === 'admin_checkin_close') {
    if (!(await requireAdminUser(interaction))) return;
    const session = getOpenCheckinSession();
    if (!session) {
      return interaction.reply(ephemeral('ไม่มีรอบที่เปิดอยู่'));
    }
    closeCheckinSession(session.id);
    return interaction.reply(ephemeral(`⏹️ ปิดรอบ **${session.name}** แล้ว`));
  }

  if (id === 'admin_checkin_status') {
    if (!(await requireAdminUser(interaction))) return;
    const session = getOpenCheckinSession();
    return interaction.reply(
      ephemeral(session ? `🟢 เปิด: **${session.name}** (id ${session.id})` : '🔴 ไม่มีรอบเปิดอยู่'),
    );
  }

  // --- Roles ---
  if (id === 'admin_roles') {
    if (!(await requireAdminUser(interaction))) return;
    const select = new RoleSelectMenuBuilder()
      .setCustomId('set_role_admin')
      .setPlaceholder('เลือกยศ Admin')
      .setMinValues(1)
      .setMaxValues(1);
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('👮 ตั้งค่ายศ')
      .setDescription(
        [
          `Admin Role ปัจจุบัน: ${getSetting('admin_role_id') || process.env.ADMIN_ROLE_ID || 'ยังไม่ตั้ง'}`,
          '',
          'เลือกยศด้านล่างเพื่อตั้งเป็น **Admin** ของบอท',
          '(ผู้ที่ยศนี้ใช้เมนูจัดการได้)',
        ].join('\n'),
      );
    return interaction.update({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(select), backRow()],
    });
  }

  if (interaction.isRoleSelectMenu() && id === 'set_role_admin') {
    if (!(await requireAdminUser(interaction))) return;
    const role = interaction.roles.first();
    if (!role) return interaction.reply(ephemeral('ไม่พบยศ'));
    setSetting('admin_role_id', role.id);
    process.env.ADMIN_ROLE_ID = role.id;
    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('✅ ตั้งยศ Admin แล้ว')
          .setDescription(`Admin Role = ${role}`),
      ],
      components: [backRow()],
    });
  }

  // --- Settings / Delivery / Storage info ---
  if (id === 'admin_extra') {
    if (!(await requireAdminUser(interaction))) return;
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('⚙️ ตั้งค่าอื่นๆ')
      .setDescription(
        [
          '• ตัดรอบคะแนน: ปุ่ม **ตัดยอดคะแนน** ในห้องตารางคะแนน',
          '• Archive ห้องแชท: อัตโนมัติทุก 3 วัน เวลา 00:00 (Asia/Bangkok)',
          '• Google Sheets: ตั้ง `GOOGLE_SHEET_URL` ใน Environment',
          '',
          'การแก้ไขคะแนนรายคน: ใช้ `/score add|remove|set` (ชั่วคราว)',
        ].join('\n'),
      );
    return interaction.update({ embeds: [embed], components: [backRow()] });
  }

  if (id === 'admin_delivery') {
    if (!(await requireAdminUser(interaction))) return;
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('📦 ระบบส่งของ')
      .setDescription(
        'ระบบส่งของกำลังเชื่อมต่อ — ใช้ห้อง **#ส่งของ** เป็นช่องทางบันทึกไปก่อน\nรุ่นถัดไปจะมีฟอร์มเบิก/ส่งครบ',
      );
    return interaction.update({ embeds: [embed], components: [backRow()] });
  }

  if (id === 'admin_storage') {
    if (!(await requireAdminUser(interaction))) return;
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('🏭 คลังแก๊ง')
      .setDescription(
        'ไปที่ห้อง **#คลังของแก๊ง** แล้วใช้ปุ่ม **เบิกของ / จัดการคลัง**\nหรือใช้เมนู **ตั้งค่าห้อง** เพื่อส่งแผงคลังเข้าห้องใหม่',
      );
    return interaction.update({ embeds: [embed], components: [backRow()] });
  }

  // fallback
  if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
    await interaction.reply(ephemeral('กำลังพัฒนาเมนูนี้'));
  }
}

module.exports = {
  isAdminPanelInteraction,
  handleAdminPanel,
  mainMenuPayload,
};
