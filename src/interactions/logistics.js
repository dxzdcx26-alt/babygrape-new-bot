const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const {
  listStorageItems,
  upsertStorageItem,
  setStorageQuantity,
  logStorageAction,
  createDelivery,
  getRecentDeliveries,
  getSetting,
} = require('../database');
const { isAdmin } = require('../utils/permissions');
const config = require('../config');

function isLogisticsInteraction(interaction) {
  const id = (interaction.customId || '').toLowerCase();
  if (!id) return false;
  return (
    id === 'storage_withdraw_btn' ||
    id === 'storage_admin_btn' ||
    id === 'delivery_submit_btn' ||
    id === 'storage_withdraw_modal' ||
    id === 'storage_admin_modal' ||
    id === 'delivery_submit_modal' ||
    id.includes('storage') ||
    id.includes('delivery') ||
    id.includes('withdraw')
  );
}

function resolveLogChannelId() {
  return (
    config.channels?.log ||
    process.env.LOG_CHANNEL_ID ||
    getSetting('log_channel_id') ||
    null
  );
}

async function postToLog(client, payload) {
  const logChId = resolveLogChannelId();
  if (!logChId) {
    console.warn('ไม่มี LOG_CHANNEL_ID — รัน /setup ก่อน');
    return false;
  }
  try {
    const ch = await client.channels.fetch(logChId);
    if (!ch) return false;
    await ch.send(payload);
    return true;
  } catch (e) {
    console.warn('postToLog failed:', e.message);
    return false;
  }
}

function formatStock() {
  try {
    const items = listStorageItems();
    if (!items.length) return '✕ คลังว่างเปล่า (Empty)';
    return items.map((i) => `• **${i.name}** × ${i.quantity}`).join('\n');
  } catch {
    return '✕ ยังโหลดคลังไม่ได้';
  }
}

function formatRecentDeliveries(limit = 5) {
  try {
    const rows = getRecentDeliveries(limit);
    if (!rows?.length) return 'ยังไม่มีรายการส่งของ';
    return rows
      .map((r, i) => {
        const when = r.created_at || '';
        return (
          `**${i + 1}.** ${r.item_name} × ${r.quantity} → ${r.destination}\n` +
          ` โดย <@${r.user_id}> · ${when}`
        );
      })
      .join('\n');
  } catch {
    return 'ยังโหลดประวัติไม่ได้';
  }
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
        '• ระบบบันทึกแล้ว**ส่งเข้าห้องประวัติ-log** อัตโนมัติ',
        '',
        '**รายการล่าสุด**',
        formatRecentDeliveries(5),
        '',
        '*Safe delivery · Baby Grape System 🍇*',
      ].join('\n'),
    )
    .setFooter({ text: 'ข้อมูลประวัติอ่านจากระบบส่งของ' })
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('delivery_submit_btn')
      .setLabel('บันทึกการส่งของ')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📦'),
  );
  return { embeds: [embed], components: [row] };
}

