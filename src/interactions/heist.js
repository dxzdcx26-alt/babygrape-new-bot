const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, UserSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder,
} = require('discord.js');
const config = require('../config');
const { createHeistReport, ensureUser, addWeeklyScore } = require('../database');
const { updateScoreboard } = require('../services/scoreboard');
const { sendHeistToSheet } = require('../services/googleSheets');

const selectionStates = new Map();

const ACTIVITY_OPTIONS = [
  { label: '💥 ปล้นร้านค้าใหญ่ (Flood)', value: 'Flood' },
  { label: '⚡ ปล้นร้านค้าเล็ก (Cholo)', value: 'Cholo' },
  { label: '🚁 ปล้นเฮลิคอปเตอร์ (Helikopter)', value: 'Helikopter' },
  { label: 'yacht ปล้นเรือยอร์ช (Yacht)', value: 'Yacht' },
  { label: '💰 งัดร้าน', value: 'งัดร้าน' },
  { label: '🏦 งัดธนาคาร', value: 'งัดธนาคาร' },
  { label: '📦 ลูทบ็อก', value: 'ลูทบ็อก' },
];

const TIME_OPTIONS = [
  { label: '☀️ พีคไทม์ (+10 , 18:00-02:00)', value: 'peak' },
  { label: '🌙 นอกเวลา (+2 , 02:00-17:59)', value: 'offpeak' },
];

const DISCORD_CDN_REGEX =
  /^https:\/\/((cdn|media)\.discordapp\.(com|net))\/[^\s\u0E00-\u0E7F]*$/;

