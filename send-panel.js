require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const token = process.env.token || process.env.DISCORD_TOKEN;
const controlChannelId = process.env.controlChannelId;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    const channel = await client.channels.fetch(controlChannelId);
    if (!channel) {
      console.error('ไม่พบ control channel');
      process.exit(1);
    }

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('🍇 ระบบลงทะเบียนกิจกรรม (Heist Report)')
      .setDescription(
        'กดปุ่มด้านล่างเพื่อเริ่มลงทะเบียนกิจกรรม\nระบบจะพาไปทีละขั้นตอนจนเสร็จ',
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('start_heist_report')
        .setLabel('เริ่มลงทะเบียน')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📝'),
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log('ส่งแผงลงทะเบียนสำเร็จ');
  } catch (e) {
    console.error(e);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(token);
