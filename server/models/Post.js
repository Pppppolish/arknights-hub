const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['find_people', 'exchange'], // 寻人 / 交换
    required: true
  },
  // 存储模板参数（便于以后搜索/过滤）
  params: {
    keyword1: String,  // 例如 “要找的人” 或 “我的东西”
    keyword2: String,  // “目标” 或 “想换的东西”
    gameId: String,
    extra: String     // 额外说明，可选
  },
  // 最终生成的展示文本
  content: {
    type: String,
    required: true
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);