# รัน BabyGrape จาก Git

Repo: https://github.com/dxzdcx26-alt/babygrape-new-bot

## บนเครื่อง / VPS (แนะนำ)

```bash
git clone https://github.com/dxzdcx26-alt/babygrape-new-bot.git
cd babygrape-new-bot
npm install

cp .env.example .env
nano .env   # ใส่ DISCORD_TOKEN + CLIENT_ID=1572394577724317788

npm run db:setup
npm run deploy
npm start
```

ใน Discord (แอดมิน):
1. เชิญบอทเข้าเซิร์ฟ (สิทธิ์ Manage Channels / Administrator)
2. พิมพ์ `/setup` → สร้างห้องตามระบบอัตโนมัติ
3. รีสตาร์ทบอท: หยุดแล้ว `npm start` ใหม่
4. `npm run panel:send` ส่งปุ่ม Heist

## รันค้างด้วย pm2

```bash
npm i -g pm2
pm2 start src/index.js --name babygrape
pm2 save
pm2 startup
```

อัปเดตโค้ดจาก git:

```bash
cd babygrape-new-bot
git pull
npm install
npm run deploy
pm2 restart babygrape
```

## หมายเหตุ

- GitHub **ไม่รันบอทค้างได้เอง** ต้องใช้เครื่อง / VPS / Railway / Render / etc.
- อย่า commit ไฟล์ `.env`
- หลัง `/setup` ค่า Channel ID จะถูกเขียนลง `.env` ให้อัตโนมัติ
