const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, UserSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder,
} = require('discord.js');
const config = require('../config');
const { createHeistReport, ensureUser } = require('../database');
const { updateScoreboard } = require('../services/scoreboard');
const { sendHeistToSheet } = require('../services/googleSheets');

const selectionStates = new Map();

const ACTIVITY_OPTIONS = [
  { label: '💰 งัดร้าน', value: 'งัดร้าน' },
  { label: '🏦 งัดธนาคาร', value: 'งัดธนาคาร' },
  { label: '📦 ลูทบ็อก', value: 'ลูทบ็อก' },
];

const TIME_OPTIONS = [
  { label: '☀️ พีคไทม์ (+10 คะแนน , 18:00 - 02:00)', value: 'peak' },
  { label: '🌙 นอกเวลา (+2 คะแนน , 02:00 - 17:59)', value: 'offpeak' },
];

const DISCORD_CDN_REGEX =
  /^https:\/\/((cdn|media)\.discordapp\.(com|net))\/[^\s\u0E00-\u0E7F]*$/;

async function handleStartHeist(interaction) {
  selectionStates.set(interaction.user.id, { activity: null, members: [], time: null, buttonInteraction: null });
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
    .setMinValues(1).setMaxValues(5);
  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_heist_details_${interaction.user.id}`)
    .setLabel('4. กรอกข้อมูลและยืนยัน')
    .setStyle(ButtonStyle.Primary).setDisabled(true);
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

  const newActivitySelect = StringSelectMenuBuilder.from(interaction.message.components[0].components[0])
    .setOptions(ACTIVITY_OPTIONS.map((opt) => ({ ...opt, default: opt.value === state.activity })));
  const newTimeSelect = StringSelectMenuBuilder.from(interaction.message.components[1].components[0])
    .setOptions(TIME_OPTIONS.map((opt) => ({ ...opt, default: opt.value === state.time })));
  const newMemberSelect = UserSelectMenuBuilder.from(interaction.message.components[2].components[0])
    .setDefaultUsers(state.members);
  const newConfirmButton = ButtonBuilder.from(interaction.message.components[3].components[0])
    .setDisabled(!(state.activity && state.time && state.members.length > 0));

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
  state.buttonInteraction = interaction;
  const modal = new ModalBuilder().setTitle('กรอกหลักฐานและหมายเหตุ');
  if (state.activity === 'งัดร้าน') {
    modal.setCustomId(`heist_store_modal_${userId}`);
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('image_url_front_input').setLabel('ลิงก์รูปหลักฐาน (ด้านหน้า)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('https://cdn.discordapp.com/...')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('image_url_back_input').setLabel('ลิงก์รูปหลังร้าน').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('https://cdn.discordapp.com/...')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('notes_input').setLabel('หมายเหตุ (ถ้ามี)').setStyle(TextInputStyle.Paragraph).setRequired(false)),
    );
  } else {
    modal.setCustomId(`heist_default_modal_${userId}`);
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('image_url_input').setLabel('ลิงก์รูปหลักฐาน').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('https://cdn.discordapp.com/...')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('notes_input').setLabel('หมายเหตุ (ถ้ามี)').setStyle(TextInputStyle.Paragraph).setRequired(false)),
    );
  }
  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const userId = interaction.user.id;
  const state = selectionStates.get(userId);
  if (!state) return interaction.editReply({ content: 'เซสชันหมดอายุแล้ว กรุณาเริ่มใหม่' });

  try {
    if (state.buttonInteraction) {
      const disabledComponents = state.buttonInteraction.message.components.map((row) => {
        const newRow = ActionRowBuilder.from(row);
        newRow.components.forEach((comp) => comp.setDisabled(true));
        return newRow;
      });
      await state.buttonInteraction.editReply({ content: 'รายการนี้ถูกส่งเรียบร้อยแล้ว ✅', components: disabledComponents });
    }
  } catch (err) {
    console.log('ไม่สามารถแก้ไขข้อความเดิมได้:', err.message);
  }

  const { activity, time, members: memberIds } = state;
  let imageUrlFront, imageUrlBack, notes;
  if (interaction.customId.startsWith('heist_store_modal')) {
    imageUrlFront = interaction.fields.getTextInputValue('image_url_front_input');
    imageUrlBack = interaction.fields.getTextInputValue('image_url_back_input');
    notes = interaction.fields.getTextInputValue('notes_input') || 'ไม่มี';
  } else if (interaction.customId.startsWith('heist_default_modal')) {
    imageUrlFront = interaction.fields.getTextInputValue('image_url_input');
    imageUrlBack = '';
    notes = interaction.fields.getTextInputValue('notes_input') || 'ไม่มี';
  } else return;

  if (!DISCORD_CDN_REGEX.test(imageUrlFront)) {
    return interaction.editReply({ content: '❌ **URL รูปภาพหลักฐานไม่ถูกต้อง!**\nต้องเป็นลิงก์รูปภาพที่คัดลอกมาจาก Discord โดยตรง และห้ามมีอักษรภาษาไทย กรุณาส่งใหม่อีกครั้งนะคับ' });
  }
  if (imageUrlBack && !DISCORD_CDN_REGEX.test(imageUrlBack)) {
    return interaction.editReply({ content: '❌ **URL รูปภาพหลังร้านไม่ถูกต้อง!**\nต้องเป็นลิงก์รูปภาพที่คัดลอกมาจาก Discord โดยตรง และห้ามมีอักษรภาษาไทย กรุณาส่งใหม่อีกครั้งนะคับ' });
  }

  const scoreToAdd = time === 'peak' ? config.scores.peak : config.scores.offpeak;
  const timeText = time === 'peak' ? 'พีคไทม์' : 'นอกเวลา';
  await interaction.guild.members.fetch();
  const memberObjects = interaction.guild.members.cache.filter((m) => memberIds.includes(m.id));
  if (memberObjects.size === 0) {
    return interaction.editReply({ content: 'ไม่สามารถหาข้อมูลสมาชิกที่เลือกได้เลย โปรดลองอีกครั้ง' });
  }

  const memberDisplayNames = memberObjects.map((m) => m.displayName);
  const memberMentions = memberObjects.map((m) => `<@${m.id}>`).join(', ');
  ensureUser(interaction.user.id, interaction.user.tag, interaction.member?.displayName);
  for (const m of memberObjects.values()) ensureUser(m.id, m.user.tag, m.displayName);

  const reportId = createHeistReport({
    reporterId: interaction.user.id,
    activity, timeType: time, scorePerMember: scoreToAdd,
    imageUrlFront, imageUrlBack: imageUrlBack || null, notes,
    memberIds: [...memberObjects.keys()],
  });

  await updateScoreboard(interaction.client);

  const logChannel = await interaction.client.channels.fetch(config.channels.log);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor(time === 'peak' ? 'Gold' : 'Blue')
      .setTitle(`💰 รายงานผลงาน: ${activity}`)
      .addFields(
        { name: 'ผู้รายงาน', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'ช่วงเวลา', value: timeText, inline: true },
        { name: 'คะแนน/คน', value: `${scoreToAdd}`, inline: true },
        { name: 'สมาชิก', value: memberMentions },
        { name: 'หมายเหตุ', value: notes },
      )
      .setImage(imageUrlFront)
      .setTimestamp()
      .setFooter({ text: `Report #${reportId}` });
    if (imageUrlBack) logEmbed.addFields({ name: 'รูปหลังร้าน', value: imageUrlBack });
    const mention = config.roles.mention ? `<@&${config.roles.mention}>` : '';
    await logChannel.send({ content: mention, embeds: [logEmbed] });
  }

  await sendHeistToSheet({
    reportId, reporter: interaction.user.tag, reporterId: interaction.user.id,
    activity, time: timeText, score: scoreToAdd,
    members: memberDisplayNames.join(', '), memberIds: [...memberObjects.keys()].join(', '),
    notes, imageUrlFront, imageUrlBack: imageUrlBack || '',
  });

  selectionStates.delete(userId);
  await interaction.editReply({
    content: `✅ บันทึกผลงาน **${activity}** (${timeText}) สำเร็จ!\nสมาชิก ${memberMentions} ได้รับคนละ **${scoreToAdd}** คะแนน`,
  });
}

function isHeistInteraction(interaction) {
  if (interaction.isButton()) {
    return interaction.customId === 'start_heist_report' || interaction.customId.startsWith('confirm_heist_details_');
  }
  if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) {
    return interaction.customId.startsWith('activity_select_menu_') ||
      interaction.customId.startsWith('time_select_menu_') ||
      interaction.customId.startsWith('member_select_menu_');
  }
  if (interaction.isModalSubmit()) {
    return interaction.customId.startsWith('heist_store_modal_') || interaction.customId.startsWith('heist_default_modal_');
  }
  return false;
}

async function handleHeistInteraction(interaction) {
  if (interaction.isButton() && interaction.customId === 'start_heist_report') return handleStartHeist(interaction);
  if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) return handleSelectMenu(interaction);
  if (interaction.isButton() && interaction.customId.startsWith('confirm_heist_details_')) return handleConfirmButton(interaction);
  if (interaction.isModalSubmit()) return handleModalSubmit(interaction);
}

module.exports = { isHeistInteraction, handleHeistInteraction, selectionStates };
