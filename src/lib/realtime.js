import { io } from "socket.io-client";

// One shared Socket.IO connection for live in-app updates. It signs in with
// the same token as the API and joins the member's private room.
// Events from the server:
//   streak:status  the latest streak status (after a practice on any
//                  device, or when a reminder time arrives)
//   group:*        group practice rooms (see src/lib/groupCall.js)
let socket = null;
let socketToken = null;

export function getSocket() {
  const token = localStorage.getItem("token");
  const url = import.meta.env.VITE_API_URL;
  if (!token || !url) return null;
  if (socket && socketToken === token) return socket;
  if (socket) socket.disconnect();
  socketToken = token;
  socket = io(url, {
    auth: { token },
    transports: ["polling", "websocket"],
    reconnectionDelayMax: 30000,
  });
  return socket;
}

// Calls `handler(status)` whenever the server sends a new streak status.
// Returns a function that stops listening.
export function onStreakStatus(handler) {
  const s = getSocket();
  if (!s) return () => {};
  s.on("streak:status", handler);
  return () => s.off("streak:status", handler);
}

// Calls `handler()` each time the connection comes back after a drop, so
// pages can catch up on anything they missed.
export function onReconnect(handler) {
  const s = getSocket();
  if (!s) return () => {};
  s.io.on("reconnect", handler);
  return () => s.io.off("reconnect", handler);
}

export function disconnectRealtime() {
  if (socket) socket.disconnect();
  socket = null;
  socketToken = null;
}
