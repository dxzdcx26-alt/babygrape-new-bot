/**
 * mYgang — รันซอร์สต้นฉบับ Baby Grape (marshmayris/baby-grape-bot)
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const https = require("https");

const ORIGIN =
  process.env.BABYGRAPE_SOURCE_URL ||
  "https://raw.githubusercontent.com/marshmayris/baby-grape-bot/main/index.js";
const TARGET = path.join(__dirname, "_baby_grape_index.js");

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error("HTTP " + res.statusCode + " from " + url));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

function patchSource(src) {
  let out = src;
  out = out.replace(
    "const token = process.env.token;",
    "const token = process.env.token || process.env.DISCORD_TOKEN;",
  );
  out = out.replace(
    "const guildId = process.env.guildId;",
    "const guildId = process.env.guildId || process.env.GUILD_ID;",
  );
  const mapBlock = [
    "// --- mYgang env aliases ---",
    "if (!process.env.controlChannelId && process.env.CONTROL_CHANNEL_ID) process.env.controlChannelId = process.env.CONTROL_CHANNEL_ID;",
    "if (!process.env.logChannelId && process.env.LOG_CHANNEL_ID) process.env.logChannelId = process.env.LOG_CHANNEL_ID;",
    "if (!process.env.scoreChannelId && process.env.SCORE_CHANNEL_ID) process.env.scoreChannelId = process.env.SCORE_CHANNEL_ID;",
    "if (!process.env.targetChannelId && process.env.TARGET_CHANNEL_ID) process.env.targetChannelId = process.env.TARGET_CHANNEL_ID;",
    "if (!process.env.archiveCategoryId && process.env.ARCHIVE_CATEGORY_ID) process.env.archiveCategoryId = process.env.ARCHIVE_CATEGORY_ID;",
    "if (!process.env.adminRoleId && process.env.ADMIN_ROLE_ID) process.env.adminRoleId = process.env.ADMIN_ROLE_ID;",
    "if (!process.env.mentionRoleId && process.env.MENTION_ROLE_ID) process.env.mentionRoleId = process.env.MENTION_ROLE_ID;",
    "",
  ].join("\n");
  if (!out.includes("mYgang env aliases")) {
    out = out.replace(
      'require("dotenv").config();',
      'require("dotenv").config();\n' + mapBlock,
    );
  }
  return out;
}

async function main() {
  const force = process.env.FORCE_RESTORE === "1";
  if (!fs.existsSync(TARGET) || force) {
    console.log("กำลังดึงซอร์สต้นฉบับ Baby Grape...");
    const raw = await fetchText(ORIGIN);
    const patched = patchSource(raw);
    fs.writeFileSync(TARGET, patched, "utf8");
    console.log("บันทึก", TARGET, "(" + patched.length + " bytes)");
  } else {
    console.log("ใช้ซอร์สที่แคชไว้แล้ว:", TARGET);
  }
  require(TARGET);
}

main().catch((err) => {
  console.error("ไม่สามารถโหลด Baby Grape ต้นฉบับ:", err);
  process.exit(1);
});
