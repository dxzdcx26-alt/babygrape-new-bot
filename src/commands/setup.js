const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const { setSetting } = require('../database');
const { isAdmin } = require('../utils/permissions');
const fs = require('fs');
const path = require('path');

/**
 * /setup — สร้างหมวด + ห้องตามโครงสร้าง Baby Grape System (ตามรูป)
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('สร้างหมวด/ห้อง Baby Grape System อัตโนมัติ (แอดมิน)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((opt) =>
      opt
        .setName('force')
        .setDescription('สร้างใหม่แม้มีชื่อห้องซ้ำแล้ว (default: ใช้ห้องที่มีอยู่)')
        .setRequired(false),
    ),

  async execute(interaction) {
    if (
      !isAdmin(interaction.member) &&
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        content: '❌ คำสั่งนี้สำหรับแอดมินเท่านั้นนะคับ',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) {
      return interaction.editReply({ content: 'ใช้คำสั่งนี้ในเซิร์ฟเวอร์เท่านั้น' });
    }

    const force = interaction.options.getBoolean('force') || false;
    const me = guild.members.me;
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.editReply({
        content:
          '❌ บอทไม่มีสิทธิ์ **Manage Channels** — ปรับยศบอทให้สูงขึ้นหรือให้สิทธิ์นี้ก่อน',
      });
    }

    const created = [];
    const reused = [];

    async function findOrCreateCategory(name) {
      let cat = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === name,
      );
      if (cat && !force) {
        reused.push(`หมวด ${name}`);
        return cat;
      }
      cat = await guild.channels.create({
        name,
        type: ChannelType.GuildCategory,
        reason: 'BabyGrape /setup',
      });
      created.push(`หมวด ${name}`);
      return cat;
    }

    async function findOrCreateText(name, parent, topic) {
      const existing = guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          c.name === name &&
          (!parent || c.parentId === parent.id),
      );
      if (existing) {
        reused.push(`#${name}`);
        return existing;
      }
      const ch = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: parent?.id,
        topic: topic || undefined,
        reason: 'BabyGrape /setup',
      });
      created.push(`#${name}`);
      return ch;
    }

    try {
      const archiveCat = await findOrCreateCategory('heist-archive');
      const systemCat = await findOrCreateCategory('🍇 BABY GRAPE SYSTEM');

      const control = await findOrCreateText(
        'ลงทะเบียนกิจกรรม',
        systemCat,
        'ปุ่ม Heist Report / ลงทะเบียนผลงาน',
      );
      const leaveCh = await findOrCreateText('แจ้งลา', systemCat, 'แจ้งลา /leave');
      const checkinCh = await findOrCreateText('เช็คชื่อ', systemCat, 'เช็คชื่อ /checkin');
      await findOrCreateText('ส่งของ', systemCat, 'ส่งของ');
      await findOrCreateText('คลังของแก๊ง', systemCat, 'คลังของแก๊ง');
      const score = await findOrCreateText(
        'ตารางคะแนน',
        systemCat,
        'กระดานคะแนน Weekly / Monthly',
      );
      await findOrCreateText('สรุปคนลา', systemCat, 'สรุปรายงานการลา');
      await findOrCreateText('สรุปเช็คชื่อ', systemCat, 'สรุปรายชื่อเช็คชื่อ');
      const log = await findOrCreateText('ประวัติ-log', systemCat, 'Log รายงาน Heist');

      let target = guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          (c.name === 'heist-chat' ||
            c.name === 'กิจกรรม-แชท' ||
            c.name === 'แชทกิจกรรม'),
      );
      if (!target) {
        target = await findOrCreateText(
          'heist-chat',
          systemCat,
          'ห้องแชทกิจกรรม — ถูกรีเซ็ตเข้ากรุทุก 3 วัน',
        );
      } else {
        reused.push(`#${target.name}`);
      }

      const mapping = {
        GUILD_ID: guild.id,
        CONTROL_CHANNEL_ID: control.id,
        LOG_CHANNEL_ID: log.id,
        SCORE_CHANNEL_ID: score.id,
        TARGET_CHANNEL_ID: target.id,
        ARCHIVE_CATEGORY_ID: archiveCat.id,
        LEAVE_CHANNEL_ID: leaveCh.id,
        CHECKIN_CHANNEL_ID: checkinCh.id,
      };

      for (const [key, value] of Object.entries(mapping)) {
        setSetting(key.toLowerCase(), value);
      }
      setSetting('target_channel_id', target.id);

      const envPath = path.join(process.cwd(), '.env');
      try {
        let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        for (const [key, value] of Object.entries(mapping)) {
          const re = new RegExp(`^${key}=.*$`, 'm');
          if (re.test(envText)) envText = envText.replace(re, `${key}=${value}`);
          else envText += `\n${key}=${value}`;
        }
        if (!process.env.ADMIN_ROLE_ID) {
          const topRole = interaction.member.roles.cache
            .filter((r) => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .first();
          if (topRole) {
            const re = /^ADMIN_ROLE_ID=.*$/m;
            if (re.test(envText)) envText = envText.replace(re, `ADMIN_ROLE_ID=${topRole.id}`);
            else envText += `\nADMIN_ROLE_ID=${topRole.id}`;
            mapping.ADMIN_ROLE_ID = topRole.id;
            setSetting('admin_role_id', topRole.id);
          }
        }
        fs.writeFileSync(envPath, envText.trim() + '\n', 'utf8');
      } catch (e) {
        console.warn('อัปเดต .env ไม่ได้:', e.message);
      }

      for (const [key, value] of Object.entries(mapping)) {
        process.env[key] = value;
      }

      const envBlock = Object.entries(mapping)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('✅ Setup Baby Grape System เสร็จแล้ว')
        .setDescription(
          [
            created.length
              ? `**สร้างใหม่:**\n${created.map((x) => `• ${x}`).join('\n')}`
              : null,
            reused.length
              ? `**ใช้ของเดิม:**\n${reused.map((x) => `• ${x}`).join('\n')}`
              : null,
            '',
            'ค่า ID ถูกบันทึกแล้ว — แนะนำรีสตาร์ทบอทหนึ่งครั้ง',
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .addFields({
          name: 'ตัวแปรที่ตั้งแล้ว',
          value: '```env\n' + envBlock.slice(0, 1000) + '\n```',
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('/setup failed:', err);
      await interaction.editReply({ content: `❌ Setup ล้มเหลว: ${err.message}` });
    }
  },
};
