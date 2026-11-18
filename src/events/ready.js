const cron = require('node-cron');
const config = require('../config');
const { updateScoreboard } = require('../services/scoreboard');
const { archiveAndCreateNewChannel } = require('../services/archive');
const { runMigrations } = require('../database');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`🍇 เบบี้เกรป (${client.user.tag}) พร้อมทำงานทุกอย่างแล้วค่า!`);
    console.log(`   Application ID: ${client.user.id}`);
    console.log(`   Expected CLIENT_ID: ${config.clientId}`);

    if (client.user.id !== config.clientId) {
      console.warn(
        `⚠️  Bot User ID (${client.user.id}) ไม่ตรงกับ CLIENT_ID ใน .env (${config.clientId})`,
      );
    }

    runMigrations();

    cron.schedule(
      config.archiveCron,
      () => {
        archiveAndCreateNewChannel(client);
      },
      { scheduled: true, timezone: config.timezone },
    );
    console.log(`ตั้งเวลาระบบเก็บห้องแชทเรียบร้อย! (${config.archiveCron} ${config.timezone})`);

    await updateScoreboard(client);
  },
};
