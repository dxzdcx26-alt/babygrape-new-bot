/**
 * SQLite via Node.js built-in module (node:sqlite) — Node 22+
 * ใช้ DATA_DIR ถ้ามี (Railway Volume แนะนำ mount ที่ /data)
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir =
  process.env.DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'babygrape.db');
console.log(`📁 SQLite path: ${dbPath}`);

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');

module.exports = db;
