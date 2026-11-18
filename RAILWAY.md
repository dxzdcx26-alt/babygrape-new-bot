# Deploy BabyGrape บน Railway

Repo: https://github.com/dxzdcx26-alt/babygrape-new-bot

## 1) สมัคร / เข้าสู่ระบบ

ไปที่ https://railway.app → Login ด้วย GitHub

## 2) สร้างโปรเจกต์จาก GitHub

1. **New Project**
2. **Deploy from GitHub repo**
3. เลือก `dxzdcx26-alt/babygrape-new-bot`
4. รอ Railway build (ใช้ `npm install` + `npm start` อัตโนมัติ)

## 3) ใส่ Environment Variables

เปิด service → **Variables** → เพิ่ม:

```
DISCORD_TOKEN=โทเคนบอทของคุณ
CLIENT_ID=1572394577724317788
GUILD_ID=ไอดีเซิร์ฟ
CONTROL_CHANNEL_ID=
LOG_CHANNEL_ID=
SCORE_CHANNEL_ID=
TARGET_CHANNEL_ID=
ARCHIVE_CATEGORY_ID=
ADMIN_ROLE_ID=
MENTION_ROLE_ID=
GOOGLE_SHEET_URL=
PREFIX=!
TIMEZONE=Asia/Bangkok
```

หมายเหตุ:
- เริ่มต้นใส่แค่ `DISCORD_TOKEN` + `CLIENT_ID` ก็ login ได้
- หลังบอทออนไลน์ ใช้ `/setup` ใน Discord เพื่อสร้างห้องและได้ Channel ID
- แล้วค่อยกลับมาใส่ Channel ID ใน Variables (หรือให้ `/setup` เขียนลง DB — หลังรีสตาร์ทควรใส่ใน Variables ด้วย)
- Railway จะใส่ `PORT` ให้อัตโนมัติ (บอทอ่านจาก `process.env.PORT` อยู่แล้ว)

## 4) Settings สำคัญ

- **Replicas = 1** เท่านั้น (อย่า scale หลายตัว — Discord gateway จะชนกัน)
- อย่าเปิด Sleep / อย่าให้ service หลับ
- Start Command: `npm start` (default จาก package.json)

## 5) Volume สำหรับ SQLite (สำคัญ)

ข้อมูลคะแนนอยู่ในไฟล์ `data/babygrape.db`

ถ้าไม่ติด Volume ทุกครั้งที่ redeploy **ข้อมูลจะหาย**

1. Service → **Settings** → **Volumes** (หรือ Add Volume)
2. Mount path: `/app/data`
3. ตรวจว่าโค้ดเขียน DB ที่ `data/babygrape.db` (ค่า default อยู่แล้ว)

## 6) Deploy คำสั่ง Slash (ครั้งแรก)

ทำบนเครื่องคุณครั้งเดียว:

```bash
git clone https://github.com/dxzdcx26-alt/babygrape-new-bot.git
cd babygrape-new-bot
npm install
cp .env.example .env
# ใส่ DISCORD_TOKEN, CLIENT_ID, GUILD_ID
npm run deploy
```

## 7) หลังบอทออนไลน์

1. เชิญบอทเข้าเซิร์ฟ (สิทธิ์ Administrator / Manage Channels)
2. พิมพ์ `/setup`
3. ใส่ Channel ID ที่ได้ลง Railway Variables (ถ้าต้องการ)
4. `npm run panel:send` จากเครื่อง (หรือเพิ่มสคริปต์ภายหลัง)

## 8) ดู Logs

Railway → Deployments → View Logs

ควรเห็นประมาณ:
```
🍇 เบบี้เกรป (... ) พร้อมทำงาน...
เว็บเซิร์ฟเวอร์สำหรับ UptimeRobot เริ่มทำงานที่ port ...
```

## สรุป checklist

- [ ] Deploy จาก GitHub repo
- [ ] ใส่ DISCORD_TOKEN + CLIENT_ID
- [ ] Replicas = 1
- [ ] ติด Volume ที่ `/app/data`
- [ ] `npm run deploy` จากเครื่อง
- [ ] `/setup` ใน Discord
