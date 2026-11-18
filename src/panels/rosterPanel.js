const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

/** แผงรายชื่อสมาชิก */
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

/** ดึงรายชื่อจาก guild (พยายาม fetch) */
async function buildMemberLines(guild) {
  try {
    await guild.members.fetch({ withPresences: false }).catch(() => null);
  } catch {
    /* ไม่มี Privileged Intent ก็ใช้ cache */
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
  const lines = await buildMemberLines(interaction.guild);
  const payload = rosterPanel(lines);
  if (interaction.message && interaction.message.editable) {
    await interaction.update(payload);
  } else {
    await interaction.reply({ ...payload, ephemeral: true });
  }
}

module.exports = {
  rosterPanel,
  buildMemberLines,
  sendRosterPanel,
  handleRosterRefresh,
};
