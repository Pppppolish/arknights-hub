const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // 从请求头获取 token
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: '未提供认证令牌，请先登录' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // 包含 userId
    next();
  } catch (err) {
    res.status(401).json({ msg: '令牌无效或已过期' });
  }
};