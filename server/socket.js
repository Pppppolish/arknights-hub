const Room = require('./models/Room');

module.exports = (io) => {
  // 存储 socket.id -> { userId, username, roomId }
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`⚡ 新连接: ${socket.id}`);

    // 加入房间
    socket.on('joinRoom', async ({ roomId, userId, username }) => {
      try {
        socket.join(roomId);
        onlineUsers.set(socket.id, { userId, username, roomId });
        console.log(`${username}(${userId}) 加入房间 ${roomId}`);

        // 更新在线人数
        const room = await Room.findByIdAndUpdate(
          roomId,
          { $inc: { currentOnline: 1 } },
          { new: true }
        ).populate('creator', 'username');

        // 广播给房间内其他人的消息：新用户加入
        socket.to(roomId).emit('userJoined', { userId, username });
        
        // 发送当前房间所有用户列表（包含房主信息）给新加入者
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

        // 更新在线人数（所有人都收到）
        io.to(roomId).emit('updateOnline', { online: room.currentOnline });
      } catch (err) {
        console.error('joinRoom error:', err);
      }
    });

    // 聊天消息（只发预制消息，但保留兼容）
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

    // 踢人事件（需要房主权限）
    socket.on('kickUser', async ({ userIdToKick, roomId }) => {
      // 获取当前操作者信息
      const currentUserInfo = onlineUsers.get(socket.id);
      if (!currentUserInfo) return;
      
      // 检查当前操作者是否为房主
      const room = await Room.findById(roomId);
      if (!room || room.creator.toString() !== currentUserInfo.userId) {
        return socket.emit('error', { msg: '只有房主才能踢人' });
      }

      // 遍历在线用户，找到目标用户的 socket 并将其踢出
      let kickedSid = null;
      for (const [sid, info] of onlineUsers.entries()) {
        if (info.roomId === roomId && info.userId === userIdToKick) {
          kickedSid = sid;
          break;
        }
      }
      if (!kickedSid) {
        return socket.emit('error', { msg: '用户不在房间内' });
      }

      const kickedSocket = io.sockets.sockets.get(kickedSid);
      if (kickedSocket) {
        kickedSocket.leave(roomId);
        kickedSocket.emit('kicked', { msg: '你被房主移出了房间' });
        kickedSocket.disconnect(true);
      }
      // 从映射中移除
      onlineUsers.delete(kickedSid);
      // 更新在线人数
      await Room.findByIdAndUpdate(roomId, { $inc: { currentOnline: -1 } });
      io.to(roomId).emit('updateOnline', { online: room.currentOnline - 1 }); // 注意这里要重新 fetch 或者减去1
      // 广播离开消息
      io.to(roomId).emit('userLeft', { userId: userIdToKick });
    });

    // 断开连接处理（玩家离开）
    socket.on('disconnect', async () => {
      const userInfo = onlineUsers.get(socket.id);
      if (userInfo) {
        const { roomId, userId } = userInfo;
        try {
          await Room.findByIdAndUpdate(roomId, { $inc: { currentOnline: -1 } });
          io.to(roomId).emit('updateOnline', { online: 0 }); // 需要精确计算，可再 fetch
          io.to(roomId).emit('userLeft', { userId });
          // 正确获取最新的在线数
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