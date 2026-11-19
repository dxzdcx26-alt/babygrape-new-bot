const db = require('./db');
const migration001 = require('./migrations/001_initial');
const migration002 = require('./migrations/002_storage');

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
  const migrations = [migration001, migration002];
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
    ).run(
      userId,
      reportId ? 'heist' : 'add',
      amount,
      before.weekly_score || 0,
      weeklyAfter,
      before.monthly_score || 0,
      before.monthly_score || 0,
      adminId,
      reason,
      reportId,
    );
  });
  return getUserScore(userId);
}

function setWeeklyScore(userId, amount, adminId = null, reason = null) {
  ensureUser(userId);
  const before = getUserScore(userId);
  withTransaction(() => {
    db.prepare(`UPDATE users SET weekly_score = ?, updated_at = datetime('now') WHERE id = ?`).run(amount, userId);
    db.prepare(
      `INSERT INTO score_history (user_id, action, amount, weekly_before, weekly_after, monthly_before, monthly_after, admin_id, reason)
       VALUES (?, 'set', ?, ?, ?, ?, ?, ?, ?)`,
    ).run(userId, amount, before.weekly_score || 0, amount, before.monthly_score || 0, before.monthly_score || 0, adminId, reason);
  });
  return getUserScore(userId);
}

function removeWeeklyScore(userId, amount, adminId = null, reason = null) {
  return addWeeklyScore(userId, -Math.abs(amount), adminId, reason);
}

function weeklyReset(adminId = null) {
  const rows = db.prepare('SELECT id, weekly_score, monthly_score FROM users').all();
  withTransaction(() => {
    for (const r of rows) {
      const weekly = r.weekly_score || 0;
      if (weekly === 0) continue;
      const monthly = (r.monthly_score || 0) + weekly;
      db.prepare(`UPDATE users SET monthly_score = ?, weekly_score = 0, updated_at = datetime('now') WHERE id = ?`).run(monthly, r.id);
      db.prepare(
        `INSERT INTO score_history (user_id, action, amount, weekly_before, weekly_after, monthly_before, monthly_after, admin_id, reason)
         VALUES (?, 'weekly_reset', ?, ?, 0, ?, ?, ?, 'weekly reset')`,
      ).run(r.id, weekly, weekly, r.monthly_score || 0, monthly, adminId);
    }
  });
  return rows.length;
}

function createHeistReport(data) {
  const info = db.prepare(
    `INSERT INTO heist_reports (reporter_id, activity, time_slot, member_ids, image_url, score_each, guild_id, channel_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    data.reporter_id,
    data.activity,
    data.time_slot,
    JSON.stringify(data.member_ids || []),
    data.image_url || null,
    data.score_each || 0,
    data.guild_id || null,
    data.channel_id || null,
  );
  return Number(info.lastInsertRowid);
}

function logAudit(action, actorId, detail = null) {
  db.prepare(`INSERT INTO audit_log (action, actor_id, detail) VALUES (?, ?, ?)`).run(action, actorId, detail);
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
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
  const id = Number(info.lastInsertRowid);
  return { id, name, opened_by: openedBy, status: 'open' };
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
    if (String(e.message || e).includes('UNIQUE')) {
      return { success: false, reason: 'already_checked_in' };
    }
    throw e;
  }
}

function getCheckinList(sessionId) {
  return db
    .prepare(
      `SELECT c.user_id, c.checked_at, u.display_name, u.tag
     FROM checkins c LEFT JOIN users u ON u.id = c.user_id
     WHERE c.session_id = ? ORDER BY c.checked_at`,
    )
    .all(sessionId);
}

function createLeave(userId, startDate, endDate, reason) {
  ensureUser(userId);
  const info = db
    .prepare(
      `INSERT INTO leaves (user_id, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, 'pending')`,
    )
    .run(userId, startDate, endDate, reason);
  return Number(info.lastInsertRowid);
}

function reviewLeave(leaveId, status, reviewerId, note = null) {
  db.prepare(
    `UPDATE leaves SET status = ?, reviewed_by = ?, review_note = ?, reviewed_at = datetime('now') WHERE id = ?`,
  ).run(status, reviewerId, note, leaveId);
}

function getPendingLeaves() {
  return db.prepare(`SELECT * FROM leaves WHERE status = 'pending' ORDER BY created_at`).all();
}

function getUserLeaves(userId) {
  return db.prepare(`SELECT * FROM leaves WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
}

function listStorageItems() {
  try {
    return db.prepare('SELECT * FROM storage_items ORDER BY name').all();
  } catch {
    return [];
  }
}

function upsertStorageItem(name, quantityDelta, note = null) {
  const existing = db.prepare('SELECT * FROM storage_items WHERE name = ?').get(name);
  if (!existing) {
    const qty = Math.max(0, quantityDelta);
    db.prepare(`INSERT INTO storage_items (name, quantity, note) VALUES (?, ?, ?)`).run(name, qty, note);
    return { name, quantity: qty };
  }
  const qty = Math.max(0, (existing.quantity || 0) + quantityDelta);
  db.prepare(
    `UPDATE storage_items SET quantity = ?, note = COALESCE(?, note), updated_at = datetime('now') WHERE id = ?`,
  ).run(qty, note, existing.id);
  return { name, quantity: qty, id: existing.id };
}

function setStorageQuantity(name, quantity, note = null) {
  const existing = db.prepare('SELECT * FROM storage_items WHERE name = ?').get(name);
  const qty = Math.max(0, quantity);
  if (!existing) {
    db.prepare(`INSERT INTO storage_items (name, quantity, note) VALUES (?, ?, ?)`).run(name, qty, note);
  } else {
    db.prepare(
      `UPDATE storage_items SET quantity = ?, note = COALESCE(?, note), updated_at = datetime('now') WHERE id = ?`,
    ).run(qty, note, existing.id);
  }
  return { name, quantity: qty };
}

function logStorageAction(itemName, action, quantity, userId, proofUrl = null, note = null) {
  ensureUser(userId);
  db.prepare(
    `INSERT INTO storage_logs (item_name, action, quantity, user_id, proof_url, note) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(itemName, action, quantity, userId, proofUrl, note);
}

function createDelivery(userId, itemName, quantity, destination, proofUrl, note = null) {
  ensureUser(userId);
  const info = db
    .prepare(
      `INSERT INTO delivery_logs (user_id, item_name, quantity, destination, proof_url, note) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(userId, itemName, quantity, destination, proofUrl, note);
  return Number(info.lastInsertRowid);
}

function getRecentDeliveries(limit = 10) {
  try {
    return db.prepare(`SELECT * FROM delivery_logs ORDER BY created_at DESC LIMIT ?`).all(limit);
  } catch {
    return [];
  }
}

module.exports = {
  db,
  runMigrations,
  ensureUser,
  getScores,
  getUserScore,
  addWeeklyScore,
  setWeeklyScore,
  removeWeeklyScore,
  weeklyReset,
  createHeistReport,
  logAudit,
  getSetting,
  setSetting,
  saveLeaderboardMessage,
  getLeaderboardMessage,
  openCheckinSession,
  closeCheckinSession,
  getOpenCheckinSession,
  doCheckin,
  getCheckinList,
  createLeave,
  reviewLeave,
  getPendingLeaves,
  getUserLeaves,
  listStorageItems,
  upsertStorageItem,
  setStorageQuantity,
  logStorageAction,
  createDelivery,
  getRecentDeliveries,
};
