const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

function rosterPanel(memberLines = []) {
  const list =
    memberLines.length > 0
      ? memberLines.slice(0, 40).join('\n')
      : '_ยังไม่มีรายชื่อ — กดปุ่มรีเฟรชเพื่อดึงรายชื่อจากเซิร์ฟ_';

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('👥 ‧ รายชื่อสมาชิก')
    .setDescription(
      [
        '╭ ꔫ ﹒ **Roster Zone**',
        '˙ ╰ ┈ รายชื่อสมาชิกในแก๊ง / เซิร์ฟเวอร์',
        '',
        list,
        '',
        '☁️ ⁺ ˖ Baby Grape System 🍇',
      ].join('\n'),
    )
    .setFooter({
      text: `ทั้งหมด ${memberLines.length} คน ‧ อัปเดตล่าสุด`,
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('roster_refresh_btn')
      .setLabel('รีเฟรชรายชื่อ')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔄'),
  );

  return { embeds: [embed], components: [row] };
}

async function buildMemberLines(guild) {
  try {
    await guild.members.fetch({ withPresences: false });
  } catch {
    /* cache only if no privileged intent */
  }

  const members = [...guild.members.cache.values()]
    .filter((m) => !m.user.bot)
    .sort((a, b) =>
      (a.displayName || a.user.username).localeCompare(
        b.displayName || b.user.username,
        'th',
      ),
    );

  return members.map((m, i) => {
    const name = m.displayName || m.user.username;
    return `\`${String(i + 1).padStart(2, '0')}\` · **${name}** · <@${m.id}>`;
  });
}

async function sendRosterPanel(channel, guild) {
  const lines = await buildMemberLines(guild);
  return channel.send(rosterPanel(lines));
}

async function handleRosterRefresh(interaction) {
  // ต้องตอบภายใน 3 วินาที — defer ก่อนค่อย fetch สมาชิก
  try {
    await interaction.deferUpdate();
  } catch (e) {
    console.warn('roster defer failed:', e.message);
    return;
  }

  try {
    const lines = await buildMemberLines(interaction.guild);
    await interaction.editReply(rosterPanel(lines));
  } catch (e) {
    console.error('roster refresh failed:', e.message);
    try {
      await interaction.followUp({
        content: 'รีเฟรชรายชื่อไม่สำเร็จ: ' + e.message,
        ephemeral: true,
      });
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  rosterPanel,
  buildMemberLines,
  sendRosterPanel,
  handleRosterRefresh,
};
