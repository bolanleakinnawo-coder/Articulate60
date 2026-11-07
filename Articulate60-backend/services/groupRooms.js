// Live group practice rooms (audio only).
//
// Audio goes directly between members' browsers (WebRTC, peer to peer). The
// server only:
//   - keeps the list of open rooms and who is in each (in memory),
//   - relays the WebRTC connection messages ("signals") between members,
//   - checks the member's plan and counts their group minutes.
//
// Every room has a short invite code (e.g. "K7M2QF") that members can share.
// A private room is never listed under Open rooms: the only way in is its
// code (or its link). Plan and minute rules apply to everyone who joins.
//
// Rooms live in this process's memory, so a redeploy or restart ends any
// calls in progress (members are told the room closed and can start again).
//
// Socket events, app -> server (each takes an ack callback):
//   group:lobby      { watch: true|false }   follow the open-rooms list
//   group:create     { categoryId, categoryTitle, prompt, private?, code?, max? }
//   group:join       { roomId } or { code }
//   group:lookup     { code }                preview a call before joining
//   group:leave
//   group:signal     { to, data }            WebRTC offer/answer/candidate
//   group:state      { muted?, hand? }
//   group:prompt     { prompt, categoryId?, categoryTitle? }  host only
// Server -> app:
//   group:rooms            open rooms (lobby)
//   group:member-joined    { member }
//   group:member-left      { userId }
//   group:member-updated   { member }
//   group:host             { hostId }
//   group:prompt           { prompt, categoryId, categoryTitle }
//   group:signal           { from, data }
//   group:usage            { total, left, usedThisMonth, usedToday }
//   group:time-up
//   group:ended            { reason }
const crypto = require("crypto");
const User = require("../MODELS/User");
const { hasGroupPractice } = require("../utils/plans");
const { summarise, addMinutes, pruneOld } = require("../utils/groupUsage");

const MAX_MEMBERS = Math.max(2, Number(process.env.GROUP_ROOM_MAX) || 6);
const MINUTE_MS = 60 * 1000;
const LOBBY = "group:lobby";

const rooms = new Map(); // roomId -> room
const codes = new Map(); // invite code -> roomId

// No 0/O, 1/I/L: easy to read out loud and to type.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function normaliseCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

function newCode(preferred) {
  const wanted = normaliseCode(preferred);
  if (
    wanted.length === CODE_LENGTH &&
    [...wanted].every((ch) => CODE_ALPHABET.includes(ch)) &&
    !codes.has(wanted)
  ) {
    return wanted;
  }
  for (;;) {
    const bytes = crypto.randomBytes(CODE_LENGTH);
    let code = "";
    for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
    if (!codes.has(code)) return code;
  }
}

function seatCount(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return MAX_MEMBERS;
  return Math.min(MAX_MEMBERS, Math.max(2, n));
}

function deleteRoom(room) {
  rooms.delete(room.id);
  if (codes.get(room.code) === room.id) codes.delete(room.code);
}

// Slows down anyone trying to guess codes: 10 wrong codes per 10 minutes.
const CODE_TRIES = 10;
const CODE_WINDOW_MS = 10 * 60 * 1000;
const wrongCodes = new Map(); // userId -> [timestamps]

function tooManyWrongCodes(userId) {
  const now = Date.now();
  const recent = (wrongCodes.get(userId) || []).filter(
    (t) => now - t < CODE_WINDOW_MS,
  );
  wrongCodes.set(userId, recent);
  return recent.length >= CODE_TRIES;
}

function noteWrongCode(userId) {
  const list = wrongCodes.get(userId) || [];
  list.push(Date.now());
  wrongCodes.set(userId, list);
}

// Finds a room by code. Returns { room } or { error }.
function roomForCode(userId, value) {
  if (tooManyWrongCodes(userId)) return { error: "slow-down" };
  const code = normaliseCode(value);
  if (code.length !== CODE_LENGTH) return { error: "bad-code" };
  const room = rooms.get(codes.get(code));
  if (!room) {
    noteWrongCode(userId);
    return { error: "no-code" };
  }
  return { room };
}
const memberships = new Map(); // userId -> { roomId, socketId }

let io = null;

function clean(text, max) {
  return typeof text === "string" ? text.trim().slice(0, max) : "";
}

function publicMember(m) {
  return {
    userId: m.userId,
    name: m.name,
    avatar: m.avatar,
    muted: m.muted,
    hand: m.hand,
    joinedAt: m.joinedAt,
  };
}

function publicRoom(room) {
  return {
    id: room.id,
    categoryId: room.categoryId,
    categoryTitle: room.categoryTitle,
    prompt: room.prompt,
    hostId: room.hostId,
    hostName: room.members.get(room.hostId)?.name || "",
    code: room.code,
    private: room.private,
    createdAt: room.createdAt,
    max: room.max || MAX_MEMBERS,
    members: [...room.members.values()].map(publicMember),
  };
}

function openRooms() {
  return [...rooms.values()]
    .filter((room) => !room.private)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(publicRoom);
}

