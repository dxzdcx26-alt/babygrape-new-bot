module.exports = {
  version: 2,
  name: '002_storage',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS storage_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        quantity INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS storage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER,
        item_name TEXT NOT NULL,
        action TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        proof_url TEXT,
        note TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS delivery_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        destination TEXT,
        proof_url TEXT,
        note TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      INSERT OR IGNORE INTO schema_version (version, name) VALUES (2, '002_storage');
    `);
  },
};
