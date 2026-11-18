const config = require('../config');
const { setSetting, getSetting, logAudit } = require('../database');

async function archiveAndCreateNewChannel(client) {
  console.log('เบบี้เกรปได้รับสัญญาณ! กำลังจะเก็บห้องเก่าเข้ากรุแล้วน้า~');

  try {
    let targetId = getSetting('target_channel_id') || config.channels.target;

    const originalChannel = await client.channels.fetch(targetId);
    const archiveCategory = await client.channels.fetch(
      config.channels.archiveCategory,
    );

    if (!originalChannel || !archiveCategory) {
      return console.error('หาห้องเป้าหมายหรือหมวดหมู่เก็บประวัติไม่เจอ!');
    }

    await originalChannel.send(
      '**⚠️ ประกาศจากเบบี้เกรป ⚠️**\nห้องนี้กำลังจะถูกรีเซ็ตในอีก **10 วินาที** นะคร้าฟ...',
    );
    await sleep(5000);
    await originalChannel.send('...**5**...');
    await sleep(1000);
    await originalChannel.send('...**4**...');
    await sleep(1000);
    await originalChannel.send('...**3**...');
    await sleep(1000);
    await originalChannel.send('...**2**...');
    await sleep(1000);
    await originalChannel.send('...**1**...');
    await sleep(1000);
    await originalChannel.send('**เริ่มทำการรีเซ็ตคับเบบี๋**');

    const transformedPermissions = originalChannel.permissionOverwrites.cache.map(
      (p) => ({
        id: p.id,
        allow: p.allow.bitfield.toString(),
        deny: p.deny.bitfield.toString(),
        type: p.type === 0 ? 'role' : 'member',
      }),
    );

    const channelData = {
      name: originalChannel.name,
      type: originalChannel.type,
      topic: originalChannel.topic,
      position: originalChannel.position,
      parent: originalChannel.parent,
      permissionOverwrites: transformedPermissions,
    };

    const date = new Date();
    const dateString = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    const archiveName = `${channelData.name}-ประวัติ-ลบ-${dateString}`;

    const archivePermissions = [
      {
        id: originalChannel.guild.roles.everyone.id,
        deny: ['ViewChannel'],
      },
      {
        id: config.roles.admin,
        allow: ['ViewChannel', 'ReadMessageHistory'],
      },
      {
        id: client.user.id,
        allow: ['ViewChannel', 'ManageChannels', 'ManageRoles'],
      },
    ];

    await originalChannel.edit({
      name: archiveName,
      parent: archiveCategory.id,
      permissionOverwrites: archivePermissions,
    });
    console.log(`ห้องเก่าถูกเก็บเข้ากรุและซ่อนในชื่อ "${archiveName}" เรียบร้อย!`);

    const newChannel = await originalChannel.guild.channels.create({
      ...channelData,
    });
    console.log(`สร้างห้องใหม่ "${newChannel.name}" สำเร็จ! ID คือ: ${newChannel.id}`);

    setSetting('target_channel_id', newChannel.id);
    console.log(`อัปเดต ID ห้องเป้าหมายในฐานข้อมูลเป็น: ${newChannel.id}`);

    await newChannel.send(
      `hello 1975 ⋆｡˚ ☁︎ ˚｡⋆｡ \nเบบี้เกรปลบห้องเก่าสร้างห้องใหม่ให้ละคร้าฟฟ! ก็เหมือนอกไก่ต้องมีคนหมัก อกหักต้องมีคนใหม่นะคะพี่ๆ สุดท้ายนี้องุ่นโสด จุ้บๆ`,
    );

    logAudit(client.user.id, 'archive_channel', 'channel', originalChannel.id, {
      archiveName,
      newChannelId: newChannel.id,
    });
  } catch (error) {
    console.error('[แงงง~] เบบี้เกรปทำพลาด (ส่วนเก็บห้อง):', error);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { archiveAndCreateNewChannel };
