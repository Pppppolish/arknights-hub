require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // 开发阶段允许所有来源
});

// 中间件
app.use(cors());
app.use(express.json());

// 路由挂载
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 传递 io 实例给后续中间件和路由
app.set('io', io);

// Socket.IO 核心事件（封装一下，便于管理）
require('./socket')(io);

// 数据库连接并启动服务器
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB 连接成功');
    server.listen(process.env.PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${process.env.PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB 连接失败:', err.message);
    process.exit(1);
  });