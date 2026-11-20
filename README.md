# Baby Grape (mYgang)

ใช้**ซอร์สต้นฉบับ**จาก [marshmayris/baby-grape-bot](https://github.com/marshmayris/baby-grape-bot)

โค้ด modular เดิมถูกเลิกใช้แล้ว — ตอนสตาร์ทบอทจะดึง `index.js` ต้นฉบับมาแคชแล้วรัน

## Env

| ชื่อ | ความหมาย |
|------|----------|
| `token` หรือ `DISCORD_TOKEN` | Token บอท |
| `clientId` / `CLIENT_ID` | `1572394577724317788` |
| `guildId` / `GUILD_ID` | ไอดีเซิร์ฟ |
| `controlChannelId` | ห้องปุ่มลงทะเบียน |
| `logChannelId` | ห้อง log |
| `scoreChannelId` | ห้องตารางคะแนน |
| `targetChannelId` | ห้อง heist-chat |
| `archiveCategoryId` | หมวด archive |
| `adminRoleId` | ยศแอดมิน |
| `mentionRoleId` | ยศ mention |
| `googleSheetUrl` | webhook Google Sheets |

## คำสั่ง

```bash
npm install
npm run deploy   # ลงทะเบียน /score /weekly_reset
npm start
npm run panel    # ส่งแผงปุ่มลงทะเบียน (ต้องมี controlChannelId)
```

## ฟีเจอร์ต้นฉบับ

- Heist Report แบบ interactive
- คะแนน weekly / monthly + leaderboard
- `/score`, `/weekly_reset`
- Archive ทุก 3 วัน 00:00 Asia/Bangkok
- `!help`, `!reset`, คำสั่งสนุก
- Google Sheets + Express port 3000
