const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const { setSetting } = require('../database');
const { sendAllPanels } = require('../panels/systemPanels');
const { isAdmin } = require('../utils/permissions');

/**
 * ชื่อห้องสไตล์ Baby Grape
 * ใช้ Unicode สัญลักษณ์ + จุดคั่น (Discord รองรับ)
 * หมายเหตุ: ภาษาไทยไม่มีฟอนต์พิเศษใน Unicode มากนัก จึงเน้นอิโมจิ + สัญลักษณ์ตกแต่ง
 */
const CHANNELS = {
  control: {
    name: '📝 ‧ ลงทะเบียนกิจกรรม',
    aliases: ['ลงทะเบียนกิจกรรม', 'ลงทะเบียน', '📝'],
    topic: '₊˚ ปุ่มลงทะเบียนกิจกรรม / Heist Report ‧₊˚',
  },
  leave: {
    name: '✈️ ‧ แจ้งลา',
    aliases: ['แจ้งลา', '✈️'],
    topic: '₊˚ ระบบแจ้งลา ‧₊˚',
  },
  checkin: {
    name: '📌 ‧ เช็คชื่อ',
    aliases: ['เช็คชื่อ', '📌'],
    topic: '₊˚ ระบบเช็คชื่อ ‧₊˚',
  },
  delivery: {
    name: '📦 ‧ ส่งของ',
    aliases: ['ส่งของ', '📦'],
    topic: '₊˚ ระบบส่งของ ‧₊˚',
  },
  storage: {
    name: '🏭 ‧ คลังของแก๊ง',
    aliases: ['คลังของแก๊ง', 'คลัง', '🏭'],
    topic: '₊˚ คลังของแก๊ง ‧₊˚',
  },
  score: {
    name: '📊 ‧ ตารางคะแนน',
    aliases: ['ตารางคะแนน', '📊'],
    topic: '₊˚ กระดานคะแนน Weekly / Monthly ‧₊˚',
  },
  leaveSummary: {
    name: '📋 ‧ สรุปคนลา',
    aliases: ['สรุปคนลา', '📋'],
    topic: '₊˚ สรุปรายงานการลา ‧₊˚',
  },
  checkinSummary: {
    name: '✅ ‧ สรุปเช็คชื่อ',
    aliases: ['สรุปเช็คชื่อ', '✅'],
    topic: '₊˚ สรุปรายชื่อเช็คชื่อ ‧₊˚',
  },
  log: {
    name: '📜 ‧ ประวัติ˗log',
    aliases: ['ประวัติ-log', 'ประวัติ', '📜'],
    topic: '₊˚ Log รายงานกิจกรรม ‧₊˚',
  },
  admin: {
    name: '🎛️ ‧ heist˗score',
    aliases: ['heist-score', 'heist˗score', '🎛️'],
    topic: '₊˚ แผงจัดการระบบ Baby Grape ‧₊˚',
  },
  chat: {
    name: '💬 ‧ heist˗chat',
    aliases: ['heist-chat', 'กิจกรรม-แชท', 'แชทกิจกรรม', '💬'],
    topic: '₊˚ แชทกิจกรรม — รีเซ็ตเข้ากรุทุก 3 วัน ‧₊˚',
  },
};

