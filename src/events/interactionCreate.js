const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const {
  isHeistInteraction,
  handleHeistInteraction,
} = require('../interactions/heist');
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

      if (isHeistInteraction(interaction)) {
        await handleHeistInteraction(interaction);
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId === 'leave_request_modal') {
        await handleLeaveModal(interaction);
        return;
      }

      // --- ปุ่มจากแผง (ไม่ใช้ slash) ---
      if (interaction.isButton()) {
        const id = interaction.customId;

        // แจ้งลา → เปิด modal
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

        // เช็คชื่อ
        if (id === 'checkin_join_btn' || id.startsWith('checkin_join_')) {
          const session = getOpenCheckinSession();
          if (!session) {
            return interaction.reply({
              content: 'ตอนนี้ยังไม่มีรอบเช็คชื่อที่เปิดอยู่ — รอแอดมินเปิดรอบก่อน',
              ephemeral: true,
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
              ephemeral: true,
            });
          }
          return interaction.reply({
            content: `✅ เช็คชื่อสำเร็จ! รอบ **${session.name}**`,
            ephemeral: true,
          });
        }

        // ตัดยอดคะแนน
        if (id === 'weekly_reset_btn') {
          if (!isAdmin(interaction.member)) {
            return interaction.reply({
              content: '❌ เฉพาะแอดมิน',
              ephemeral: true,
            });
          }
          const cmd = interaction.client.commands.get('weekly_reset');
          if (cmd) return cmd.execute(interaction);
          return interaction.reply({ content: 'ไม่พบคำสั่ง weekly_reset', ephemeral: true });
        }

        // คลัง / แอดมิน — ยังเป็น stub บอกสถานะ
        if (
          id === 'storage_withdraw_btn' ||
          id === 'storage_admin_btn' ||
          id.startsWith('admin_')
        ) {
          return interaction.reply({
            content:
              'ระบบนี้กำลังเชื่อมต่อกับแผงปุ่ม — ฟีเจอร์คลัง/ตั้งค่าเต็มรูปแบบจะเปิดใช้ในรอบถัดไป\nตอนนี้ใช้ปุ่ม **เริ่มลงทะเบียน** / **แจ้งลา** / **เช็คชื่อ** ได้ก่อน',
            ephemeral: true,
          });
        }
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดใน interactionCreate:', error);
      const payload = {
        content: 'เกิดข้อผิดพลาดขณะประมวลผล กรุณาลองใหม่นะคับ',
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
