const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '房间标题不能为空'],
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    default: '',
    maxlength: 200
  },
  // 房间码，格式：[xxx]Dr.ding#ID邀请你加入个人会场
  inviteCode: {
    type: String,
    required: [true, '房间码不能为空'],
    validate: {
      validator: function(v) {
        return /^\[[a-zA-Z0-9]+\][a-zA-Z0-9._]+#\d+邀请你加入个人会场$/.test(v) && v.length <= 100;
      },
      message: '房间码格式不正确或过长'
    }
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  currentOnline: { type: Number, default: 0 },
  tags: [String],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// 计算热度分数的方法（用于排序）
roomSchema.statics.getHotScore = function(doc) {
  return doc.views * 0.3 + doc.likes * 2 + doc.currentOnline * 5;
};

module.exports = mongoose.model('Room', roomSchema);