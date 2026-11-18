const config = require('../config');

function isAdmin(member) {
  if (!member) return false;
  if (member.permissions?.has('Administrator')) return true;
  if (config.roles.admin && member.roles?.cache?.has(config.roles.admin)) {
    return true;
  }
  return false;
}

function requireAdmin(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: '❌ คำสั่งนี้สำหรับแอดมินเท่านั้นนะคับ',
      ephemeral: true,
    }).then(() => false).catch(() => false);
  }
  return Promise.resolve(true);
}

module.exports = { isAdmin, requireAdmin };
