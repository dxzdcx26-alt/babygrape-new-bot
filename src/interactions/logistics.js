const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const {
  listStorageItems,
  upsertStorageItem,
  setStorageQuantity,
  logStorageAction,
  createDelivery,
} = require('../database');
const { isAdmin } = require('../utils/permissions');
const config = require('../config');

function isLogisticsInteraction(interaction) {
  const id = interaction.customId || '';
  return (
    id === 'storage_withdraw_btn' ||
    id === 'storage_admin_btn' ||
    id === 'delivery_submit_btn' ||
    id === 'storage_withdraw_modal' ||
    id === 'storage_admin_modal' ||
    id === 'delivery_submit_modal'
  );
}

function formatStock() {
  const items = listStorageItems();
  if (!items.length) return '✕ คลังว่างเปล่า (Empty)';
  return items.map((i) => `• **${i.name}** × ${i.quantity}`).join('\n');
}

function deliveryPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('📦 ‧ Delivery Zone !')
    .setDescription(
      [
        '**ระบบส่งของ**',
        '',
        '**Guideline**',
        '• กรอกชื่อของ / จำนวน / จุดส่ง',
        '• แนบลิงก์รูปหลักฐานทุกครั้ง',
        '• ระบบจะบันทึกและแจ้งในห้อง log',
        '',
        '*Safe delivery · Baby Grape System 🍇*',
      ].join('\n'),
    );
  const row = new ActionRowBuilder().addComponents(
    require('discord.js').ButtonBuilder
      ? new (require('discord.js').ButtonBuilder)()
          .setCustomId('delivery_submit_btn')
          .setLabel('บันทึกการส่งของ')
          .setStyle(require('discord.js').ButtonStyle.Primary)
          .setEmoji('📦')
      : null,
  );
  // rebuild cleanly
  const { ButtonBuilder, ButtonStyle } = require('discord.js');
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('delivery_submit_btn')
      .setLabel('บันทึกการส่งของ')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📦'),
  );
  return { embeds: [embed], components: [row2] };
}

function storagePanelLive() {
  const { ButtonBuilder, ButtonStyle } = require('discord.js');
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('🍇 Storage Zone ! · คลังของแก๊ง')
    .setDescription(
      [
        '**Current Stock**',
        formatStock(),
        '',
        '**วิธีใช้งาน**',
        '• กดปุ่ม "เบิกของ" เพื่อเบิกของจากคลัง',
        '• ต้องใส่ลิงก์รูปหลักฐาน ทุกครั้ง',
        '• แอดมินใช้ "จัดการคลัง" เพื่อเพิ่ม/ตั้งยอด',
        '',
        `*Updated: ${new Date().toLocaleString('th-TH')} · Baby Grape System 🍇*`,
      ].join('\n'),
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('storage_withdraw_btn')
      .setLabel('เบิกของ')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📥'),
    new ButtonBuilder()
      .setCustomId('storage_admin_btn')
      .setLabel('จัดการคลัง (Admin)')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🛡️'),
  );
  return { embeds: [embed], components: [row] };
}

