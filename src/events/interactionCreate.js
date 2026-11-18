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

      if (
        interaction.isButton() &&
        interaction.customId.startsWith('checkin_join_')
      ) {
        const sessionId = parseInt(
          interaction.customId.replace('checkin_join_', ''),
          10,
        );
        const session = getOpenCheckinSession();
        if (!session || session.id !== sessionId) {
          return interaction.reply({
            content: 'รอบเช็คชื่อนี้ปิดแล้วหรือไม่ถูกต้อง',
            ephemeral: true,
          });
        }
        ensureUser(
          interaction.user.id,
          interaction.user.tag,
          interaction.member?.displayName,
        );
        const result = doCheckin(sessionId, interaction.user.id);
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
    } catch (error) {
      console.error('เกิดข้อผิดพลาดใน interactionCreate:', error);
      const payload = {
        content: 'เกิดข้อผิดพลาดขณะประมวลผลคำสั่ง กรุณาลองใหม่นะคับ',
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
