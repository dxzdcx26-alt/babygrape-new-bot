# 🍇 BabyGrape New Bot

บอท Discord สร้างใหม่จากต้นแบบ [baby-grape-bot](https://github.com/marshmayris/baby-grape-bot)  
**Application ID:** `1572394577724317788`

**Repo (บัญชีที่เชื่อม):** https://github.com/dxzdcx26-alt/babygrape-new-bot

ระบบหลักทำแบบของเดิมเป๊ะ: Heist Report, คะแนน Weekly/Monthly, Leaderboard ปักหมุด, Archive ทุก 3 วัน, คำสั่ง `!` เดิม, Google Sheets, Express uptime

---

## รันจาก Git

```bash
git clone https://github.com/dxzdcx26-alt/babygrape-new-bot.git
cd babygrape-new-bot

npm install

cp .env.example .env
# แก้ .env ใส่ Token ใหม่ + ID ห้อง/ยศ + Google Sheet URL

npm run db:setup
npm run deploy
npm run panel:send
npm start
```

รันค้างบน VPS ด้วย pm2:

```bash
npm i -g pm2
pm2 start src/index.js --name babygrape
pm2 save && pm2 startup
```

---

## ตัวแปร `.env`

| ตัวแปร | ความหมาย |
|--------|----------|
| `DISCORD_TOKEN` | Token **บอทใหม่** |
| `CLIENT_ID` | ต้องเป็น `1572394577724317788` |
| `GUILD_ID` | เซิร์ฟเวอร์ |
| `CONTROL_CHANNEL_ID` | ห้องปุ่ม Heist |
| `LOG_CHANNEL_ID` | ห้อง log รายงาน |
| `SCORE_CHANNEL_ID` | ห้องกระดานคะแนน |
| `TARGET_CHANNEL_ID` | ห้องที่ถูกรีเซ็ตทุก 3 วัน |
| `ARCHIVE_CATEGORY_ID` | หมวดเก็บห้องเก่า |
| `ADMIN_ROLE_ID` | ยศแอดมิน |
| `MENTION_ROLE_ID` | (ไม่บังคับ) ยศแท็กตอนรายงาน |
| `GOOGLE_SHEET_URL` | URL Apps Script |

ห้าม commit ไฟล์ `.env` และห้ามใช้ Token บอทเก่า

---

## ของเดิมที่คงไว้

- ปุ่มเริ่มบันทึกผลงาน → งัดร้าน / งัดธนาคาร / ลูทบ็อก → พีค (+10) / นอกเวลา (+2) → เลือกสมาชิก 1–5 → Modal ลิงก์รูป CDN Discord
- ตรวจ URL ต้องเป็น cdn/media.discordapp และห้ามอักษรไทย
- กระดานคะแนนรายสัปดาห์ + สะสมรายเดือน (แก้ข้อความปักหมุด)
- `/score` เพิ่ม ลบ ตั้งค่า | `/weekly_reset`
- Archive **00:00 Asia/Bangkok ทุก 3 วัน** + `!reset` + ข้อความ countdown / hello 1975
- `!help` และคำสั่งสนุกเดิมครบ
- Express `GET /` → `Baby Grape is awake!`

---

## คำสั่ง npm

| คำสั่ง | ใช้ทำอะไร |
|--------|-----------|
| `npm start` | รันบอท |
| `npm run deploy` | ลงทะเบียน slash commands |
| `npm run db:setup` | สร้าง SQLite |
| `npm run panel:send` | ส่งแผง Heist |
| `npm run db:migrate -- path/to/scores.json` | ย้ายคะแนนจากของเก่า (สำรองก่อน) |

ต้องการ **Node.js 22+**

---

## แยกจากบอทเก่า

Application / Token / Database / การ deploy คนละชุด  
ไม่แก้ repo ต้นแบบ

---

## License

ISC
