/**
 * SQLite via better-sqlite3 (compatible with Node 18+)
 * ใช้ DATA_DIR ถ้ามี (Railway Volume แนะนำ mount ที่ /data)
 */
const Database = require('better-sqlite3');
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

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

module.exports = db;
