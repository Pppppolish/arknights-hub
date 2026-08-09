const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    // 检查用户是否已存在
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ msg: '用户名或邮箱已被注册' });
    }
    const user = new User({ username, email, password });
    await user.save();

    // 生成 JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ msg: '邮箱或密码错误' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: '邮箱或密码错误' });
    }
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// 获取当前用户信息（需要认证）
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: '服务器错误' });
  }
});

// 更新个人资料（联系方式 + 隐私开关）
router.put('/me', auth, async (req, res) => {
  try {
    const allowedFields = ['gameAccount', 'wechat', 'qq', 'showWechat', 'showQQ', 'showGameAccount'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ msg: '用户不存在' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

module.exports = router;