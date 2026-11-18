#!/usr/bin/env node
/**
 * Setup SQLite database and run migrations
 */
const path = require('path');
// dotenv optional

const { runMigrations, db } = require('../src/database');

console.log('🍇 BabyGrape New Bot - Database Setup');
console.log('=====================================');

try {
  runMigrations();

  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
    .all()
    .map((r) => r.name);

  console.log('\n✅ Tables created:');
  tables.forEach((t) => console.log(`   - ${t}`));

  const version = db.prepare('SELECT MAX(version) as v FROM schema_version').get();
  console.log(`\n📌 Schema version: ${version?.v || 0}`);
  console.log('\nDatabase ready at: data/babygrape.db');
  process.exit(0);
} catch (err) {
  console.error('❌ Database setup failed:', err);
  process.exit(1);
}