const CATEGORY_SYSTEM = '🍇 ‧ BABY GRAPE SYSTEM';
const CATEGORY_ARCHIVE = '🗄️ ‧ heist˗archive';

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
    )
    .addBooleanOption((opt) =>
      opt
        .setName('rename')
        .setDescription('เปลี่ยนชื่อห้องเดิมให้สวยขึ้น (default: เปิด)')
        .setRequired(false),
    ),

  async execute(interaction) {
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
    const renameOpt = interaction.options.getBoolean('rename');
    const shouldRename = renameOpt === null || renameOpt === true;

    const created = [];
    const reused = [];
    const renamed = [];

    async function findOrCreateCategory(name, aliases = []) {
      let cat = guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildCategory &&
          (c.name === name || aliases.some((a) => c.name.includes(a))),
      );
      if (cat && !force) {
        if (shouldRename && cat.name !== name) {
          try {
            await cat.setName(name, 'BabyGrape rename');
            renamed.push(`หมวด → ${name}`);
          } catch (e) {
            console.warn('rename category failed', e.message);
          }
        }
        reused.push(`หมวด ${cat.name}`);
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

    async function findOrCreateText(def, parent) {
      const { name, aliases = [], topic } = def;
      let existing = guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          (c.name === name ||
            aliases.some((a) => c.name === a || c.name.includes(a))) &&
          (!parent || c.parentId === parent.id || !c.parentId),
      );
      if (!existing) {
        existing = guild.channels.cache.find(
          (c) =>
            c.type === ChannelType.GuildText &&
            (c.name === name || aliases.some((a) => c.name === a || c.name.includes(a))),
        );
      }

      if (existing && !force) {
        if (shouldRename && existing.name !== name) {
          try {
            await existing.setName(name, 'BabyGrape pretty name');
            renamed.push(`→ ${name}`);
          } catch (e) {
            console.warn('rename failed', e.message);
          }
        }
        if (parent && existing.parentId !== parent.id) {
          try {
            await existing.setParent(parent.id, { reason: 'BabyGrape setup' });
          } catch {
            /* ignore */
          }
        }
        if (topic && existing.topic !== topic) {
          try {
            await existing.setTopic(topic);
          } catch {
            /* ignore */
          }
        }
        reused.push(`#${existing.name}`);
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
      const archiveCat = await findOrCreateCategory(CATEGORY_ARCHIVE, [
        'heist-archive',
        'heist˗archive',
        'archive',
      ]);
      const systemCat = await findOrCreateCategory(CATEGORY_SYSTEM, [
        'BABY GRAPE',
        'Baby Grape',
      ]);

      const control = await findOrCreateText(CHANNELS.control, systemCat);
      const leaveCh = await findOrCreateText(CHANNELS.leave, systemCat);
      const checkinCh = await findOrCreateText(CHANNELS.checkin, systemCat);
      await findOrCreateText(CHANNELS.delivery, systemCat);
      const storageCh = await findOrCreateText(CHANNELS.storage, systemCat);
      const score = await findOrCreateText(CHANNELS.score, systemCat);
      await findOrCreateText(CHANNELS.leaveSummary, systemCat);
      await findOrCreateText(CHANNELS.checkinSummary, systemCat);
      const log = await findOrCreateText(CHANNELS.log, systemCat);
      const adminCh = await findOrCreateText(CHANNELS.admin, systemCat);
      const target = await findOrCreateText(CHANNELS.chat, systemCat);

      const mapping = {
        GUILD_ID: guild.id,
        CONTROL_CHANNEL_ID: control.id,
        LOG_CHANNEL_ID: log.id,
        SCORE_CHANNEL_ID: score.id,
        TARGET_CHANNEL_ID: target.id,
        ARCHIVE_CATEGORY_ID: archiveCat.id,
        LEAVE_CHANNEL_ID: leaveCh.id,
        CHECKIN_CHANNEL_ID: checkinCh.id,
        ADMIN_CHANNEL_ID: adminCh.id,
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
        admin: adminCh,
      });

      const envBlock = Object.entries(mapping)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle('✨ Setup เสร็จ — ห้องสวยพร้อมแผงแล้ว')
        .setDescription(
          [
            created.length
              ? `**สร้างใหม่**\n${created.map((x) => `✦ ${x}`).join('\n')}`
              : null,
            renamed.length
              ? `**เปลี่ยนชื่อ**\n${renamed.map((x) => `✧ ${x}`).join('\n')}`
              : null,
            reused.length && !renamed.length
              ? `**ใช้ของเดิม**\n${reused.map((x) => `• ${x}`).join('\n')}`
              : null,
            '',
            '₊˚ แผงจัดการอยู่ที่ **🎛️ ‧ heist˗score** ‧₊˚',
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .addFields(
          {
            name: '‧ แผงที่ส่งแล้ว',
            value:
              (panelResults || [])
                .slice(0, 12)
                .map((x) => `• ${x}`)
                .join('\n') || '—',
          },
          {
            name: '‧ Channel IDs',
            value: '```env\n' + envBlock.slice(0, 900) + '\n```',
          },
        )
        .setFooter({ text: 'Baby Grape System ‧ setup' })
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
