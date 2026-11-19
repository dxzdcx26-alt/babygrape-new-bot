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
  setSetting,
} = require('../database');
const { isAdmin } = require('../utils/permissions');
const config = require('../config');

const pendingDeliveryProof = new Map();
const pendingWithdrawProof = new Map();

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

async function findLogChannel(client, guild) {
  const id = resolveLogChannelId();
  if (id) {
    const ch = await client.channels.fetch(id).catch(() => null);
    if (ch) return ch;
  }
  if (guild) {
    await guild.channels.fetch().catch(() => null);
    const found = guild.channels.cache.find(
      (c) =>
        c.isTextBased?.() &&
        (c.name.includes('ประวัติ') || c.name.includes('log') || c.name.includes('˗log')),
    );
    if (found) {
      process.env.LOG_CHANNEL_ID = found.id;
      try {
        setSetting('log_channel_id', found.id);
      } catch { /* ignore */ }
      return found;
    }
  }
  return null;
}

async function postToLog(client, payload, guild = null) {
  try {
    const ch = await findLogChannel(client, guild);
    if (!ch) {
      console.warn('ไม่พบห้องประวัติ-log — รัน /setup');
      return false;
    }
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
        return `**${i + 1}.** ${r.item_name} × ${r.quantity} → ${r.destination}\n โดย <@${r.user_id}> · ${when}`;
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
        '**วิธีใช้**',
        '1. กดปุ่มด้านล่าง',
        '2. กรอก **ชนิดของ** / **จำนวน** / **จุดส่ง/ผู้รับ**',
        '3. **ส่งรูป snap** ในห้องนี้ภายใน 60 วินาที',
        '4. ระบบบันทึกเข้า **ประวัติ-log**',
        '',
        '**รายการล่าสุด**',
        formatRecentDeliveries(5),
        '',
        '*Safe delivery · Baby Grape System 🍇*',
      ].join('\n'),
    )
    .setFooter({ text: 'หลักฐาน = รูปจาก snap / แคปหน้าจอ' })
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
        '• กด "เบิกของ" → กรอกชนิดของ / จำนวน → ส่งรูป snap',
        '• แอดมินใช้ "จัดการคลัง" เพื่อตั้งยอด',
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

