// server/socket.js
const Room = require('./models/Room');
const onlineUsers = require('./onlineUsers');   // 改为共享模块
const bannedUsers = new Map(); // key: userId, value: roomId

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`⚡ 新连接: ${socket.id}`);

    // 加入房间
    socket.on('joinRoom', async ({ roomId, userId, username }) => {
      if (!userId || !roomId) {
        socket.emit('error', { msg: '无效的请求参数' });
        return;
      }

      if (bannedUsers.has(userId) && bannedUsers.get(userId) === roomId) {
        socket.emit('error', { msg: '你已被该房间禁止加入' });
        return;
      }

      try {
        socket.join(roomId);
        onlineUsers.set(socket.id, { userId, username, roomId });
        console.log(`${username}(${userId}) 加入房间 ${roomId}`);

        const room = await Room.findByIdAndUpdate(
          roomId,
          { $inc: { currentOnline: 1 } },
          { new: true }
        ).populate('creator', 'username');

        socket.to(roomId).emit('userJoined', { userId, username });

        const usersInRoom = [];
        for (const [sid, info] of onlineUsers.entries()) {
          if (info.roomId === roomId) {
            usersInRoom.push({ socketId: sid, userId: info.userId, username: info.username });
          }
        }
        socket.emit('onlineUsers', {
          users: usersInRoom,
          creator: room.creator?._id?.toString()
        });

        io.to(roomId).emit('updateOnline', { online: room.currentOnline });
      } catch (err) {
        console.error('joinRoom error:', err);
      }
    });

    // 音乐控制事件
    socket.on('musicControl', async ({ roomId, action, data }) => {
      const userInfo = onlineUsers.get(socket.id);
      if (!userInfo) return;

      const room = await Room.findById(roomId);
      if (!room || room.creator.toString() !== userInfo.userId) {
        return socket.emit('error', { msg: '只有房主才能控制音乐' });
      }

      io.to(roomId).emit('musicSync', { action, data });
    });

    // 聊天消息
    socket.on('chatMessage', async ({ roomId, content, senderName }) => {
      const safeContent = content.trim().slice(0, 200);
      if (!safeContent) return;
      const message = {
        senderName: senderName || '匿名用户',
        content: safeContent,
        time: new Date().toISOString()
      };
      io.to(roomId).emit('newMessage', message);
    });

    // 踢人事件
    socket.on('kickUser', async ({ userIdToKick, roomId }) => {
      const currentUserInfo = onlineUsers.get(socket.id);
      if (!currentUserInfo) return;

      const room = await Room.findById(roomId);
      if (!room || room.creator.toString() !== currentUserInfo.userId) {
        return socket.emit('error', { msg: '只有房主才能踢人' });
      }

      const targetSockets = [];
      for (const [sid, info] of onlineUsers.entries()) {
        if (info.roomId === roomId && info.userId === userIdToKick) {
          targetSockets.push(sid);
        }
      }

      if (targetSockets.length === 0) {
        return socket.emit('error', { msg: '用户不在房间内' });
      }

      for (const sid of targetSockets) {
        const kickedSocket = io.sockets.sockets.get(sid);
        if (kickedSocket) {
          kickedSocket.leave(roomId);
          kickedSocket.emit('kicked', { msg: '你被房主移出了房间' });
          kickedSocket.disconnect(true);
        }
        onlineUsers.delete(sid);
      }

      bannedUsers.set(userIdToKick, roomId);

      const count = targetSockets.length;
      await Room.findByIdAndUpdate(roomId, { $inc: { currentOnline: -count } });
      const updatedRoom = await Room.findById(roomId);
      io.to(roomId).emit('updateOnline', { online: updatedRoom.currentOnline });
      io.to(roomId).emit('userLeft', { userId: userIdToKick });
      console.log(`踢出用户 ${userIdToKick}，数量：${count}`);
    });

    // 断开连接处理
    socket.on('disconnect', async () => {
      const userInfo = onlineUsers.get(socket.id);
      if (userInfo) {
        const { roomId, userId } = userInfo;
        try {
          await Room.findByIdAndUpdate(roomId, { $inc: { currentOnline: -1 } });
          io.to(roomId).emit('userLeft', { userId });
          const room = await Room.findById(roomId);
          if (room) {
            io.to(roomId).emit('updateOnline', { online: room.currentOnline });
          }
        } catch (err) {
          console.error('disconnect update error:', err);
        }
        onlineUsers.delete(socket.id);
      }
      console.log(`❌ 断开连接: ${socket.id}`);
    });
  });
};