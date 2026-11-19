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
    content: `เกิดข้อผิดพลาด: ${err?.message || 'unknown'}\nลองใหม่ หรือให้แอดมินรัน /setup`,
    flags: MessageFlags.Ephemeral,
  };
  try {
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
    else if (interaction.isRepliable()) await interaction.reply(payload);
  } catch { /* ignore */ }
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

        // รองรับทั้งแผง mYgang และ baby grape เดิม
        if (id === 'leave_request_btn' || id === 'leave_open_modal') {
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

        if (id === 'checkin_join_btn' || id === 'checkin_start' || id.startsWith('checkin_join_')) {
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

        if (id === 'weekly_reset_btn' || id === 'leaderboard_reset') {
          if (!isAdmin(interaction.member)) {
            return interaction.reply({
              content: '❌ เฉพาะแอดมิน',
              flags: MessageFlags.Ephemeral,
            });
          }
          const { weeklyReset } = require('../database');
          const { updateScoreboard } = require('../services/scoreboard');
          weeklyReset(interaction.user.id);
          await updateScoreboard(interaction.client).catch(() => {});
          return interaction.reply({
            content: '✅ ตัดยอดคะแนนรายสัปดาห์แล้ว (โอนเข้า monthly)',
            flags: MessageFlags.Ephemeral,
          });
        }

        console.warn('Unhandled button:', id, 'by', interaction.user.tag);
        return interaction.reply({
          content:
            'ปุ่มนี้ยังไม่รองรับหรือเป็นแผงเก่า\n' +
            'ลองใช้ปุ่มจากข้อความของ **mYgang** หรือให้แอดมินรัน `/setup`',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu?.() ||
        interaction.isUserSelectMenu?.()
      ) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({
              content: 'การกระทำนี้ยังไม่รองรับ — รัน `/setup` ใหม่',
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
        }
      }
    } catch (error) {
      await safeError(interaction, error);
    }
  },
};
