const db = require('./db');
const migration001 = require('./migrations/001_initial');

function getCurrentVersion() {
  try {
    const row = db.prepare('SELECT MAX(version) as v FROM schema_version').get();
    return row?.v || 0;
  } catch {
    return 0;
  }
}

function runMigrations() {
  const current = getCurrentVersion();
  const migrations = [migration001];
  for (const m of migrations) {
    if (m.version > current) {
      console.log(`📦 Running migration ${m.name} (v${m.version})...`);
      m.up(db);
      console.log(`✅ Migration ${m.name} applied.`);
    }
  }
}

function withTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function ensureUser(userId, tag = null, displayName = null) {
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (existing) {
    if (tag || displayName) {
      db.prepare(
        `UPDATE users SET tag = COALESCE(?, tag), display_name = COALESCE(?, display_name), updated_at = datetime('now') WHERE id = ?`,
      ).run(tag, displayName, userId);
    }
    return;
  }
  db.prepare(`INSERT INTO users (id, tag, display_name) VALUES (?, ?, ?)`).run(userId, tag, displayName);
}

function getScores() {
  const rows = db.prepare('SELECT id, tag, weekly_score, monthly_score, total_score FROM users').all();
  const scores = {};
  for (const r of rows) {
    scores[r.id] = {
      tag: r.tag,
      weekly_score: r.weekly_score,
      monthly_score: r.monthly_score,
      total_score: r.total_score,
    };
  }
  return scores;
}

function getUserScore(userId) {
  ensureUser(userId);
  return db.prepare('SELECT weekly_score, monthly_score, total_score FROM users WHERE id = ?').get(userId);
}

