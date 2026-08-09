const Room = require('./models/Room');

module.exports = (io) => {
  // 存储 socket.id -> userId 和 roomId 的映射，用于退出时清理
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`⚡ 新连接: ${socket.id}`);

    // 1. 加入房间
    socket.on('joinRoom', async ({ roomId, userId }) => {
      try {
        // 用户加入指定 channel
        socket.join(roomId);
        onlineUsers.set(socket.id, { userId, roomId });
        console.log(`${userId} 加入了房间 ${roomId}`);

        // 增加在线人数，并广播给房间内其他人
        const room = await Room.findByIdAndUpdate(
          roomId,
          { $inc: { currentOnline: 1 } },
          { new: true }
        );
        if (room) {
          io.to(roomId).emit('updateOnline', { online: room.currentOnline });
        }
      } catch (err) {
        console.error('joinRoom error:', err);
      }
    });

    // 2. 聊天消息（预制/自定义）
    socket.on('chatMessage', async ({ roomId, content, senderName }) => {
      // 简单过滤：去除前后空格，限制长度
      const safeContent = content.trim().slice(0, 200);
      if (!safeContent) return;

      // 构造消息对象
      const message = {
        senderName: senderName || '匿名用户',
        content: safeContent,
        time: new Date().toISOString()
      };

      // 向房间内所有人广播（包括发送者自身，确保消息立即显示）
      io.to(roomId).emit('newMessage', message);
    });

    // 3. 离开房间（断开连接时自动处理）
    socket.on('disconnect', async () => {
      const userInfo = onlineUsers.get(socket.id);
      if (userInfo) {
        const { roomId } = userInfo;
        try {
          const room = await Room.findByIdAndUpdate(
            roomId,
            { $inc: { currentOnline: -1 } },
            { new: true }
          );
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