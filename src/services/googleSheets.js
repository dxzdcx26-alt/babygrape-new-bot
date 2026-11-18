const axios = require('axios');
const config = require('../config');

async function sendHeistToSheet(payload, retries = 3) {
  if (!config.googleSheetUrl) {
    console.warn('GOOGLE_SHEET_URL not set, skipping sheet write');
    return { success: false, reason: 'no_url' };
  }
  const data = { type: 'heist', timestamp: new Date().toISOString(), ...payload };
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(config.googleSheetUrl, data, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });
      console.log(`✅ Google Sheets write success (attempt ${attempt})`);
      return { success: true, data: res.data };
    } catch (err) {
      console.error(`❌ Google Sheets write failed (attempt ${attempt}/${retries}):`, err.message);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return { success: false, reason: 'max_retries' };
}

async function sendScoreToSheet(payload) {
  if (!config.googleSheetUrl) return { success: false };
  try {
    await axios.post(
      config.googleSheetUrl,
      { type: 'score', timestamp: new Date().toISOString(), ...payload },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 },
    );
    return { success: true };
  } catch (err) {
    console.error('Google Sheets score write failed:', err.message);
    return { success: false };
  }
}

module.exports = { sendHeistToSheet, sendScoreToSheet };