function broadcastLobby() {
  if (io) io.to(LOBBY).emit("group:rooms", openRooms());
}

function usagePayload(summary) {
  return {
    total: summary.total,
    left: summary.left,
    usedThisMonth: summary.usedThisMonth,
    usedToday: summary.usedToday,
  };
}

// Takes a member out of their room (and closes the room when it's empty).
function removeMember(userId, { notifySelf = null } = {}) {
  const membership = memberships.get(userId);
  if (!membership) return;
  memberships.delete(userId);
  const room = rooms.get(membership.roomId);
  if (!room) return;
  const member = room.members.get(userId);
  room.members.delete(userId);

  const socket = io?.sockets.sockets.get(membership.socketId);
  if (socket) {
    socket.leave(`group-room:${room.id}`);
    if (notifySelf) socket.emit("group:ended", { reason: notifySelf });
  }

  if (room.members.size === 0) {
    deleteRoom(room);
  } else {
    io.to(`group-room:${room.id}`).emit("group:member-left", { userId });
    if (room.hostId === userId) {
      // The longest-standing member becomes host.
      const next = [...room.members.values()].sort(
        (a, b) => a.joinedAt - b.joinedAt,
      )[0];
      room.hostId = next.userId;
      io.to(`group-room:${room.id}`).emit("group:host", {
        hostId: room.hostId,
      });
    }
  }
  if (member && !room.private) broadcastLobby();
}

async function loadMember(userId) {
  return User.findById(userId, {
    fullName: 1,
    username: 1,
    profileImageUrl: 1,
    plan: 1,
    planExpiresAt: 1,
    timeZone: 1,
    groupMinutes: 1,
  });
}

// Checks plan and minutes. Returns { user, summary } or { error }.
async function checkAccess(userId) {
  const user = await loadMember(userId);
  if (!user) return { error: "not-found" };
  if (!hasGroupPractice(user)) return { error: "no-plan" };
  const summary = summarise(user);
  if (summary.left !== null && summary.left <= 0)
    return { error: "time-up", summary };
  return { user, summary };
}

function addToRoom(socket, room, user, summary) {
  const userId = socket.data.userId;
  // One room at a time: joining again (new tab/device) replaces the old seat.
  const existing = memberships.get(userId);
  if (existing) {
    removeMember(userId, {
      notifySelf: existing.socketId === socket.id ? null : "joined-elsewhere",
    });
  }
  // Re-joining an otherwise empty room closes it above; keep it open.
  if (!rooms.has(room.id)) {
    rooms.set(room.id, room);
    codes.set(room.code, room.id);
  }

  const now = Date.now();
  const member = {
    userId,
    socketId: socket.id,
    name: user.fullName || user.username || "Member",
    avatar: user.profileImageUrl || "",
    timeZone: user.timeZone || "",
    muted: false,
    hand: false,
    joinedAt: now,
    nextChargeAt: now + MINUTE_MS,
    usage: usagePayload(summary),
  };
  const others = [...room.members.values()].map(publicMember);
  room.members.set(userId, member);
  memberships.set(userId, { roomId: room.id, socketId: socket.id });
  socket.join(`group-room:${room.id}`);
  socket
    .to(`group-room:${room.id}`)
    .emit("group:member-joined", { member: publicMember(member) });
  if (!room.private) broadcastLobby();
  pruneOld(user).catch(() => {});
  return { room: publicRoom(room), others, self: publicMember(member) };
}