function addWeeklyScore(userId, amount, adminId = null, reason = null, reportId = null) {
  ensureUser(userId);
  const before = getUserScore(userId);
  const weeklyAfter = (before.weekly_score || 0) + amount;
  const totalAfter = (before.total_score || 0) + amount;
  withTransaction(() => {
    db.prepare(`UPDATE users SET weekly_score = ?, total_score = ?, updated_at = datetime('now') WHERE id = ?`).run(weeklyAfter, totalAfter, userId);
    db.prepare(
      `INSERT INTO score_history (user_id, action, amount, weekly_before, weekly_after, monthly_before, monthly_after, admin_id, reason, report_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(userId, reportId ? 'heist' : 'add', amount, before.weekly_score, weeklyAfter, before.monthly_score, before.monthly_score, adminId, reason, reportId);
  });
  return { weekly_before: before.weekly_score, weekly_after: weeklyAfter };
}

function setWeeklyScore(userId, amount, adminId = null, reason = null) {
  ensureUser(userId);
  const before = getUserScore(userId);
  const delta = amount - (before.weekly_score || 0);
  const totalAfter = (before.total_score || 0) + delta;
  withTransaction(() => {
    db.prepare(`UPDATE users SET weekly_score = ?, total_score = ?, updated_at = datetime('now') WHERE id = ?`).run(amount, totalAfter, userId);
    db.prepare(
      `INSERT INTO score_history (user_id, action, amount, weekly_before, weekly_after, monthly_before, monthly_after, admin_id, reason)
       VALUES (?, 'set', ?, ?, ?, ?, ?, ?, ?)`,
    ).run(userId, amount, before.weekly_score, amount, before.monthly_score, before.monthly_score, adminId, reason);
  });
}

function removeWeeklyScore(userId, amount, adminId = null, reason = null) {
  return addWeeklyScore(userId, -amount, adminId, reason);
}

function weeklyReset() {
  const users = db.prepare('SELECT id, weekly_score, monthly_score FROM users WHERE weekly_score != 0').all();
  const results = [];
  withTransaction(() => {
    for (const u of users) {
      const newMonthly = (u.monthly_score || 0) + (u.weekly_score || 0);
      db.prepare(`UPDATE users SET monthly_score = ?, weekly_score = 0, updated_at = datetime('now') WHERE id = ?`).run(newMonthly, u.id);
      db.prepare(
        `INSERT INTO score_history (user_id, action, amount, weekly_before, weekly_after, monthly_before, monthly_after, reason)
         VALUES (?, 'weekly_reset', ?, ?, 0, ?, ?, 'Weekly reset')`,
      ).run(u.id, u.weekly_score, u.weekly_score, u.monthly_score, newMonthly);
      results.push({ id: u.id, weekly: u.weekly_score, monthly_after: newMonthly });
    }
  });
  return results;
}

function createHeistReport({ reporterId, activity, timeType, scorePerMember, imageUrlFront, imageUrlBack, notes, memberIds }) {
  ensureUser(reporterId);
  return withTransaction(() => {
    const info = db.prepare(
      `INSERT INTO heist_reports (reporter_id, activity, time_type, score_per_member, image_url_front, image_url_back, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')`,
    ).run(reporterId, activity, timeType, scorePerMember, imageUrlFront, imageUrlBack || null, notes || null);
    const reportId = Number(info.lastInsertRowid);
    for (const mid of memberIds) {
      ensureUser(mid);
      db.prepare(`INSERT INTO heist_members (report_id, user_id, score_awarded) VALUES (?, ?, ?)`).run(reportId, mid, scorePerMember);
      const before = db.prepare('SELECT weekly_score, monthly_score, total_score FROM users WHERE id = ?').get(mid);
      const weeklyAfter = (before.weekly_score || 0) + scorePerMember;
      const totalAfter = (before.total_score || 0) + scorePerMember;
      db.prepare(`UPDATE users SET weekly_score = ?, total_score = ?, updated_at = datetime('now') WHERE id = ?`).run(weeklyAfter, totalAfter, mid);
      db.prepare(
        `INSERT INTO score_history (user_id, action, amount, weekly_before, weekly_after, monthly_before, monthly_after, reason, report_id)
         VALUES (?, 'heist', ?, ?, ?, ?, ?, ?, ?)`,
      ).run(mid, scorePerMember, before.weekly_score, weeklyAfter, before.monthly_score, before.monthly_score, `Heist: ${activity}`, reportId);
    }
    return reportId;
  });
}

function logAudit(actorId, action, targetType = null, targetId = null, details = null) {
  db.prepare(`INSERT INTO audit_logs (actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)`).run(actorId, action, targetType, targetId, details ? JSON.stringify(details) : null);
}

function getSetting(key, defaultValue = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(key, String(value));
}

function saveLeaderboardMessage(type, channelId, messageId) {
  db.prepare(
    `INSERT INTO leaderboard_messages (type, channel_id, message_id, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(type) DO UPDATE SET channel_id = excluded.channel_id, message_id = excluded.message_id, updated_at = datetime('now')`,
  ).run(type, channelId, messageId);
}

function getLeaderboardMessage(type) {
  return db.prepare('SELECT channel_id, message_id FROM leaderboard_messages WHERE type = ?').get(type);
}

function openCheckinSession(name, openedBy) {
  ensureUser(openedBy);
  const info = db.prepare(`INSERT INTO checkin_sessions (name, opened_by, status) VALUES (?, ?, 'open')`).run(name, openedBy);
  return Number(info.lastInsertRowid);
}

function closeCheckinSession(sessionId) {
  db.prepare(`UPDATE checkin_sessions SET status = 'closed', closed_at = datetime('now') WHERE id = ?`).run(sessionId);
}

function getOpenCheckinSession() {
  return db.prepare(`SELECT * FROM checkin_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1`).get();
}

function doCheckin(sessionId, userId) {
  ensureUser(userId);
  try {
    db.prepare(`INSERT INTO checkins (session_id, user_id) VALUES (?, ?)`).run(sessionId, userId);
    return { success: true };
  } catch (e) {
    if (String(e.message).includes('UNIQUE') || e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, reason: 'already_checked_in' };
    }
    throw e;
  }
}

function getCheckinList(sessionId) {
  return db.prepare(
    `SELECT c.user_id, c.checked_at, u.display_name, u.tag
     FROM checkins c LEFT JOIN users u ON u.id = c.user_id
     WHERE c.session_id = ? ORDER BY c.checked_at`,
  ).all(sessionId);
}

function createLeave(userId, startDate, endDate, reason) {
  ensureUser(userId);
  const info = db.prepare(`INSERT INTO leaves (user_id, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, 'pending')`).run(userId, startDate, endDate, reason);
  return Number(info.lastInsertRowid);
}

function reviewLeave(leaveId, status, reviewerId, note = null) {
  db.prepare(`UPDATE leaves SET status = ?, reviewed_by = ?, review_note = ?, reviewed_at = datetime('now') WHERE id = ?`).run(status, reviewerId, note, leaveId);
}

function getPendingLeaves() {
  return db.prepare(`SELECT * FROM leaves WHERE status = 'pending' ORDER BY created_at`).all();
}

function getUserLeaves(userId) {
  return db.prepare(`SELECT * FROM leaves WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
}

module.exports = {
  db, runMigrations, ensureUser, getScores, getUserScore,
  addWeeklyScore, setWeeklyScore, removeWeeklyScore, weeklyReset,
  createHeistReport, logAudit, getSetting, setSetting,
  saveLeaderboardMessage, getLeaderboardMessage,
  openCheckinSession, closeCheckinSession, getOpenCheckinSession,
  doCheckin, getCheckinList, createLeave, reviewLeave, getPendingLeaves, getUserLeaves,
};
