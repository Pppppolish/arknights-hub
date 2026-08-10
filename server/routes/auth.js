const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ msg: '昵称和密码不能为空' });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ msg: '昵称已被使用' });
    }
    const user = new User({ username, password });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user: { id: user._id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ msg: '昵称或密码错误' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: '昵称或密码错误' });
    }
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user._id, username: user.username } });
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

// 修改昵称
router.put('/username', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ msg: '新昵称不能为空' });
    // 检查长度（复用模型的验证逻辑）
    const testUser = new User({ username, password: 'temp' });
    const err = testUser.validateSync();
    if (err && err.errors['username']) {
      return res.status(400).json({ msg: err.errors['username'].message });
    }
    // 检查唯一性
    const existing = await User.findOne({ username });
    if (existing && existing._id.toString() !== req.user.userId) {
      return res.status(400).json({ msg: '昵称已被使用' });
    }
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { username } },
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// 修改密码
router.put('/password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ msg: '请输入旧密码和新密码' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ msg: '用户不存在' });
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ msg: '旧密码错误' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ msg: '密码修改成功' });
  } catch (err) {
    console.error(err);
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