async function handleStartHeist(interaction) {
  selectionStates.set(interaction.user.id, {
    activity: null,
    members: [],
    time: null,
  });
  const activitySelect = new StringSelectMenuBuilder()
    .setCustomId(`activity_select_menu_${interaction.user.id}`)
    .setPlaceholder('1. เลือกประเภทกิจกรรม')
    .addOptions(ACTIVITY_OPTIONS);
  const timeSelect = new StringSelectMenuBuilder()
    .setCustomId(`time_select_menu_${interaction.user.id}`)
    .setPlaceholder('2. เลือกช่วงเวลา')
    .addOptions(TIME_OPTIONS);
  const memberSelect = new UserSelectMenuBuilder()
    .setCustomId(`member_select_menu_${interaction.user.id}`)
    .setPlaceholder('3. เลือกสมาชิกที่เข้าร่วม')
    .setMinValues(1)
    .setMaxValues(5);
  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_heist_details_${interaction.user.id}`)
    .setLabel('4. กรอกข้อมูลและยืนยัน')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true);
  await interaction.reply({
    content: 'กรุณาเลือกข้อมูลด้านล่างให้ครบถ้วน:',
    components: [
      new ActionRowBuilder().addComponents(activitySelect),
      new ActionRowBuilder().addComponents(timeSelect),
      new ActionRowBuilder().addComponents(memberSelect),
      new ActionRowBuilder().addComponents(confirmButton),
    ],
    ephemeral: true,
  });
}

async function handleSelectMenu(interaction) {
  const userId = interaction.user.id;
  if (!interaction.customId.endsWith(`_${userId}`)) {
    return interaction.reply({ content: 'นี่ไม่ใช่เมนูของคุณนะคับ', ephemeral: true });
  }
  let state = selectionStates.get(userId);
  if (!state) {
    state = { activity: null, members: [], time: null };
    selectionStates.set(userId, state);
  }
  if (interaction.customId.startsWith('activity_select_menu')) state.activity = interaction.values[0];
  else if (interaction.customId.startsWith('time_select_menu')) state.time = interaction.values[0];
  else if (interaction.customId.startsWith('member_select_menu')) state.members = interaction.values;

  const newActivitySelect = StringSelectMenuBuilder.from(interaction.message.components[0].components[0]).setOptions(
    ACTIVITY_OPTIONS.map((opt) => ({ ...opt, default: opt.value === state.activity })),
  );
  const newTimeSelect = StringSelectMenuBuilder.from(interaction.message.components[1].components[0]).setOptions(
    TIME_OPTIONS.map((opt) => ({ ...opt, default: opt.value === state.time })),
  );
  const newMemberSelect = UserSelectMenuBuilder.from(interaction.message.components[2].components[0]).setDefaultUsers(
    state.members,
  );
  const newConfirmButton = ButtonBuilder.from(interaction.message.components[3].components[0]).setDisabled(
    !(state.activity && state.time && state.members.length > 0),
  );

  await interaction.update({
    components: [
      new ActionRowBuilder().addComponents(newActivitySelect),
      new ActionRowBuilder().addComponents(newTimeSelect),
      new ActionRowBuilder().addComponents(newMemberSelect),
      new ActionRowBuilder().addComponents(newConfirmButton),
    ],
  });
}

async function handleConfirmButton(interaction) {
  const userId = interaction.user.id;
  if (!interaction.customId.endsWith(`_${userId}`)) {
    return interaction.reply({ content: 'นี่ไม่ใช่ปุ่มของคุณนะคับ', ephemeral: true });
  }
  const state = selectionStates.get(userId);
  if (!state || !state.activity || !state.time || !state.members.length) {
    return interaction.reply({ content: 'ข้อมูลยังไม่ครบถ้วน!', ephemeral: true });
  }
  const modal = new ModalBuilder()
    .setCustomId(`heist_default_modal_${userId}`)
    .setTitle('กรอกหลักฐานและหมายเหตุ');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('image_url_input')
        .setLabel('ลิงก์รูปหลักฐาน (CDN Discord)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('https://cdn.discordapp.com/...'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('notes_input')
        .setLabel('หมายเหตุ (ไม่บังคับ)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false),
    ),
  );
  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
  const userId = interaction.user.id;
  if (!interaction.customId.endsWith(`_${userId}`)) {
    return interaction.reply({ content: 'นี่ไม่ใช่ฟอร์มของคุณ', ephemeral: true });
  }
  const state = selectionStates.get(userId);
  if (!state) {
    return interaction.reply({ content: 'เซสชันหมดอายุ — กดเริ่มลงทะเบียนใหม่', ephemeral: true });
  }
  const imageUrl = interaction.fields.getTextInputValue('image_url_input');
  const notes = interaction.fields.getTextInputValue('notes_input') || '';
  if (!DISCORD_CDN_REGEX.test(imageUrl)) {
    return interaction.reply({
      content: 'ลิงก์รูปต้องเป็น Discord CDN เท่านั้น (cdn.discordapp.com / media.discordapp.net)',
      ephemeral: true,
    });
  }
  const scoreEach = state.time === 'peak' ? (config.scores?.peak || 10) : (config.scores?.offpeak || 2);
  const members = state.members;
  const reportId = createHeistReport({
    reporter_id: userId,
    activity: state.activity,
    time_slot: state.time,
    member_ids: members,
    image_url: imageUrl,
    score_each: scoreEach,
    guild_id: interaction.guildId,
    channel_id: interaction.channelId,
  });
  for (const mid of members) {
    ensureUser(mid);
    addWeeklyScore(mid, scoreEach, userId, `heist:${state.activity}`, reportId);
  }
  selectionStates.delete(userId);
  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle('✅ บันทึกกิจกรรมสำเร็จ')
    .addFields(
      { name: 'กิจกรรม', value: state.activity, inline: true },
      { name: 'ช่วงเวลา', value: state.time, inline: true },
      { name: 'คะแนน/คน', value: String(scoreEach), inline: true },
      { name: 'สมาชิก', value: members.map((id) => `<@${id}>`).join(', ') },
      { name: 'หลักฐาน', value: imageUrl },
    )
    .setTimestamp();
  if (notes) embed.addFields({ name: 'หมายเหตุ', value: notes });
  await interaction.reply({ embeds: [embed], ephemeral: true });
  const logId = config.channels?.log || process.env.LOG_CHANNEL_ID;
  if (logId) {
    const ch = await interaction.client.channels.fetch(logId).catch(() => null);
    if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
  }
  try {
    await updateScoreboard(interaction.client);
  } catch (e) {
    console.warn('scoreboard update', e.message);
  }
  try {
    await sendHeistToSheet({
      activity: state.activity,
      time: state.time,
      members,
      scoreEach,
      imageUrl,
      notes,
      reporter: userId,
    });
  } catch (e) {
    console.warn('sheet', e.message);
  }
}

function isHeistInteraction(interaction) {
  const id = interaction.customId || '';
  if (interaction.isButton()) {
    return id === 'start_heist_report' || id === 'act_start' || id.startsWith('confirm_heist_details_');
  }
  if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) {
    return (
      id.startsWith('activity_select_menu_') ||
      id.startsWith('time_select_menu_') ||
      id.startsWith('member_select_menu_')
    );
  }
  if (interaction.isModalSubmit()) {
    return id.startsWith('heist_default_modal_') || id.startsWith('heist_store_modal_');
  }
  return false;
}

async function handleHeistInteraction(interaction) {
  if (interaction.isButton() && (interaction.customId === 'start_heist_report' || interaction.customId === 'act_start')) {
    return handleStartHeist(interaction);
  }
  if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) return handleSelectMenu(interaction);
  if (interaction.isButton() && interaction.customId.startsWith('confirm_heist_details_')) {
    return handleConfirmButton(interaction);
  }
  if (interaction.isModalSubmit()) return handleModalSubmit(interaction);
}

module.exports = { isHeistInteraction, handleHeistInteraction, selectionStates };
