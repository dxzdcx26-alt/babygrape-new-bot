const { PermissionsBitField } = require('discord.js');
const config = require('../config');

/**
 * interaction.member อาจเป็น GuildMember (มี PermissionsBitField)
 * หรือ APIInteractionGuildMember (permissions เป็น string bitfield)
 * เมื่อไม่ได้เปิด Server Members Intent
 */
function hasAdministrator(member) {
  if (!member) return false;
  const perms = member.permissions;
  if (perms == null) return false;

  try {
    if (typeof perms.has === 'function') {
      return (
        perms.has(PermissionsBitField.Flags.Administrator) ||
        perms.has('Administrator')
      );
    }
    // string / bigint bitfield จาก raw API
    return new PermissionsBitField(BigInt(perms)).has(
      PermissionsBitField.Flags.Administrator,
    );
  } catch {
    return false;
  }
}

function isAdmin(member) {
  if (!member) return false;
  if (hasAdministrator(member)) return true;

  const adminRole = config.roles?.admin;
  if (adminRole) {
    // GuildMember
    if (member.roles?.cache?.has?.(adminRole)) return true;
    // API member: roles เป็น array ของ role id
    if (Array.isArray(member.roles) && member.roles.includes(adminRole)) {
      return true;
    }
  }
  return false;
}

async function requireAdmin(interaction) {
  if (!isAdmin(interaction.member)) {
    try {
      await interaction.reply({
        content: '❌ คำสั่งนี้สำหรับแอดมินเท่านั้นนะคับ',
        ephemeral: true,
      });
    } catch {
      /* ignore */
    }
    return false;
  }
  return true;
}

module.exports = { isAdmin, requireAdmin, hasAdministrator };