async function handleLogistics(interaction) {
  const id = interaction.customId;

  if (id === 'delivery_submit_btn') {
    const modal = new ModalBuilder().setCustomId('delivery_submit_modal').setTitle('บันทึกการส่งของ');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('item_name').setLabel('ชื่อของ').setStyle(TextInputStyle.Short).setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('quantity')
          .setLabel('จำนวน')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue('1'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('destination')
          .setLabel('จุดส่ง / ผู้รับ')
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('proof_url')
          .setLabel('ลิงก์รูปหลักฐาน')
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
    );
    return interaction.showModal(modal);
  }

  if (id === 'storage_withdraw_btn') {
    const modal = new ModalBuilder().setCustomId('storage_withdraw_modal').setTitle('เบิกของจากคลัง');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('item_name').setLabel('ชื่อของ').setStyle(TextInputStyle.Short).setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('quantity')
          .setLabel('จำนวนที่เบิก')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue('1'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('proof_url')
          .setLabel('ลิงก์รูปหลักฐาน')
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
    );
    return interaction.showModal(modal);
  }

  if (id === 'storage_admin_btn') {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: '❌ เฉพาะแอดมิน',
        flags: MessageFlags.Ephemeral,
      });
    }
    const modal = new ModalBuilder().setCustomId('storage_admin_modal').setTitle('จัดการคลัง (Admin)');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('item_name').setLabel('ชื่อของ').setStyle(TextInputStyle.Short).setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('quantity')
          .setLabel('จำนวนที่ตั้ง (ยอดรวมใหม่)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('note')
          .setLabel('หมายเหตุ (ไม่บังคับ)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false),
      ),
    );
    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && id === 'delivery_submit_modal') {
    const item = interaction.fields.getTextInputValue('item_name').trim();
    const qty = parseInt(interaction.fields.getTextInputValue('quantity'), 10) || 1;
    const dest = interaction.fields.getTextInputValue('destination').trim();
    const proof = interaction.fields.getTextInputValue('proof_url').trim();
    const logId = createDelivery(interaction.user.id, item, qty, dest, proof);

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('📦 บันทึกส่งของแล้ว')
      .addFields(
        { name: 'ของ', value: item, inline: true },
        { name: 'จำนวน', value: String(qty), inline: true },
        { name: 'จุดส่ง', value: dest, inline: true },
        { name: 'โดย', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'หลักฐาน', value: proof },
      )
      .setFooter({ text: `Delivery #${logId}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    const logChId = config.channels.log;
    if (logChId) {
      const ch = await interaction.client.channels.fetch(logChId).catch(() => null);
      if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
    }
    return;
  }

  if (interaction.isModalSubmit() && id === 'storage_withdraw_modal') {
    const item = interaction.fields.getTextInputValue('item_name').trim();
    const qty = Math.abs(parseInt(interaction.fields.getTextInputValue('quantity'), 10) || 1);
    const proof = interaction.fields.getTextInputValue('proof_url').trim();

    const items = listStorageItems();
    const found = items.find((i) => i.name.toLowerCase() === item.toLowerCase());
    if (!found || found.quantity < qty) {
      return interaction.reply({
        content: `❌ ของไม่พอในคลัง (มี ${found ? found.quantity : 0})`,
        flags: MessageFlags.Ephemeral,
      });
    }

    upsertStorageItem(found.name, -qty);
    logStorageAction(found.name, 'withdraw', qty, interaction.user.id, proof);

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle('📥 เบิกของแล้ว')
      .setDescription(`**${found.name}** × ${qty}\nเหลือในคลัง: **${found.quantity - qty}**`)
      .addFields(
        { name: 'โดย', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'หลักฐาน', value: proof },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    if (interaction.message?.editable) {
      await interaction.message.edit(storagePanelLive()).catch(() => {});
    }
    return;
  }

  if (interaction.isModalSubmit() && id === 'storage_admin_modal') {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ เฉพาะแอดมิน', flags: MessageFlags.Ephemeral });
    }
    const item = interaction.fields.getTextInputValue('item_name').trim();
    const qty = Math.max(0, parseInt(interaction.fields.getTextInputValue('quantity'), 10) || 0);
    const note = interaction.fields.getTextInputValue('note') || null;
    setStorageQuantity(item, qty, note);
    logStorageAction(item, 'set', qty, interaction.user.id, null, note);

    await interaction.reply({
      content: `✅ ตั้งคลัง **${item}** = ${qty} แล้ว`,
      flags: MessageFlags.Ephemeral,
    });

    if (interaction.message?.editable) {
      await interaction.message.edit(storagePanelLive()).catch(() => {});
    }
  }
}

module.exports = {
  isLogisticsInteraction,
  handleLogistics,
  deliveryPanel,
  storagePanelLive,
  formatStock,
};
