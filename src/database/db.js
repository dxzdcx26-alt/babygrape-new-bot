/**
 * SQLite via Node.js built-in module (node:sqlite) — Node 22+
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'babygrape.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON');

module.exports = db;
