const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
  PermissionsBitField,
} = require('discord.js');
const { setSetting } = require('../database');
const { sendAllPanels } = require('../panels/systemPanels');
const { sendRosterPanel } = require('../panels/rosterPanel');
const { isAdmin } = require('../utils/permissions');
const config = require('../config');

const INVITE_URL =
  'https://discord.com/api/oauth2/authorize?client_id=1572394577724317788&permissions=8&scope=bot%20applications.commands';

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
  roster: {
    name: '👥 ‧ รายชื่อ',
    aliases: ['รายชื่อ', 'roster', 'members', '👥'],
    topic: '₊˚ รายชื่อสมาชิกแก๊ง ‧₊˚',
  },
  log: {
    name: '📜 ‧ ประวัติ˗log',
    aliases: ['ประวัติ-log', 'ประวัติ', '📜'],
    topic: '₊˚ Log รายงานกิจกรรม ‧₊˚',
  },
};

const CATEGORY_SYSTEM = '🍇 ‧ BABY GRAPE SYSTEM';
const CATEGORY_ARCHIVE = '🗄️ ‧ heist˗archive';

const ROLE_PERMS = {
  admin: new PermissionsBitField([PermissionFlagsBits.Administrator]),
  helper: new PermissionsBitField([
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.UseExternalEmojis,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageNicknames,
    PermissionFlagsBits.MuteMembers,
    PermissionFlagsBits.MoveMembers,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
  ]),
  member: new PermissionsBitField([
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.UseExternalEmojis,
    PermissionFlagsBits.UseApplicationCommands,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
  ]),
};

