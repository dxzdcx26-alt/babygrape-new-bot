const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('แสดงคำสั่งทั้งหมดของเบบี้เกรป'),

  async execute(interaction) {
    const helpEmbed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('🍇 คำสั่งทั้งหมดของเบบี้เกรป 🍇')
      .setDescription('นี่คือคำสั่งทั้งหมดที่สามารถใช้งานได้ค่ะ')
      .addFields(
        {
          name: '--- 📝 สำหรับสมาชิกทุกคน ---',
          value:
            '• **กดปุ่ม** ในห้อง Control เพื่อเริ่มบันทึกผลงาน (Heist Report)\n' +
            '• `/help` - แสดงคำสั่งนี้\n' +
            '• `/profile` - ดูโปรไฟล์และคะแนนของตัวเอง\n' +
            '• `/checkin` - เช็คชื่อ (เมื่อมีรอบเปิด)\n' +
            '• `/leave` - แจ้งลา',
        },
        {
          name: '--- 🛠️ สำหรับแอดมินเท่านั้น ---',
          value:
            '• `!reset` - สั่งรีเซ็ตห้องแชทเป้าหมายทันที\n' +
            '• `/score` - จัดการคะแนนรายสัปดาห์ (เพิ่ม/ลบ/ตั้งค่า)\n' +
            '• `/weekly_reset` - ตัดรอบคะแนนประจำสัปดาห์ และโอนไปเป็นคะแนนสะสมรายเดือน\n' +
            '• `/checkin open|close` - เปิด/ปิดรอบเช็คชื่อ',
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

    await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
  },
};
