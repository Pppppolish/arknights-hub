const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const auth = require('../middleware/auth');

// 创建房间（需要登录）
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, inviteCode, tags } = req.body;
    // 房间码校验（已更新）
    if (!/^\[[a-zA-Z0-9]+\][\u4e00-\u9fff\u3400-\u4dbfa-zA-Z0-9._]+#\d+邀请你加入个人会场$/u.test(inviteCode) || inviteCode.length > 100) {
      return res.status(400).json({ msg: '房间码格式不正确' });
    }

    // 检查是否已有活跃房间
    const existingRoom = await Room.findOne({ creator: req.user.userId, isActive: true });
    if (existingRoom) {
      return res.status(400).json({ msg: '你已有一个活跃房间，不能创建新房间' });
    }

    const room = new Room({
      title,
      description,
      inviteCode,
      tags,
      creator: req.user.userId
    });
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// 获取大厅列表（热门房间，按热度降序）
router.get('/lobby', async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true })
      .select('-inviteCode') // 列表页不返回完整房间码，防止滥用
      .populate('creator', 'username')
      .lean();
    
    // 计算热度并排序
    rooms.forEach(room => {
      room.hotScore = Room.getHotScore(room);
    });
    rooms.sort((a, b) => b.hotScore - a.hotScore);
    
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// 获取房间详情（增加浏览数）
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('creator', 'username');
    
    if (!room) {
      return res.status(404).json({ msg: '房间不存在' });
    }
    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// 删除房间（仅创建者或管理员）
router.delete('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ msg: '房间不存在' });

    // 检查权限：创建者 或 管理员
    if (room.creator.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ msg: '无权删除此房间' });
    }

    await Room.findByIdAndDelete(req.params.id);

    // 通过 Socket.IO 通知房间内所有用户，并强制他们退出房间
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.id).emit('roomDeleted', { roomId: req.params.id });
      // 让所有已连接的 socket 离开该房间
      const sockets = await io.in(req.params.id).fetchSockets();
      sockets.forEach(socket => socket.leave(req.params.id));
    }

    res.json({ msg: '房间已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

module.exports = router;