function errorMessage(code) {
  switch (code) {
    case "no-plan":
      return "Group practice comes with Loquiex Flourish and Infinity.";
    case "time-up":
      return "You've used all your group practice minutes for this month.";
    case "full":
      return "This room is full. Try another room or start your own.";
    case "gone":
      return "This room has closed.";
    case "bad-code":
      return "Codes have 6 letters and numbers. Check the code and try again.";
    case "no-code":
      return "No live call has that code. It may have ended, or the code has a typo.";
    case "slow-down":
      return "Too many wrong codes. Please wait a few minutes and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function fail(ack, code, extra = {}) {
  if (typeof ack === "function")
    ack({ ok: false, error: code, message: errorMessage(code), ...extra });
}

function registerGroupHandlers(socket) {
  const userId = socket.data.userId;

  socket.on("group:lobby", (payload, ack) => {
    if (payload?.watch === false) socket.leave(LOBBY);
    else socket.join(LOBBY);
    if (typeof ack === "function")
      ack({ ok: true, rooms: openRooms(), max: MAX_MEMBERS });
  });

  socket.on("group:create", async (payload, ack) => {
    try {
      const access = await checkAccess(userId);
      if (access.error)
        return fail(
          ack,
          access.error,
          access.summary ? { usage: usagePayload(access.summary) } : {},
        );
      const room = {
        id: crypto.randomBytes(6).toString("hex"),
        // Reconnecting hosts get their old code back if it's still free.
        code: newCode(payload?.code),
        private: payload?.private === true,
        // The host picks how many seats (2 up to the server limit).
        max: seatCount(payload?.max),
        categoryId: clean(payload?.categoryId, 60),
        categoryTitle: clean(payload?.categoryTitle, 80) || "Open conversation",
        prompt: clean(payload?.prompt, 500),
        hostId: userId,
        createdAt: Date.now(),
        members: new Map(),
      };
      rooms.set(room.id, room);
      codes.set(room.code, room.id);
      const joined = addToRoom(socket, room, access.user, access.summary);
      ack?.({ ok: true, ...joined, usage: usagePayload(access.summary) });
    } catch (err) {
      console.error("group:create", err);
      fail(ack, "error");
    }
  });

  // Preview a call from its code (topic, host, who's in) before joining.
  socket.on("group:lookup", async (payload, ack) => {
    const found = roomForCode(userId, payload?.code);
    if (found.error) return fail(ack, found.error);
    ack?.({ ok: true, room: publicRoom(found.room) });
  });

  socket.on("group:join", async (payload, ack) => {
    try {
      let room;
      if (payload?.code) {
        const found = roomForCode(userId, payload.code);
        if (found.error) return fail(ack, found.error);
        room = found.room;
      } else {
        room = rooms.get(String(payload?.roomId || ""));
      }
      if (!room) return fail(ack, "gone");
      const access = await checkAccess(userId);
      if (access.error)
        return fail(
          ack,
          access.error,
          access.summary ? { usage: usagePayload(access.summary) } : {},
        );
      const already = room.members.has(userId);
      if (!already && room.members.size >= (room.max || MAX_MEMBERS))
        return fail(ack, "full");
      const joined = addToRoom(socket, room, access.user, access.summary);
      ack?.({ ok: true, ...joined, usage: usagePayload(access.summary) });
    } catch (err) {
      console.error("group:join", err);
      fail(ack, "error");
    }
  });

  socket.on("group:leave", (_payload, ack) => {
    const m = memberships.get(userId);
    if (m && m.socketId === socket.id) removeMember(userId);
    if (typeof ack === "function") ack({ ok: true });
  });

  // Relays WebRTC messages to one member of the same room.
  socket.on("group:signal", (payload) => {
    const mine = memberships.get(userId);
    const theirs = memberships.get(String(payload?.to || ""));
    if (!mine || !theirs || mine.socketId !== socket.id) return;
    if (mine.roomId !== theirs.roomId) return;
    io.to(theirs.socketId).emit("group:signal", {
      from: userId,
      data: payload.data,
    });
  });

  socket.on("group:state", (payload) => {
    const m = memberships.get(userId);
    const room = m && rooms.get(m.roomId);
    const member = room?.members.get(userId);
    if (!member || m.socketId !== socket.id) return;
    if (typeof payload?.muted === "boolean") member.muted = payload.muted;
    if (typeof payload?.hand === "boolean") member.hand = payload.hand;
    io.to(`group-room:${room.id}`).emit("group:member-updated", {
      member: publicMember(member),
    });
  });

  socket.on("group:prompt", (payload) => {
    const m = memberships.get(userId);
    const room = m && rooms.get(m.roomId);
    if (!room || room.hostId !== userId) return;
    const prompt = clean(payload?.prompt, 500);
    if (!prompt) return;
    room.prompt = prompt;
    if (payload.categoryId) {
      room.categoryId = clean(payload.categoryId, 60);
      room.categoryTitle =
        clean(payload.categoryTitle, 80) || room.categoryTitle;
    }
    io.to(`group-room:${room.id}`).emit("group:prompt", {
      prompt: room.prompt,
      categoryId: room.categoryId,
      categoryTitle: room.categoryTitle,
    });
    if (!room.private) broadcastLobby();
  });

  socket.on("disconnect", () => {
    const m = memberships.get(userId);
    if (m && m.socketId === socket.id) removeMember(userId);
  });
}

// Every few seconds, charge one minute to each member who has spent a full
// minute in a room with at least one other person. Time alone in a room
// waiting for others is not counted.
async function chargeMinutes() {
  const now = Date.now();
  for (const room of rooms.values()) {
    const together = room.members.size >= 2;
    for (const member of [...room.members.values()]) {
      if (!together) {
        member.nextChargeAt = now + MINUTE_MS;
        continue;
      }
      if (now < member.nextChargeAt) continue;
      member.nextChargeAt += MINUTE_MS;
      try {
        const summary = await addMinutes(member.userId, member.timeZone, 1);
        if (!summary) continue;
        member.usage = usagePayload(summary);
        io.to(member.socketId).emit("group:usage", member.usage);
        if (summary.left !== null && summary.left <= 0) {
          io.to(member.socketId).emit("group:time-up");
          removeMember(member.userId);
        }
      } catch (err) {
        console.error("group minutes", err);
      }
    }
  }
}

let ticking = false;
function initGroupRooms(server) {
  io = server;
  setInterval(async () => {
    if (ticking) return;
    ticking = true;
    try {
      await chargeMinutes();
    } finally {
      ticking = false;
    }
  }, 5000).unref?.();
}

module.exports = {
  initGroupRooms,
  registerGroupHandlers,
  openRooms,
  MAX_MEMBERS,
};
