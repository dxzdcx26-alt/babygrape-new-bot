const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { isAdmin } = require('../utils/permissions');
const { archiveAndCreateNewChannel } = require('../services/archive');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;

    const content = message.content.trim();

    if (content === `${config.prefix}reset`) {
      if (!isAdmin(message.member)) {
        return message.reply('❌ คำสั่งนี้สำหรับแอดมินเท่านั้นนะคับ');
      }
      await message.reply('รับแซ่บคร้าฟฟ เดะจัดการให้คับเธอ (๑•᎑< ๑)♡');
      await archiveAndCreateNewChannel(message.client);
      return;
    }

    if (content === `${config.prefix}help`) {
      const helpEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('🍇 คำสั่งทั้งหมดของเบบี้เกรป 🍇')
        .setDescription('นี่คือคำสั่งทั้งหมดที่สามารถใช้งานได้ค่ะ')
        .addFields(
          {
            name: '--- 📝 สำหรับสมาชิกทุกคน ---',
            value: '• **กดปุ่ม** ในห้อง `#heist-control` เพื่อเริ่มบันทึกผลงาน',
          },
          {
            name: '--- 🛠️ สำหรับแอดมินเท่านั้น ---',
            value:
              '• `!reset` - สั่งรีเซ็ตห้องแชทเป้าหมายทันที\n' +
              '• `/score` - จัดการคะแนนรายสัปดาห์ (เพิ่ม/ลบ/ตั้งค่า)\n' +
              '• `/weekly_reset` - ตัดรอบคะแนนประจำสัปดาห์ และโอนไปเป็นคะแนนสะสมรายเดือน',
          },
          {
            name: '--- ✨ คำสั่งสนุกๆ ---',
            value:
              '• `!เรนบ้าจริงมั้ยเบบี้เกรป`\n' +
              '• `!1975คืออะไร`\n' +
              '• `!helpme lungtee`\n' +
              '• `!ภักดีเป็นบ้าใช่มั้ย`\n' +
              '• `!babygrape`',
          },
        )
        .setTimestamp()
        .setFooter({ text: 'Baby Grape Heist System' });

      await message.reply({ embeds: [helpEmbed] });
      return;
    }

    if (content === `${config.prefix}เรนบ้าจริงมั้ยเบบี้เกรป`) {
      await message.reply('อันนี้เบบี้เกรปว่าจริงนะคับๆ');
      return;
    }
    if (content === `${config.prefix}1975คืออะไร`) {
      await message.reply(
        `💬 เมื่อมีคนถามว่า "1975 คืออะไร?"\nมีคนถามบ่อย...\nเสียงกระซิบข้างถนน, ในห้องสอบสวน, หรือใน Discord ตอนตีสอง\n\n“1975 คืออะไรวะ?”\n\nคนที่ไม่รู้ก็หัวเราะ\nคนที่เคยเจอก็เงียบ\nแต่คนที่ “รอดมาเล่าได้” จะบอกสั้น ๆ ว่า:\n\n"1975 ไม่ใช่ชื่อแก๊ง... มันคือคำเตือน"\nเพราะเบื้องหลังตัวเลขธรรมดา\nซ่อนตัวตนของชายคนหนึ่งไว้\nเขาคือ "Merge Realmaflow" หรือ "มาดิ" — ผู้วางหมากในโลกที่ไม่มีใครกล้าตั้งคำถาม\n\nเขาคือคนเดียวที่ Google ยังต้องถามก่อนจะให้คำตอบ\nพรีเซนต์ยังต้องจัดหน้าเองเวลาเขาเดินผ่าน\nในโลกจริง เขาคือความเนี๊ยบในร่างมนุษย์\nแต่ในโลกใต้ดิน... เขาคือผู้เขียนกฎใหม่ให้ถนน\n\nเพราะงั้น ถ้ามีใครยังถามว่า "1975 คืออะไร?"\nอย่าตอบ... แค่ถามกลับว่า\n"นายรู้จักพี่มาดิไหม?"\nถ้าเขาเงียบ — เขารู้\nถ้าเขาหัวเราะ — เขาจะได้รู้... ไม่นาน`,
      );
      return;
    }
    if (content === `${config.prefix}helpme lungtee`) {
      await message.reply(
        'lungteeไม่มีมีแต่เบบี้เกรปค้าฟฟฟ พี่ๆเลิกเพ้อได้แล้วนะ เอาเวลาเพ้อไปงัดร้าน รันแก๊งเถอะคับ',
      );
      return;
    }
    if (content === `${config.prefix}ภักดีเป็นบ้าใช่มั้ย`) {
      await message.reply('เบบี้เกรปว่าเค้าไม่ค่อยเต็มนะคับ');
      return;
    }
    if (content === `${config.prefix}babygrape`) {
      await message.reply('ค้าบบบบบบ');
      return;
    }
  },
};
