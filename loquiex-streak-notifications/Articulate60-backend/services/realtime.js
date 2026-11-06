// Live in-app updates over Socket.IO.
// Each signed-in tab joins a private room ("user:<id>") using the same JWT
// as the REST API. The server emits:
//   streak:status    the member's latest streak status (after a practice,
//                    or when a reminder time arrives)
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*" },
    // Polling first keeps it working behind proxies that block upgrades.
    transports: ["polling", "websocket"],
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided."));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.id;
      if (!userId) return next(new Error("Invalid token payload."));
      socket.data.userId = String(userId);
      next();
    } catch {
      next(new Error("Invalid or expired token."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

async function isUserOnline(userId) {
  if (!io) return false;
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.length > 0;
}

module.exports = { initRealtime, emitToUser, isUserOnline };
