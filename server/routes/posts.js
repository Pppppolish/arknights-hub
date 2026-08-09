const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');

// 生成帖子内容文字（后端统一生成，防止前端不一致）
function generateContent(type, params) {
  let template;
  if (type === 'find_people') {
    template = `【寻人】我正在寻找“${params.keyword1}”，目标是“${params.keyword2}”，游戏ID：${params.gameId}。${params.extra ? '补充：' + params.extra : ''}`;
  } else {
    template = `【交换】我有“${params.keyword1}”，想换“${params.keyword2}”，游戏ID：${params.gameId}。${params.extra ? '补充：' + params.extra : ''}`;
  }
  return template.trim();
}

// 发布帖子
router.post('/', auth, async (req, res) => {
  try {
    const { type, params } = req.body;
    if (!type || !['find_people', 'exchange'].includes(type)) {
      return res.status(400).json({ msg: '帖子类型错误' });
    }
    const content = generateContent(type, params);
    const post = new Post({
      author: req.user.userId,
      type,
      params,
      content
    });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// 获取帖子列表（按时间倒序）
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type && ['find_people', 'exchange'].includes(type)) {
      filter.type = type;
    }
    const posts = await Post.find(filter)
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

module.exports = router;