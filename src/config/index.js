require('dotenv').config();

const hardRequired = ['DISCORD_TOKEN', 'CLIENT_ID'];
const missing = hardRequired.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach((k) => console.error(`   - ${k}`));
  process.exit(1);
}

if (process.env.CLIENT_ID !== '1572394577724317788') {
  console.warn(
    `⚠️  CLIENT_ID is ${process.env.CLIENT_ID}, expected 1572394577724317788`,
  );
}

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || '',
  channels: {
    control: process.env.CONTROL_CHANNEL_ID || '',
    log: process.env.LOG_CHANNEL_ID || '',
    score: process.env.SCORE_CHANNEL_ID || '',
    target: process.env.TARGET_CHANNEL_ID || '',
    archiveCategory: process.env.ARCHIVE_CATEGORY_ID || '',
    leave: process.env.LEAVE_CHANNEL_ID || '',
    checkin: process.env.CHECKIN_CHANNEL_ID || '',
    admin: process.env.ADMIN_CHANNEL_ID || '',
    roster: process.env.ROSTER_CHANNEL_ID || '',
    delivery: process.env.DELIVERY_CHANNEL_ID || '',
    storage: process.env.STORAGE_CHANNEL_ID || '',
  },
  roles: {
    admin: process.env.ADMIN_ROLE_ID || '',
    mention: process.env.MENTION_ROLE_ID || null,
  },
  googleSheetUrl: process.env.GOOGLE_SHEET_URL || '',
  prefix: process.env.PREFIX || '!',
  port: parseInt(process.env.PORT || '3000', 10),
  timezone: process.env.TIMEZONE || 'Asia/Bangkok',
  nodeEnv: process.env.NODE_ENV || 'production',
  scores: { peak: 10, offpeak: 2 },
  archiveCron: '0 0 */3 * *',
};

/** โหลดค่าจากตาราง settings หลัง /setup (ไม่หายถ้า DB อยู่บน volume) */
function hydrateFromDatabase(getSettingFn) {
  if (typeof getSettingFn !== 'function') return;

  const map = {
    guild_id: 'GUILD_ID',
    control_channel_id: 'CONTROL_CHANNEL_ID',
    log_channel_id: 'LOG_CHANNEL_ID',
    score_channel_id: 'SCORE_CHANNEL_ID',
    target_channel_id: 'TARGET_CHANNEL_ID',
    archive_category_id: 'ARCHIVE_CATEGORY_ID',
    leave_channel_id: 'LEAVE_CHANNEL_ID',
    checkin_channel_id: 'CHECKIN_CHANNEL_ID',
    admin_channel_id: 'ADMIN_CHANNEL_ID',
    roster_channel_id: 'ROSTER_CHANNEL_ID',
    delivery_channel_id: 'DELIVERY_CHANNEL_ID',
    storage_channel_id: 'STORAGE_CHANNEL_ID',
    admin_role_id: 'ADMIN_ROLE_ID',
    mention_role_id: 'MENTION_ROLE_ID',
  };

  let loaded = 0;
  for (const [dbKey, envKey] of Object.entries(map)) {
    const val = getSettingFn(dbKey);
    if (val) {
      process.env[envKey] = String(val);
      loaded += 1;
    }
  }

  config.guildId = process.env.GUILD_ID || config.guildId;
  config.channels.control = process.env.CONTROL_CHANNEL_ID || '';
  config.channels.log = process.env.LOG_CHANNEL_ID || '';
  config.channels.score = process.env.SCORE_CHANNEL_ID || '';
  config.channels.target = process.env.TARGET_CHANNEL_ID || '';
  config.channels.archiveCategory = process.env.ARCHIVE_CATEGORY_ID || '';
  config.channels.leave = process.env.LEAVE_CHANNEL_ID || '';
  config.channels.checkin = process.env.CHECKIN_CHANNEL_ID || '';
  config.channels.admin = process.env.ADMIN_CHANNEL_ID || '';
  config.channels.roster = process.env.ROSTER_CHANNEL_ID || '';
  config.channels.delivery = process.env.DELIVERY_CHANNEL_ID || '';
  config.channels.storage = process.env.STORAGE_CHANNEL_ID || '';
  config.roles.admin = process.env.ADMIN_ROLE_ID || '';
  config.roles.mention = process.env.MENTION_ROLE_ID || null;

  if (loaded > 0) {
    console.log(`⚙️  โหลด settings จาก DB ${loaded} ค่า (score=${config.channels.score || '—'})`);
  }
}

config.hydrateFromDatabase = hydrateFromDatabase;
module.exports = config;
