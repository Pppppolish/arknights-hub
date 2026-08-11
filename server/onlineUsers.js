// server/onlineUsers.js
const onlineUsers = new Map(); // socketId -> { userId, username, roomId }
module.exports = onlineUsers;