function startImageCollector(client, userId, channelId, onImage, onTimeout) {
  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    onTimeout();
    return;
  }
  const filter = (m) =>
    m.author.id === userId &&
    m.attachments.size > 0 &&
    [...m.attachments.values()].some(
      (a) =>
        (a.contentType || '').startsWith('image/') ||
        /\.(png|jpe?g|gif|webp)$/i.test(a.name || a.url),
    );

  const collector = channel.createMessageCollector({ filter, max: 1, time: 60_000 });
  collector.on('collect', async (m) => {
    const att = [...m.attachments.values()].find(
      (a) =>
        (a.contentType || '').startsWith('image/') ||
        /\.(png|jpe?g|gif|webp)$/i.test(a.name || a.url),
    );
    if (att) await onImage(att.url, m);
  });
  collector.on('end', async (collected) => {
    if (collected.size === 0) await onTimeout();
  });
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
              .setLabel('ชนิดของ / ชื่อของ')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('เช่น อาวุธ, ยา, กล่อง'),
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
              .setRequired(true)
              .setPlaceholder('เช่น โกดัง A / @ชื่อคนรับ'),
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
              .setLabel('ชนิดของ / ชื่อของ')
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
              .setLabel('ชนิดของ / ชื่อของ')
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

      return interaction.reply({
        content: 'ปุ่มนี้ยังไม่รองรับ — รัน `/setup` ส่งแผงใหม่',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.isModalSubmit() && id === 'delivery_submit_modal') {
      const item = interaction.fields.getTextInputValue('item_name').trim();
      const qty = parseInt(interaction.fields.getTextInputValue('quantity'), 10) || 1;
      const dest = interaction.fields.getTextInputValue('destination').trim();
      const userId = interaction.user.id;
      const channelId = interaction.channelId;

      if (!dest) {
        return interaction.reply({
          content: 'กรุณากรอก **จุดส่ง / ผู้รับ**',
          flags: MessageFlags.Ephemeral,
        });
      }

      pendingDeliveryProof.set(userId, { item, qty, dest, channelId, at: Date.now() });

      await interaction.reply({
        content:
          `📦 ข้อมูล: **${item}** × **${qty}** → **${dest}**\n\n` +
          `ต่อไป **อัปโหลดรูป snap** ในห้องนี้ภายใน **60 วินาที**\n` +
          `(แนบรูปอย่างเดียวก็ได้)`,
        flags: MessageFlags.Ephemeral,
      });

      startImageCollector(
        interaction.client,
        userId,
        channelId,
        async (imageUrl, msg) => {
          pendingDeliveryProof.delete(userId);
          const logId = createDelivery(userId, item, qty, dest, imageUrl);
          const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle('📦 บันทึกส่งของแล้ว')
            .setDescription('จากห้องส่งของ · หลักฐานจากรูป snap')
            .addFields(
              { name: 'ชนิดของ', value: item, inline: true },
              { name: 'จำนวน', value: String(qty), inline: true },
              { name: 'จุดส่ง / ผู้รับ', value: dest, inline: true },
              { name: 'โดย', value: `<@${userId}>`, inline: true },
            )
            .setImage(imageUrl)
            .setFooter({ text: `Delivery #${logId}` })
            .setTimestamp();

          await postToLog(interaction.client, { embeds: [embed] }, interaction.guild);
          await msg.reply({ embeds: [embed] }).catch(() => {});
          try {
            if (interaction.message?.editable) await interaction.message.edit(deliveryPanel());
          } catch { /* ignore */ }
        },
        async () => {
          if (pendingDeliveryProof.has(userId)) {
            pendingDeliveryProof.delete(userId);
            const ch = await interaction.client.channels.fetch(channelId).catch(() => null);
            if (ch) {
              await ch
                .send(
                  `<@${userId}> หมดเวลา 60 วินาที — ไม่ได้รับรูปหลักฐาน ส่งของยังไม่ถูกบันทึก`,
                )
                .catch(() => {});
            }
          }
        },
      );
      return;
    }

    if (interaction.isModalSubmit() && id === 'storage_withdraw_modal') {
      const item = interaction.fields.getTextInputValue('item_name').trim();
      const qty = Math.abs(parseInt(interaction.fields.getTextInputValue('quantity'), 10) || 1);
      const items = listStorageItems();
      const found = items.find((i) => i.name.toLowerCase() === item.toLowerCase());
      if (!found || found.quantity < qty) {
        return interaction.reply({
          content: `❌ ของไม่พอในคลัง (มี ${found ? found.quantity : 0})`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const userId = interaction.user.id;
      const channelId = interaction.channelId;
      pendingWithdrawProof.set(userId, { item: found.name, qty, channelId });

      await interaction.reply({
        content: `📥 เบิก **${found.name}** × **${qty}**\nอัปโหลด**รูป snap** ภายใน 60 วินาที`,
        flags: MessageFlags.Ephemeral,
      });

      startImageCollector(
        interaction.client,
        userId,
        channelId,
        async (imageUrl, msg) => {
          pendingWithdrawProof.delete(userId);
          upsertStorageItem(found.name, -qty);
          logStorageAction(found.name, 'withdraw', qty, userId, imageUrl);
          const embed = new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle('📥 เบิกของแล้ว')
            .setDescription(`**${found.name}** × ${qty}\nเหลือ: **${found.quantity - qty}**`)
            .addFields({ name: 'โดย', value: `<@${userId}>` })
            .setImage(imageUrl)
            .setTimestamp();
          await postToLog(interaction.client, { embeds: [embed] }, interaction.guild);
          await msg.reply({ embeds: [embed] }).catch(() => {});
          try {
            if (interaction.message?.editable) await interaction.message.edit(storagePanelLive());
          } catch { /* ignore */ }
        },
        async () => {
          if (pendingWithdrawProof.has(userId)) {
            pendingWithdrawProof.delete(userId);
            const ch = await interaction.client.channels.fetch(channelId).catch(() => null);
            if (ch) await ch.send(`<@${userId}> หมดเวลา — ยกเลิกการเบิก`).catch(() => {});
          }
        },
      );
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
      await postToLog(
        interaction.client,
        {
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle('🛡️ อัปเดตคลัง (Admin)')
              .setDescription(`**${item}** = ${qty}`)
              .addFields({ name: 'โดย', value: `<@${interaction.user.id}>` })
              .setTimestamp(),
          ],
        },
        interaction.guild,
      );
      try {
        if (interaction.message?.editable) await interaction.message.edit(storagePanelLive());
      } catch { /* ignore */ }
      return;
    }

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'ไม่สามารถประมวลผลได้ — ลอง `/setup`',
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
