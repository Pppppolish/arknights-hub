const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '昵称不能为空'],
    unique: true,
    trim: true,
    minlength: 1,
    maxlength: 14,
    validate: {
      validator: function(v) {
        return v.length <= 7;
      },
      message: '昵称最多7个字符'
    }
  },
  email: {
    type: String,
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

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
