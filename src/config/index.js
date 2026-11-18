require('dotenv').config();

// เริ่มต้นด้วยแค่ Token + Client ID — ห้อง/ยศ ตั้งทีหลังด้วย /setup
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

module.exports = {
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
