const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('ตรวจสอบ latency ของบอท'),

  async execute(interaction) {
    const sent = await interaction.reply({
      content: '🏓 Pinging...',
      fetchReply: true,
      ephemeral: true,
    });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    await interaction.editReply(
      `🏓 Pong!\nLatency: **${latency}ms** | API: **${apiLatency}ms**`,
    );
  },
};
