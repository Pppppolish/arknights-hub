// server/middleware/adminAuth.js
module.exports = function(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ msg: '需要管理员权限' });
  }
  next();
};