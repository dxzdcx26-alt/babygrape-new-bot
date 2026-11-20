# Baby Grape Bot (mYgang)

ใช้ซอร์สต้นฉบับ Baby Grape เต็มระบบ

## รัน

```bash
npm install
# ตั้งค่า .env หรือ Environment บน Railway
npm run deploy
npm start
```

## Env ที่ต้องมี

- `token` หรือ `DISCORD_TOKEN`
- `clientId` / `CLIENT_ID` = `1572394577724317788`
- `guildId`
- `controlChannelId`, `logChannelId`, `scoreChannelId`
- `targetChannelId`, `archiveCategoryId`
- `adminRoleId`, `mentionRoleId` (ถ้ามี)
- `googleSheetUrl` (ถ้าใช้)

## คำสั่ง

- Slash: `/score`, `/weekly_reset`
- Prefix: `!help`, `!reset`, และคำสั่งสนุกตามต้นฉบับ
- ปุ่ม Heist Report ตามแผงใน control channel

สคริปต์ `send-panel.js` ใช้ส่งแผงปุ่มลงทะเบียน
