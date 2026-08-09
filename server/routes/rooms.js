const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const auth = require('../middleware/auth');

// 创建房间（需要登录）
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, inviteCode, tags } = req.body;
    // 手动校验房间码（双重保险）
    if (!/^\[[a-zA-Z0-9]+\][a-zA-Z0-9._]+#\d+邀请你加入个人会场$/.test(inviteCode) || inviteCode.length > 100) {
      return res.status(400).json({ msg: '房间码格式不正确' });
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

module.exports = router;