const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const { setSetting } = require('../database');
const { sendAllPanels } = require('../panels/systemPanels');
const { isAdmin, hasAdministrator } = require('../utils/permissions');

/**
 * /setup — คำสั่งหลักเพียงตัวเดียว
 * สร้างหมวด/ห้อง + วางแผงปุ่มทุกห้อง
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('สร้างห้อง + แผงปุ่ม Baby Grape System (แอดมิน)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((opt) =>
      opt
        .setName('force')
        .setDescription('สร้างใหม่แม้มีชื่อห้องซ้ำแล้ว')
        .setRequired(false),
    ),

  async execute(interaction) {
    // ใช้ isAdmin อย่างเดียว — อย่าเรียก member.permissions.has โดยตรง
    // (เมื่อไม่มี Server Members Intent permissions เป็น string)
    if (!isAdmin(interaction.member)) {
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
    if (me && !hasAdministrator(me) && !me.permissions?.has?.(PermissionFlagsBits.ManageChannels)) {
      // ถ้าบอทไม่มี Manage Channels
      const canManage =
        me.permissions?.has?.(PermissionFlagsBits.ManageChannels) ||
        (me.permissions &&
          (() => {
            try {
              return new (require('discord.js').PermissionsBitField)(
                BigInt(me.permissions),
              ).has(PermissionFlagsBits.ManageChannels);
            } catch {
              return false;
            }
          })());
      if (!canManage) {
        return interaction.editReply({
          content:
            '❌ บอทไม่มีสิทธิ์ **Manage Channels** — ปรับยศบอทให้สูงขึ้นก่อน',
        });
      }
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
        'ปุ่มลงทะเบียนกิจกรรม',
      );
      const leaveCh = await findOrCreateText('แจ้งลา', systemCat, 'แจ้งลา');
      const checkinCh = await findOrCreateText('เช็คชื่อ', systemCat, 'เช็คชื่อ');
      await findOrCreateText('ส่งของ', systemCat, 'ส่งของ');
      const storageCh = await findOrCreateText('คลังของแก๊ง', systemCat, 'คลังของแก๊ง');
      const score = await findOrCreateText('ตารางคะแนน', systemCat, 'กระดานคะแนน');
      await findOrCreateText('สรุปคนลา', systemCat, 'สรุปรายงานการลา');
      await findOrCreateText('สรุปเช็คชื่อ', systemCat, 'สรุปรายชื่อเช็คชื่อ');
      const log = await findOrCreateText('ประวัติ-log', systemCat, 'Log');

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
          'ห้องแชทกิจกรรม — รีเซ็ตเข้ากรุทุก 3 วัน',
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
        process.env[key] = value;
      }

      const panelResults = await sendAllPanels(guild, {
        control,
        leave: leaveCh,
        checkin: checkinCh,
        storage: storageCh,
        score,
        log,
      });

      const envBlock = Object.entries(mapping)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('✅ Setup เสร็จ — ใช้ปุ่มในห้องได้เลย')
        .setDescription(
          [
            created.length
              ? `**สร้างใหม่:**\n${created.map((x) => `• ${x}`).join('\n')}`
              : null,
            reused.length
              ? `**ใช้ของเดิม:**\n${reused.map((x) => `• ${x}`).join('\n')}`
              : null,
            '',
            'คำสั่งหลักมีแค่ **/setup** — ที่เหลือกดปุ่มในแผง',
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .addFields(
          {
            name: 'แผงที่ส่งแล้ว',
            value:
              (panelResults || [])
                .slice(0, 10)
                .map((x) => `• ${x}`)
                .join('\n') || '—',
          },
          {
            name: 'Channel IDs',
            value: '```env\n' + envBlock.slice(0, 900) + '\n```',
          },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('/setup failed:', err);
      await interaction.editReply({
        content: `❌ Setup ล้มเหลว: ${err.message}`,
      });
    }
  },
};
