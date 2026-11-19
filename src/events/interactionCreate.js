const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');
const {
  isHeistInteraction,
  handleHeistInteraction,
} = require('../interactions/heist');
const {
  isAdminPanelInteraction,
  handleAdminPanel,
} = require('../interactions/adminPanel');
const {
  isLogisticsInteraction,
  handleLogistics,
} = require('../interactions/logistics');
const { handleLeaveModal } = require('../commands/leave');
const { handleRosterRefresh } = require('../panels/rosterPanel');
const {
  getOpenCheckinSession,
  doCheckin,
  ensureUser,
} = require('../database');
const { isAdmin } = require('../utils/permissions');

async function safeError(interaction, err) {
  console.error('interaction error:', err?.message || err);
  const payload = {
    content: `เกิดข้อผิดพลาด: ${err?.message || 'unknown'}\nลองกดใหม่ หรือให้แอดมินรัน /setup เพื่อส่งแผงใหม่`,
    flags: MessageFlags.Ephemeral,
  };
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else if (interaction.isRepliable()) {
      await interaction.reply(payload);
    }
  } catch {
    /* ignore */
  }
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
          return interaction
            .reply({
              content: 'คำสั่งนี้ปิดใช้งานแล้ว — ใช้แผงปุ่มหรือ `/setup`',
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
        }
        await command.execute(interaction);
        return;
      }

      if (isAdminPanelInteraction(interaction)) {
        await handleAdminPanel(interaction);
        return;
      }

      if (isLogisticsInteraction(interaction)) {
        await handleLogistics(interaction);
        return;
      }

      if (isHeistInteraction(interaction)) {
        await handleHeistInteraction(interaction);
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId === 'leave_request_modal') {
        await handleLeaveModal(interaction);
        return;
      }

      if (interaction.isButton()) {
        const id = interaction.customId || '';

        if (id === 'roster_refresh_btn') {
          return handleRosterRefresh(interaction);
        }

        if (id === 'leave_request_btn') {
          const modal = new ModalBuilder()
            .setCustomId('leave_request_modal')
            .setTitle('แจ้งลา');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('leave_date')
                .setLabel('วันที่ลา (เช่น 20/11/2026)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('leave_type')
                .setLabel('ประเภท (ป่วย / ธุระ / อื่นๆ)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('leave_reason')
                .setLabel('เหตุผลสั้น ๆ')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true),
            ),
          );
          return interaction.showModal(modal);
        }

        if (id === 'checkin_join_btn' || id.startsWith('checkin_join_')) {
          const session = getOpenCheckinSession();
          if (!session) {
            return interaction.reply({
              content: 'ตอนนี้ยังไม่มีรอบเช็คชื่อที่เปิดอยู่ — รอแอดมินเปิดรอบก่อน',
              flags: MessageFlags.Ephemeral,
            });
          }
          ensureUser(
            interaction.user.id,
            interaction.user.tag,
            interaction.member?.displayName,
          );
          const result = doCheckin(session.id, interaction.user.id);
          if (!result.success) {
            return interaction.reply({
              content: 'คุณเช็คชื่อไปแล้วในรอบนี้ ✅',
              flags: MessageFlags.Ephemeral,
            });
          }
          return interaction.reply({
            content: `✅ เช็คชื่อสำเร็จ! รอบ **${session.name}**`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (id === 'weekly_reset_btn') {
          if (!isAdmin(interaction.member)) {
            return interaction.reply({
              content: '❌ เฉพาะแอดมิน',
              flags: MessageFlags.Ephemeral,
            });
          }
          return interaction.reply({
            content:
              'ตัดยอดคะแนน: ใช้ปุ่มในห้องตารางคะแนนหลัง setup หรือรออัปเดต\n(คำสั่ง /weekly_reset ถูกปิดแล้ว — เหลือแค่ /setup)',
            flags: MessageFlags.Ephemeral,
          });
        }

        // ปุ่มจากแผงเก่า / ไม่รู้จัก → ต้องตอบเสมอ ไม่งั้นขึ้น 404
        console.warn('Unhandled button:', id, 'by', interaction.user.tag);
        return interaction.reply({
          content:
            'ปุ่มนี้จาก**แผงเก่า**หรือยังไม่รองรับ\n' +
            'ให้แอดมินรัน `/setup` เพื่อส่งแผงใหม่ แล้วใช้ปุ่มจากข้อความล่าสุด',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.isModalSubmit() || interaction.isAnySelectMenu?.() || interaction.isStringSelectMenu?.()) {
        console.warn('Unhandled interaction:', interaction.customId);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'การกระทำนี้ยังไม่รองรับ หรือแผงเก่าเกินไป — รัน `/setup` ใหม่',
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
      }
    } catch (error) {
      await safeError(interaction, error);
    }
  },
};
