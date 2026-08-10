const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 获取用户公开信息（无需登录）
router.get('/:id/public', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -email -isAdmin');
    if (!user) return res.status(404).json({ msg: '用户不存在' });
    
    // 根据隐私设置过滤联系方式
    const publicUser = {
      _id: user._id,
      username: user.username,
      gameAccount: user.showGameAccount ? user.gameAccount : '',
      wechat: user.showWechat ? user.wechat : '',
      qq: user.showQQ ? user.qq : '',
      createdAt: user.createdAt
    };
    res.json(publicUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

module.exports = router;