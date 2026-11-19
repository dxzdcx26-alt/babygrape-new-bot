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
      return interaction.reply({ content: '❌ สำหรับแอดมินเท่านั้น', ephemeral: true });
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
        content: '❌ บอทยังไม่ได้อยู่ในเซิร์ฟนี้\n\n🔗 ' + INVITE_URL,
      });
    }

    const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (me && !me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.editReply({ content: '❌ บอทไม่มีสิทธิ์ Manage Channels\n' + INVITE_URL });
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
            console.warn(e.message);
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
          (c.name === name || aliases.some((a) => c.name === a || c.name.includes(a))),
      );
      if (existing && !force) {
        if (shouldRename && existing.name !== name) {
          try {
            await existing.setName(name, 'BabyGrape pretty name');
            renamed.push(`→ ${name}`);
          } catch (e) {
            console.warn(e.message);
          }
        }
        if (parent && existing.parentId !== parent.id) {
          try {
            await existing.setParent(parent.id, { reason: 'BabyGrape setup' });
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
            console.warn(e.message);
          }
        }
        if (role.editable && permissions) {
          try {
            await role.setPermissions(permissions, 'BabyGrape role permissions');
          } catch (e) {
            console.warn(e.message);
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
      if (!(me && !me.permissions.has(PermissionFlagsBits.ManageRoles))) {
        try {
          adminRole = await findOrCreateRole(ROLES[0]);
          helperRole = await findOrCreateRole(ROLES[1]);
          memberRole = await findOrCreateRole(ROLES[2]);
        } catch (e) {
          created.push(`(สร้างยศไม่สำเร็จ: ${e.message})`);
        }
      }

      const archiveCat = await findOrCreateCategory(CATEGORY_ARCHIVE, [
        'heist-archive',
        'heist˗archive',
        'archive',
      ]);
      const systemCat = await findOrCreateCategory(CATEGORY_SYSTEM, ['BABY GRAPE', 'Baby Grape']);

      const control = await findOrCreateText(CHANNELS.control, systemCat);
      const leaveCh = await findOrCreateText(CHANNELS.leave, systemCat);
      const checkinCh = await findOrCreateText(CHANNELS.checkin, systemCat);
      const deliveryCh = await findOrCreateText(CHANNELS.delivery, systemCat);
      await findOrCreateText(CHANNELS.leaveSummary, systemCat);
      await findOrCreateText(CHANNELS.checkinSummary, systemCat);
      const rosterCh = await findOrCreateText(CHANNELS.roster, systemCat);
      const log = await findOrCreateText(CHANNELS.log, systemCat);

      try {
        const overwrites = [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }];
        for (const role of [adminRole, helperRole, memberRole]) {
          if (!role) continue;
          overwrites.push({
            id: role.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          });
        }
        if (me) {
          overwrites.push({
            id: me.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          });
        }
        await systemCat.permissionOverwrites.set(overwrites);
        for (const ch of systemCat.children.cache.values()) {
          try {
            await ch.permissionOverwrites.set(overwrites);
          } catch (e) {
            console.warn(ch.name, e.message);
          }
        }
      } catch (e) {
        console.warn('role-gate', e.message);
      }

      const mapping = {
        GUILD_ID: guild.id,
        CONTROL_CHANNEL_ID: control.id,
        LOG_CHANNEL_ID: log.id,
        ARCHIVE_CATEGORY_ID: archiveCat.id,
        LEAVE_CHANNEL_ID: leaveCh.id,
        CHECKIN_CHANNEL_ID: checkinCh.id,
        ROSTER_CHANNEL_ID: rosterCh.id,
        DELIVERY_CHANNEL_ID: deliveryCh.id,
      };
      if (adminRole) mapping.ADMIN_ROLE_ID = adminRole.id;
      if (helperRole) mapping.HELPER_ROLE_ID = helperRole.id;
      if (memberRole) mapping.MEMBER_ROLE_ID = memberRole.id;

      for (const [key, value] of Object.entries(mapping)) {
        setSetting(key.toLowerCase(), value);
        process.env[key] = value;
      }
      if (mapping.ADMIN_ROLE_ID) config.roles.admin = mapping.ADMIN_ROLE_ID;

      const panelResults = await sendAllPanels(guild, {
        control,
        leave: leaveCh,
        checkin: checkinCh,
        storage: null,
        delivery: deliveryCh,
        score: null,
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
        .setTitle('✨ Setup เสร็จ')
        .setDescription(
          [
            created.length ? `**สร้าง**\n${created.map((x) => `✦ ${x}`).join('\n')}` : null,
            reused.length ? `**ใช้ของเดิม**\n${reused.map((x) => `• ${x}`).join('\n')}` : null,
            roleLine ? `₊˚ ยศ: ${roleLine}` : null,
            '₊˚ **ไม่สร้าง** ตารางคะแนน / ตัดยอด / คลัง / heist-score',
            '₊˚ แผงแอดมิน **Control Panel** อยู่ที่ประวัติ-log',
            '₊˚ หมวดเห็นเฉพาะยศ BG',
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .addFields(
          {
            name: '‧ แผง',
            value: (panelResults || []).slice(0, 12).map((x) => `• ${x}`).join('\n') || '—',
          },
          { name: '‧ IDs', value: '```env\n' + envBlock.slice(0, 900) + '\n```' },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('/setup failed:', err);
      await interaction.editReply({ content: `❌ ${err.message}\n` + INVITE_URL });
    }
  },
};
