// server/routes/admin.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Room = require('../models/Room');
const Post = require('../models/Post');
const onlineUsers = require('../onlineUsers');   // 共享模块

// 所有路由都需要登录且具有管理员权限
router.use(auth, adminAuth);

// ========= 用户管理 =========
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const allowed = ['gameAccount', 'wechat', 'qq', 'showWechat', 'showQQ', 'showGameAccount', 'isAdmin'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ msg: '用户不存在' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ msg: '用户不存在' });
    res.json({ msg: '用户已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// ========= 房间管理 =========
router.get('/rooms', async (req, res) => {
  try {
    const rooms = await Room.find({}).populate('creator', 'username').lean();
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.delete('/rooms/:id', async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ msg: '房间不存在' });
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.id).emit('roomDeleted', { roomId: req.params.id });
      const sockets = await io.in(req.params.id).fetchSockets();
      sockets.forEach(s => s.leave(req.params.id));
    }
    res.json({ msg: '房间已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// ========= 帖子管理 =========
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find({}).populate('author', 'username').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ msg: '帖子不存在' });
    res.json({ msg: '帖子已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// ========= 在线用户 =========
router.get('/online', (req, res) => {
  const users = [];
  for (const [socketId, info] of onlineUsers.entries()) {
    users.push({ socketId, ...info });
  }
  res.json(users);
});

module.exports = router;