const ROLES = [
  {
    key: 'admin',
    name: '🍇 ‧ BG Admin',
    aliases: ['BG Admin', 'Baby Grape Admin'],
    color: Colors.Purple,
    hoist: true,
    permissions: ROLE_PERMS.admin,
  },
  {
    key: 'helper',
    name: '🛠️ ‧ BG Helper',
    aliases: ['BG Helper', 'Helper'],
    color: Colors.Blue,
    hoist: true,
    permissions: ROLE_PERMS.helper,
  },
  {
    key: 'member',
    name: '👤 ‧ BG Member',
    aliases: ['BG Member', 'Member'],
    color: Colors.Green,
    hoist: false,
    permissions: ROLE_PERMS.member,
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('สร้างห้อง + ยศ + สิทธิ์ + แผงปุ่ม Baby Grape System')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((opt) =>
      opt.setName('force').setDescription('สร้างใหม่แม้มีชื่อซ้ำแล้ว').setRequired(false),
    )
    .addBooleanOption((opt) =>
      opt.setName('rename').setDescription('เปลี่ยนชื่อห้อง/ยศเดิมให้สวยขึ้น').setRequired(false),
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: '❌ คำสั่งนี้สำหรับแอดมินเท่านั้นนะคับ',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    let guild = interaction.guild;
    if (!guild && interaction.guildId) {
      try {
        guild = await interaction.client.guilds.fetch(interaction.guildId);
      } catch (e) {
        console.warn('fetch guild failed:', e.message);
      }
    }
    if (!guild) {
      return interaction.editReply({
        content:
          '❌ **บอทยังไม่ได้อยู่ในเซิร์ฟนี้** หรือใช้คำสั่งนอกเซิร์ฟ\n\n' +
          '1. กดลิงก์เชิญด้านล่าง (สิทธิ์ Administrator)\n' +
          '2. เลือกเซิร์ฟนี้ → Authorize\n' +
          '3. กลับมาพิมพ์ `/setup` อีกครั้ง\n\n' +
          '🔗 **เชิญบอท:**\n' +
          INVITE_URL,
      });
    }

    const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (me && !me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.editReply({
        content:
          '❌ บอทยังไม่มีสิทธิ์ **Manage Channels**\n\n' +
          'เชิญบอทใหม่ด้วยสิทธิ์ Administrator แล้วลอง `/setup` อีกครั้ง\n\n' +
          '🔗 **เชิญบอท:**\n' +
          INVITE_URL,
      });
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
          (c.name === name || aliases.some((a) => c.name === a || c.name.includes(a))) &&
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
          } catch { /* ignore */ }
        }
        if (topic && existing.topic !== topic) {
          try {
            await existing.setTopic(topic);
          } catch { /* ignore */ }
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

    async function findOrCreateRole(def) {
      const { name, aliases = [], color, hoist, permissions } = def;
      let role = guild.roles.cache.find(
        (r) =>
          !r.managed &&
          (r.name === name || aliases.some((a) => r.name === a || r.name.includes(a))),
      );
      if (role && !force) {
        if (shouldRename && role.name !== name && role.editable) {
          try {
            await role.setName(name, 'BabyGrape role rename');
            renamed.push(`ยศ → ${name}`);
          } catch (e) {
            console.warn('rename role failed', e.message);
          }
        }
        if (role.editable && permissions) {
          try {
            await role.setPermissions(permissions, 'BabyGrape role permissions');
          } catch (e) {
            console.warn('setPermissions failed', role.name, e.message);
          }
        }
        reused.push(`@${role.name}`);
        return role;
      }
      role = await guild.roles.create({
        name,
        color,
        hoist: !!hoist,
        mentionable: false,
        permissions: permissions || 0n,
        reason: 'BabyGrape /setup',
      });
      created.push(`@${name}`);
      return role;
    }

    try {
      await guild.channels.fetch().catch(() => null);
      await guild.roles.fetch().catch(() => null);

      let adminRole = null;
      let helperRole = null;
      let memberRole = null;
      if (me && !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        created.push('(ข้ามสร้างยศ — บอทไม่มี Manage Roles)');
      } else {
        try {
          adminRole = await findOrCreateRole(ROLES[0]);
          helperRole = await findOrCreateRole(ROLES[1]);
          memberRole = await findOrCreateRole(ROLES[2]);
        } catch (e) {
          console.warn('role setup failed:', e.message);
          created.push(`(สร้างยศไม่สำเร็จ: ${e.message})`);
        }
      }

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
      const deliveryCh = await findOrCreateText(CHANNELS.delivery, systemCat);
      const storageCh = await findOrCreateText(CHANNELS.storage, systemCat);
      const score = await findOrCreateText(CHANNELS.score, systemCat);
      await findOrCreateText(CHANNELS.leaveSummary, systemCat);
      await findOrCreateText(CHANNELS.checkinSummary, systemCat);
      const rosterCh = await findOrCreateText(CHANNELS.roster, systemCat);
      const log = await findOrCreateText(CHANNELS.log, systemCat);
      // ไม่สร้าง heist-score / heist-chat
      const adminCh = null;
      const target = null;

      // จำกัดห้อง log: แอดมิน/helper + บอท
      if (log && adminRole) {
        try {
          await log.permissionOverwrites.set([
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            {
              id: adminRole.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
            ...(helperRole
              ? [
                  {
                    id: helperRole.id,
                    allow: [
                      PermissionFlagsBits.ViewChannel,
                      PermissionFlagsBits.ReadMessageHistory,
                    ],
                  },
                ]
              : []),
            ...(me
              ? [
                  {
                    id: me.id,
                    allow: [
                      PermissionFlagsBits.ViewChannel,
                      PermissionFlagsBits.SendMessages,
                      PermissionFlagsBits.EmbedLinks,
                      PermissionFlagsBits.ManageMessages,
                    ],
                  },
                ]
              : []),
          ]);
        } catch (e) {
          console.warn('log overwrite failed', e.message);
        }
      }

      const mapping = {
        GUILD_ID: guild.id,
        CONTROL_CHANNEL_ID: control.id,
        LOG_CHANNEL_ID: log.id,
        SCORE_CHANNEL_ID: score.id,
        ARCHIVE_CATEGORY_ID: archiveCat.id,
        LEAVE_CHANNEL_ID: leaveCh.id,
        CHECKIN_CHANNEL_ID: checkinCh.id,
        ROSTER_CHANNEL_ID: rosterCh.id,
        DELIVERY_CHANNEL_ID: deliveryCh.id,
        STORAGE_CHANNEL_ID: storageCh.id,
      };
      if (adminRole) mapping.ADMIN_ROLE_ID = adminRole.id;
      if (helperRole) mapping.HELPER_ROLE_ID = helperRole.id;
      if (memberRole) mapping.MEMBER_ROLE_ID = memberRole.id;

      for (const [key, value] of Object.entries(mapping)) {
        setSetting(key.toLowerCase(), value);
        process.env[key] = value;
      }
      if (mapping.ADMIN_ROLE_ID) config.roles.admin = mapping.ADMIN_ROLE_ID;

      // แผงทั้งหมดจาก /setup — แผงแอดมินไปห้อง log
      const panelResults = await sendAllPanels(guild, {
        control,
        leave: leaveCh,
        checkin: checkinCh,
        storage: storageCh,
        delivery: deliveryCh,
        score,
        log,
        admin: log,
      });

      try {
        await sendRosterPanel(rosterCh, guild);
        panelResults.push(`ส่งแผง รายชื่อ → #${rosterCh.name}`);
      } catch (e) {
        panelResults.push(`ล้มเหลว รายชื่อ: ${e.message}`);
      }

      const envBlock = Object.entries(mapping)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

      const roleLine = [adminRole, helperRole, memberRole]
        .filter(Boolean)
        .map((r) => `${r}`)
        .join(' · ');

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle('✨ Setup เสร็จ — ห้อง + ยศ + แผงพร้อมแล้ว')
        .setDescription(
          [
            created.length ? `**สร้าง/ตั้งค่า**\n${created.map((x) => `✦ ${x}`).join('\n')}` : null,
            renamed.length ? `**เปลี่ยนชื่อ**\n${renamed.map((x) => `✧ ${x}`).join('\n')}` : null,
            reused.length && !renamed.length
              ? `**ใช้ของเดิม**\n${reused.map((x) => `• ${x}`).join('\n')}`
              : null,
            '',
            roleLine ? `₊˚ ยศ: ${roleLine}` : null,
            '₊˚ **ไม่สร้าง** ห้อง heist-score / heist-chat',
            '₊˚ แผงแอดมินอยู่ที่ห้อง **ประวัติ-log**',
            '₊˚ แผงทุกปุ่มถูกส่งจาก `/setup` แล้ว',
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .addFields(
          {
            name: '‧ แผงที่ส่งแล้ว',
            value:
              (panelResults || []).slice(0, 14).map((x) => `• ${x}`).join('\n') || '—',
          },
          {
            name: '‧ IDs',
            value: '```env\n' + envBlock.slice(0, 900) + '\n```',
          },
        )
        .setFooter({ text: 'Baby Grape System ‧ setup' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('/setup failed:', err);
      await interaction.editReply({
        content:
          `❌ Setup ล้มเหลว: ${err.message}\n\n` +
          'ถ้าเป็นเรื่องสิทธิ์ เชิญบอทใหม่:\n' +
          INVITE_URL,
      });
    }
  },
};
