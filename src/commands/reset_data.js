const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const { db, setSetting } = require('../database');

/**
 * /reset_data — ล้างข้อมูลใน SQLite (คะแนน, log, คลัง, ลา, เช็คชื่อ)
 * ตัวเลือก keep_settings: เก็บ Channel ID จากการ setup ไว้
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset_data')
    .setDescription('ล้างข้อมูลเก่าในระบบ (แอดมินเท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((opt) =>
      opt
        .setName('confirm')
        .setDescription('ต้องเป็น true เพื่อยืนยันการลบ')
        .setRequired(true),
    )
    .addBooleanOption((opt) =>
      opt
        .setName('keep_settings')
        .setDescription('เก็บการตั้งค่าห้อง/ยศไว้ (default: true)')
        .setRequired(false),
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: '❌ คำสั่งนี้สำหรับแอดมินเท่านั้น',
        flags: MessageFlags.Ephemeral,
      });
    }

    const confirm = interaction.options.getBoolean('confirm');
    if (!confirm) {
      return interaction.reply({
        content:
          'ใส่ `confirm: True` เพื่อยืนยันการล้างข้อมูล\nตัวอย่าง: `/reset_data confirm:True`',
        flags: MessageFlags.Ephemeral,
      });
    }

    const keepSettings = interaction.options.getBoolean('keep_settings');
    const keep = keepSettings === null ? true : keepSettings;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const tables = [
      'score_history',
      'heist_reports',
      'checkins',
      'checkin_sessions',
      'leaves',
      'storage_logs',
      'delivery_logs',
      'storage_items',
      'leaderboard_messages',
      'audit_log',
    ];

    const cleared = [];
    const failed = [];

    try {
      db.exec('BEGIN');
      for (const t of tables) {
        try {
          db.exec(`DELETE FROM ${t}`);
          cleared.push(t);
        } catch (e) {
          failed.push(`${t}: ${e.message}`);
        }
      }

      // รีเซ็ตคะแนนผู้ใช้ แต่ไม่ลบ user id
      try {
        db.exec(
          `UPDATE users SET weekly_score = 0, monthly_score = 0, total_score = 0, updated_at = datetime('now')`,
        );
        cleared.push('users.scores');
      } catch (e) {
        failed.push(`users: ${e.message}`);
      }

      if (!keep) {
        try {
          db.exec('DELETE FROM settings');
          cleared.push('settings');
        } catch (e) {
          failed.push(`settings: ${e.message}`);
        }
      }

      db.exec('COMMIT');
    } catch (e) {
      try {
        db.exec('ROLLBACK');
      } catch {
        /* ignore */
      }
      return interaction.editReply({
        content: `❌ ล้างข้อมูลล้มเหลว: ${e.message}`,
      });
    }

    setSetting('last_data_reset', new Date().toISOString());
    setSetting('last_data_reset_by', interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('🗑️ ล้างข้อมูลเก่าเรียบร้อย')
      .setDescription(
        [
          keep
            ? 'เก็บ **settings / Channel ID** ไว้ — ห้องเดิมใช้ต่อได้'
            : 'ลบ **settings** ด้วย — ควรรัน `/setup` ใหม่',
          '',
          `ล้างแล้ว: ${cleared.length} รายการ`,
          failed.length ? `ผิดพลาด: ${failed.join(', ')}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .addFields({
        name: 'ตารางที่เคลียร์',
        value: cleared.map((x) => `• ${x}`).join('\n') || '—',
      })
      .setFooter({ text: `โดย ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    console.log(
      `🗑️ reset_data by ${interaction.user.tag} keep_settings=${keep} cleared=${cleared.join(',')}`,
    );
  },
};
