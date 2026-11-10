const io = require('socket.io-client');

async function test() {
  const socket = io('http://localhost:3000');
  
  await new Promise((resolve) => socket.on('connect', resolve));
  console.log('Socket connected:', socket.id);

  // 1. Create Room
  const roomData = await new Promise((resolve) => {
    socket.emit('create_room', { name: 'กัปตันป๊อป', avatar: '🎧', settings: {} });
    socket.on('room_created', resolve);
  });
  console.log('Room created:', roomData.roomCode, 'Host:', roomData.player.name, roomData.player.avatar);

  // 2. Update Profile to new name and avatar
  const updatedList = await new Promise((resolve) => {
    socket.emit('update_profile', { name: 'เทสเตอร์สุดเท่', avatar: '🚀' });
    socket.on('player_list_updated', resolve);
  });

  const me = updatedList.players.find(p => p.id === socket.id);
  console.log('Updated player in room:', me.name, me.avatar);

  if (me.name === 'เทสเตอร์สุดเท่' && me.avatar === '🚀') {
    console.log('✅ TEST PASSED: Profile updated and broadcasted successfully!');
  } else {
    throw new Error('Profile update failed!');
  }

  socket.disconnect();
}

test().then(() => process.exit(0)).catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});

