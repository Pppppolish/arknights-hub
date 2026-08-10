const Room = require('./models/Room');
const bannedUsers = new Map(); // key: userId, value: roomId

module.exports = (io) => {
  // 存储 socket.id -> { userId, username, roomId }
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`⚡ 新连接: ${socket.id}`);

    // 加入房间
    socket.on('joinRoom', async ({ roomId, userId, username }) => {
      // 参数校验
      if (!userId || !roomId) {
        socket.emit('error', { msg: '无效的请求参数' });
        return;
      }

      // 检查是否被禁止加入
      if (bannedUsers.has(userId) && bannedUsers.get(userId) === roomId) {
        socket.emit('error', { msg: '你已被该房间禁止加入' });
        return;
      }

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

        // 广播给房间内其他人：新用户加入
        socket.to(roomId).emit('userJoined', { userId, username });

        // 发送当前房间所有用户列表（包含房主信息）
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

        // 更新在线人数
        io.to(roomId).emit('updateOnline', { online: room.currentOnline });
      } catch (err) {
        console.error('joinRoom error:', err);
      }
    });

    // 音乐控制事件（仅房主可操作）—— 修改为广播给房间内所有人，包括房主自己
    socket.on('musicControl', async ({ roomId, action, data }) => {
      const userInfo = onlineUsers.get(socket.id);
      if (!userInfo) return;

      // 验证房主身份
      const room = await Room.findById(roomId);
      if (!room || room.creator.toString() !== userInfo.userId) {
        return socket.emit('error', { msg: '只有房主才能控制音乐' });
      }

      // 将控制指令广播给房间内所有成员（包括房主自己，多设备同步）
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

    // 踢人事件（需要房主权限）
    socket.on('kickUser', async ({ userIdToKick, roomId }) => {
      const currentUserInfo = onlineUsers.get(socket.id);
      if (!currentUserInfo) return;

      // 检查操作者是否是房主
      const room = await Room.findById(roomId);
      if (!room || room.creator.toString() !== currentUserInfo.userId) {
        return socket.emit('error', { msg: '只有房主才能踢人' });
      }

      // 查找目标用户的所有 socket (可能多设备登录)
      const targetSockets = [];
      for (const [sid, info] of onlineUsers.entries()) {
        if (info.roomId === roomId && info.userId === userIdToKick) {
          targetSockets.push(sid);
        }
      }

      if (targetSockets.length === 0) {
        return socket.emit('error', { msg: '用户不在房间内' });
      }

      // 将所有目标 socket 踢出房间并断开
      for (const sid of targetSockets) {
        const kickedSocket = io.sockets.sockets.get(sid);
        if (kickedSocket) {
          kickedSocket.leave(roomId);
          kickedSocket.emit('kicked', { msg: '你被房主移出了房间' });
          kickedSocket.disconnect(true);
        }
        onlineUsers.delete(sid);
      }

      // 加入黑名单，禁止再次加入
      bannedUsers.set(userIdToKick, roomId);

      // 更新在线人数（可能踢出多个设备，但只需要减一次在线数？实际每个 socket 对应一个 currentOnline 计数，需要减去真实数量）
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