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
const { handleLeaveModal } = require('../commands/leave');
const {
  getOpenCheckinSession,
  doCheckin,
  ensureUser,
} = require('../database');
const { isAdmin } = require('../utils/permissions');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
          console.warn(`No handler for /${interaction.commandName}`);
          return;
        }
        await command.execute(interaction);
        return;
      }

      // แผงแอดมิน (ปุ่ม / select / modal)
      if (isAdminPanelInteraction(interaction)) {
        await handleAdminPanel(interaction);
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
        const id = interaction.customId;

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
          const cmd = interaction.client.commands.get('weekly_reset');
          if (cmd) return cmd.execute(interaction);
          return interaction.reply({
            content: 'ไม่พบคำสั่ง weekly_reset',
            flags: MessageFlags.Ephemeral,
          });
        }

        if (id === 'storage_withdraw_btn' || id === 'storage_admin_btn') {
          return interaction.reply({
            content:
              '📦 ระบบคลัง: ใช้เมนู **คลังแก๊ง** ในแผงแอดมิน หรือรออัปเดตรอบถัดไปสำหรับฟอร์มเบิกของเต็มรูปแบบ',
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดใน interactionCreate:', error);
      const payload = {
        content: 'เกิดข้อผิดพลาดขณะประมวลผล กรุณาลองใหม่นะคับ',
        flags: MessageFlags.Ephemeral,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