function storagePanelLive() {
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
  const id = interaction.customId || '';

  try {
    if (interaction.isButton()) {
      if (
        id === 'delivery_submit_btn' ||
        id.startsWith('delivery_submit_') ||
        (id.includes('delivery') && id.includes('submit') && !id.includes('modal'))
      ) {
        const modal = new ModalBuilder()
          .setCustomId('delivery_submit_modal')
          .setTitle('บันทึกการส่งของ');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('item_name')
              .setLabel('ชื่อของ')
              .setStyle(TextInputStyle.Short)
              .setRequired(true),
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

      if (id === 'storage_withdraw_btn' || id === 'storage_withdraw' || id.includes('withdraw')) {
        const modal = new ModalBuilder()
          .setCustomId('storage_withdraw_modal')
          .setTitle('เบิกของจากคลัง');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('item_name')
              .setLabel('ชื่อของ')
              .setStyle(TextInputStyle.Short)
              .setRequired(true),
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

      if (
        id === 'storage_admin_btn' ||
        id === 'storage_admin' ||
        (id.includes('storage') && id.includes('admin'))
      ) {
        if (!isAdmin(interaction.member)) {
          return interaction.reply({
            content: '❌ เฉพาะแอดมิน',
            flags: MessageFlags.Ephemeral,
          });
        }
        const modal = new ModalBuilder()
          .setCustomId('storage_admin_modal')
          .setTitle('จัดการคลัง (Admin)');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('item_name')
              .setLabel('ชื่อของ')
              .setStyle(TextInputStyle.Short)
              .setRequired(true),
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

      if (id.startsWith('delivery_check_')) {
        const recent = formatRecentDeliveries(8);
        return interaction.reply({
          content: `📦 **ประวัติส่งของล่าสุด** (จากระบบ / ห้อง log)\n\n${recent}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (id.startsWith('delivery_manage_')) {
        if (!isAdmin(interaction.member)) {
          return interaction.reply({ content: '❌ เฉพาะแอดมิน', flags: MessageFlags.Ephemeral });
        }
        return interaction.reply({
          content: 'ดูรายการทั้งหมดได้ที่ห้อง **ประวัติ-log** — ระบบดึงจากบันทึกส่งของ',
          flags: MessageFlags.Ephemeral,
        });
      }

      return interaction.reply({
        content: 'ปุ่มนี้ยังไม่รองรับ — ให้แอดมินรัน `/setup` ส่งแผงใหม่',
        flags: MessageFlags.Ephemeral,
      });
    }

    // --- Modal: ส่งของ → บันทึก + โพสต์ห้อง log ---
    if (interaction.isModalSubmit() && id === 'delivery_submit_modal') {
      const item = interaction.fields.getTextInputValue('item_name').trim();
      const qty = parseInt(interaction.fields.getTextInputValue('quantity'), 10) || 1;
      const dest = interaction.fields.getTextInputValue('destination').trim();
      const proof = interaction.fields.getTextInputValue('proof_url').trim();
      const logId = createDelivery(interaction.user.id, item, qty, dest, proof);

      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('📦 บันทึกส่งของแล้ว')
        .setDescription('รายการนี้ถูกบันทึกและส่งเข้า **ประวัติ-log** แล้ว')
        .addFields(
          { name: 'ของ', value: item, inline: true },
          { name: 'จำนวน', value: String(qty), inline: true },
          { name: 'จุดส่ง', value: dest, inline: true },
          { name: 'โดย', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'หลักฐาน', value: proof },
        )
        .setFooter({ text: `Delivery #${logId} · จากห้องส่งของ` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

      const posted = await postToLog(interaction.client, { embeds: [embed] });
      if (!posted) {
        await interaction
          .followUp({
            content:
              '⚠️ บันทึกแล้ว แต่ยังส่งเข้าห้องประวัติ-log ไม่ได้ — รัน `/setup` เพื่อผูกห้อง',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }

      // อัปเดตแผงส่งของให้โชว์รายการล่าสุด
      try {
        if (interaction.message?.editable) {
          await interaction.message.edit(deliveryPanel());
        }
      } catch { /* ignore */ }
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
          content: `❌ ของไม่พอในคลัง (มี ${found ? found.quantity : 0})\nให้แอดมินกด **จัดการคลัง** เพิ่มของก่อน`,
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
      await postToLog(interaction.client, { embeds: [embed] });
      try {
        if (interaction.message?.editable) await interaction.message.edit(storagePanelLive());
      } catch { /* ignore */ }
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
      await postToLog(interaction.client, {
        embeds: [
          new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle('🛡️ อัปเดตคลัง (Admin)')
            .setDescription(`**${item}** = ${qty}`)
            .addFields({ name: 'โดย', value: `<@${interaction.user.id}>` })
            .setTimestamp(),
        ],
      });
      try {
        if (interaction.message?.editable) await interaction.message.edit(storagePanelLive());
      } catch { /* ignore */ }
      return;
    }

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'ไม่สามารถประมวลผลได้ — ลองแผงใหม่จาก `/setup`',
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (err) {
    console.error('logistics error:', err);
    try {
      const msg = {
        content: `ระบบคลัง/ส่งของผิดพลาด: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    } catch { /* ignore */ }
  }
}

module.exports = {
  isLogisticsInteraction,
  handleLogistics,
  deliveryPanel,
  storagePanelLive,
  formatStock,
  postToLog,
  resolveLogChannelId,
};
