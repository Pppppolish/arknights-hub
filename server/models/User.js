const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '昵称不能为空'],
    unique: true,
    trim: true,
    minlength: 1,
    maxlength: 14, // 7个汉字约14字节，但实际可能更长，用 maxlength 限定字符数，后面再通过验证函数控制
    validate: {
      validator: function(v) {
        // 限制最多7个汉字或等长字符（粗略判断：\\u4e00-\\u9fff 范围）
        const chineseCount = (v.match(/[\u4e00-\u9fff]/g) || []).length;
        const otherCount = v.length - chineseCount;
        // 简单限制：总字符数不超过7（可根据需求调整）
        return v.length <= 7;
      },
      message: '昵称最多7个字符'
    }
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // 允许为空且唯一索引不报错
    lowercase: true
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: 6
  },
  gameAccount: { type: String, default: '' },
  wechat: { type: String, default: '' },
  qq: { type: String, default: '' },
  showWechat: { type: Boolean, default: false },
  showQQ: { type: Boolean, default: false },
  showGameAccount: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// 密码加密中间件
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);