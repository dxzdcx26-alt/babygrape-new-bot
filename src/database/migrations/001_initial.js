/**
 * Migration 001 - Initial Schema
 * Creates all core tables for BabyGrape New Bot
 */

module.exports = {
  version: 1,
  name: '001_initial',

  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tag TEXT,
        display_name TEXT,
        weekly_score REAL NOT NULL DEFAULT 0,
        monthly_score REAL NOT NULL DEFAULT 0,
        total_score REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS heist_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_id TEXT NOT NULL,
        activity TEXT NOT NULL,
        time_type TEXT NOT NULL CHECK(time_type IN ('peak', 'offpeak')),
        score_per_member REAL NOT NULL,
        image_url_front TEXT,
        image_url_back TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (reporter_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS heist_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        score_awarded REAL NOT NULL,
        FOREIGN KEY (report_id) REFERENCES heist_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS score_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('add', 'remove', 'set', 'heist', 'weekly_reset', 'manual')),
        amount REAL NOT NULL,
        weekly_before REAL,
        weekly_after REAL,
        monthly_before REAL,
        monthly_after REAL,
        admin_id TEXT,
        reason TEXT,
        report_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS checkin_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        opened_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
        opened_at TEXT NOT NULL DEFAULT (datetime('now')),
        closed_at TEXT,
        FOREIGN KEY (opened_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        checked_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(session_id, user_id),
        FOREIGN KEY (session_id) REFERENCES checkin_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS leaves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        reviewed_by TEXT,
        review_note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        reviewed_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS leaderboard_messages (
        type TEXT PRIMARY KEY CHECK(type IN ('weekly', 'monthly')),
        channel_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_heist_reports_created ON heist_reports(created_at);
      CREATE INDEX IF NOT EXISTS idx_heist_members_user ON heist_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_score_history_user ON score_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_checkins_session ON checkins(session_id);
      CREATE INDEX IF NOT EXISTS idx_leaves_user ON leaves(user_id);
      CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
    `);

    db.prepare(
      `INSERT OR IGNORE INTO schema_version (version, name) VALUES (?, ?)`,
    ).run(1, '001_initial');
  },

  down(db) {
    db.exec(`
      DROP TABLE IF EXISTS leaderboard_messages;
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS leaves;
      DROP TABLE IF EXISTS checkins;
      DROP TABLE IF EXISTS checkin_sessions;
      DROP TABLE IF EXISTS score_history;
      DROP TABLE IF EXISTS heist_members;
      DROP TABLE IF EXISTS heist_reports;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS schema_version;
    `);
  },
};
