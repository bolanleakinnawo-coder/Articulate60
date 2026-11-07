// Live in-app updates over Socket.IO.
// Each signed-in tab joins a private room ("user:<id>") using the same JWT
// as the REST API. The server emits:
//   streak:status    the member's latest streak status (after a practice,
//                    or when a reminder time arrives)
//   group:*          group practice rooms (see services/groupRooms.js)
const { Server } = require("socket.io");
const { verifyToken } = require("../utils/authToken");
const { initGroupRooms, registerGroupHandlers } = require("./groupRooms");

let io = null;

function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*" },
    // Polling first keeps it working behind proxies that block upgrades.
    transports: ["polling", "websocket"],
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided."));
      const { userId } = await verifyToken(token);
      socket.data.userId = userId;
      next();
    } catch (err) {
      next(new Error(err.code ? err.message : "Invalid or expired token."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
    // Group practice rooms and call signalling (services/groupRooms.js).
    registerGroupHandlers(socket);
  });

  initGroupRooms(io);

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

// Closes every open tab of a member (after a password reset or account
// deletion). Leaving a group room happens in the socket's disconnect handler.
function disconnectUser(userId, event, payload) {
  if (!io) return;
  const room = io.to(`user:${userId}`);
  if (event) room.emit(event, payload);
  io.in(`user:${userId}`).disconnectSockets(true);
}

module.exports = { initRealtime, emitToUser, isUserOnline, disconnectUser };
