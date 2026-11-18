#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { runMigrations, ensureUser, db } = require('../src/database');

const scoresPath = process.argv[2];
if (!scoresPath) {
  console.log('Usage: node scripts/migrate-from-old.js <path-to-scores.json>');
  process.exit(1);
}
if (!fs.existsSync(scoresPath)) {
  console.error('File not found:', scoresPath);
  process.exit(1);
}
const dbPath = path.join(__dirname, '../data/babygrape.db');
if (fs.existsSync(dbPath)) {
  const bak = dbPath + '.bak.' + Date.now();
  fs.copyFileSync(dbPath, bak);
  console.log('📦 Backed up current DB to', bak);
}
runMigrations();
const scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));
let count = 0;
db.exec('BEGIN');
try {
  for (const [id, data] of Object.entries(scores)) {
    ensureUser(id, data.tag || null);
    db.prepare(
      `UPDATE users SET weekly_score = ?, monthly_score = ?, total_score = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(data.weekly_score || 0, data.monthly_score || 0, (data.weekly_score || 0) + (data.monthly_score || 0), id);
    count++;
  }
  db.exec('COMMIT');
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}
console.log(`✅ Migrated ${count} users from scores.json`);
