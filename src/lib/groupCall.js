// Live audio for group practice.
//
// Audio travels directly between members' browsers (WebRTC). The server only
// passes connection messages along (Socket.IO, see src/lib/realtime.js) and
// counts minutes. Each pair of members has one connection; the member who
// joins later always starts it, so two people never "call" each other at
// the same moment.
import api from "../api/axios";
import { getSocket } from "./realtime";
import { requestMic } from "./microphone";

const FALLBACK_ICE = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

let iceCache = null;
async function loadIceServers() {
  if (iceCache && iceCache.until > Date.now()) return iceCache.servers;
  try {
    const { data } = await api.get("/api/group/ice");
    const servers = data.iceServers?.length ? data.iceServers : FALLBACK_ICE;
    iceCache = { servers, until: Date.now() + 60 * 60 * 1000 };
    return servers;
  } catch {
    return FALLBACK_ICE;
  }
}

// Socket.IO call with an acknowledgement, as a promise.
export function groupRequest(event, payload, timeoutMs = 60000) {
  const socket = getSocket();
  if (!socket) return Promise.resolve({ ok: false, error: "signed-out" });
  return new Promise((resolve) => {
    socket.timeout(timeoutMs).emit(event, payload, (err, reply) =>
      resolve(
        err
          ? {
              ok: false,
              error: "timeout",
              message:
                "We couldn't reach the server. Check your connection and try again.",
            }
          : reply,
      ),
    );
  });
}

// Invite codes: 6 letters/numbers, no 0/O or 1/I/L (see the server).
export const CODE_LENGTH = 6;
export function normaliseCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);
}

// Link that opens the join screen for a code.
export function inviteLink(code) {
  return `${window.location.origin}/app/group-practice/join/${code}`;
}

// Looks up a live call by its code without joining it.
export function lookupCode(code) {
  return groupRequest("group:lookup", { code: normaliseCode(code) }, 20000);
}

// Watches the open-rooms list. Returns a function that stops watching.
export function watchRooms(onRooms, onConnection) {
  const socket = getSocket();
  if (!socket) {
    onConnection?.("signed-out");
    return () => {};
  }
  const subscribe = () => {
    onConnection?.("connected");
    socket.emit("group:lobby", { watch: true }, (reply) => {
      if (reply?.rooms) onRooms(reply.rooms);
    });
  };
  const down = () => onConnection?.("connecting");
  socket.on("group:rooms", onRooms);
  socket.on("connect", subscribe);
  socket.on("disconnect", down);
  if (socket.connected) subscribe();
  else onConnection?.("connecting");
  return () => {
    socket.off("group:rooms", onRooms);
    socket.off("connect", subscribe);
    socket.off("disconnect", down);
    if (socket.connected) socket.emit("group:lobby", { watch: false });
  };
}

const SPEAKING_LEVEL = 0.035;

// One live call. `onChange(snapshot)` runs whenever anything changes.
export class GroupCall {
  constructor(onChange) {
    this.onChange = onChange;
    this.socket = getSocket();
    this.selfId = null;
    this.room = null;
    this.members = new Map(); // userId -> member (from server)
    this.peers = new Map(); // userId -> { pc, offerer, pending, audio, state }
    this.speaking = new Set();
    this.localStream = null;
    this.micError = null;
    this.muted = false;
    this.hand = false;
    this.usage = null;
    this.status = "idle"; // idle | joining | live | ended
    this.endReason = null;
    this.audioBlocked = false;
    this.handlers = [];
    this.meters = new Map();
    this.audioCtx = null;
    this.closed = false;
    this.joinedAt = null;
  }

  snapshot() {
    return {
      status: this.status,
      joinedAt: this.joinedAt,
      endReason: this.endReason,
      selfId: this.selfId,
      room: this.room,
      members: [...this.members.values()].map((m) => ({
        ...m,
        isSelf: m.userId === this.selfId,
        speaking: this.speaking.has(m.userId),
        connection:
          m.userId === this.selfId
            ? "connected"
            : this.peers.get(m.userId)?.state || "connecting",
      })),
      muted: this.muted,
      hand: this.hand,
      micError: this.micError,
      usage: this.usage,
      audioBlocked: this.audioBlocked,
      hasMic: Boolean(this.localStream),
      isHost: this.room?.hostId === this.selfId,
    };
  }

  emit() {
    if (!this.closed || this.status === "ended") this.onChange(this.snapshot());
  }

  on(event, fn) {
    this.socket.on(event, fn);
    this.handlers.push([event, fn]);
  }

  // Uses the stream the member already allowed on the join screen. Without
  // one they join to listen, and can turn the mic on later with Unmute.
  useStream(stream) {
    if (!stream) {
      this.micError = this.micError || "listen-only";
      this.muted = true;
      return;
    }
    this.localStream = stream;
    this.micError = null;
    this.muted = false;
    this.meter(this.selfIdOrLocal(), stream);
  }

  // Turns the microphone on during a call (after joining without it).
  // Returns { ok } or { error } (see requestMic).
  async enableMic() {
    if (this.localStream) {
      this.setMuted(false);
      return { ok: true };
    }
    const result = await requestMic();
    if (this.closed || this.status === "ended") {
      result.stream?.getTracks().forEach((t) => t.stop());
      return { error: "ended" };
    }
    if (result.error) {
      this.micError = result.error;
      this.emit();
      return result;
    }
    this.localStream = result.stream;
    const track = result.stream.getAudioTracks()[0];
    // Every connection already has an audio slot, so the new track simply
    // starts flowing: no reconnecting needed.
    for (const peer of this.peers.values()) {
      const sender = peer.transceiver?.sender;
      if (sender) sender.replaceTrack(track).catch(() => {});
    }
    this.micError = null;
    this.meter(this.selfIdOrLocal(), result.stream);
    this.setMuted(false);
    return { ok: true };
  }

  selfIdOrLocal() {
    return this.selfId || "__self";
  }

  // `action` is { create: {categoryId, categoryTitle, prompt, private, max} },
  // { roomId } or { code }. `stream` is the microphone the member allowed
  // (none = join to listen only).
  async join(action, { stream = null } = {}) {
    if (!this.socket) {
      this.end("signed-out");
      return;
    }
    this.status = "joining";
    this.emit();
    // Unlock audio playback while we still have the tap that started this.
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        this.audioCtx = new Ctx();
        this.audioCtx.resume?.();
      }
    } catch {
      this.audioCtx = null;
    }

    this.useStream(stream);
    this.iceServers = await loadIceServers();
    if (this.closed) return;

    this.bindSocket();
    await this.enterRoom(action);
  }

  async enterRoom(action) {
    const reply = action.create
      ? await groupRequest("group:create", action.create)
      : action.code
        ? await groupRequest("group:join", { code: action.code })
        : await groupRequest("group:join", { roomId: action.roomId });
    if (this.closed) {
      if (reply?.ok) this.socket.emit("group:leave");
      return;
    }
    if (!reply?.ok && reply?.error === "gone" && action.recreate) {
      // The room closed while we were offline (e.g. we were alone in it):
      // open it again with the same topic.
      await this.enterRoom({ create: action.recreate });
      return;
    }
    if (!reply?.ok) {
      if (reply?.usage) this.usage = reply.usage;
      this.end(reply?.error || "error", reply?.message);
      return;
    }

    // Move the local level meter over to our real id.
    if (this.meters.has("__self")) {
      this.meters.set(reply.self.userId, this.meters.get("__self"));
      this.meters.delete("__self");
    }
    this.selfId = reply.self.userId;
    this.room = reply.room;
    this.usage = reply.usage;
    this.members = new Map(reply.room.members.map((m) => [m.userId, m]));
    this.status = "live";
    this.joinedAt = this.joinedAt || Date.now();
    this.emit();

    if (this.muted) this.sendState({ muted: true });
    // We joined last, so we start a connection to everyone already here.
    for (const other of reply.others) this.connectTo(other.userId, true);
  }

  bindSocket() {
    this.on("group:member-joined", ({ member }) => {
      this.members.set(member.userId, member);
      this.emit();
      // They'll call us; get ready for their offer.
    });
    this.on("group:member-left", ({ userId }) => {
      this.members.delete(userId);
      this.dropPeer(userId);
      this.emit();
    });
    this.on("group:member-updated", ({ member }) => {
      if (this.members.has(member.userId)) {
        this.members.set(member.userId, member);
        this.emit();
      }
    });
    this.on("group:host", ({ hostId }) => {
      if (this.room) this.room = { ...this.room, hostId };
      this.emit();
    });
    this.on("group:prompt", (p) => {
      if (this.room) this.room = { ...this.room, ...p };
      this.emit();
    });
    this.on("group:usage", (usage) => {
      this.usage = usage;
      this.emit();
    });
    this.on("group:time-up", () => this.end("time-up"));
    this.on("group:ended", ({ reason }) => this.end(reason));
    this.on("group:signal", ({ from, data }) => this.handleSignal(from, data));
    // After a network drop the server has removed us: rejoin the same room.
    const rejoin = () => {
      if (this.status !== "live" || !this.room) return;
      for (const id of [...this.peers.keys()]) this.dropPeer(id);
      const { id, categoryId, categoryTitle, prompt, code } = this.room;
      this.enterRoom({
        roomId: id,
        // Same topic, privacy and (if still free) the same invite code.
        recreate: {
          categoryId,
          categoryTitle,
          prompt,
          code,
          max: this.room.max,
          private: Boolean(this.room.private),
        },
      });
    };
    this.socket.io.on("reconnect", rejoin);
    this.handlers.push(["__reconnect", rejoin]);
  }

  newPeer(userId, offerer) {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer = { pc, offerer, pending: [], audio: null, state: "connecting" };
    this.peers.set(userId, peer);

    pc.onicecandidate = (e) => {
      if (e.candidate) this.signal(userId, { candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      this.playRemote(userId, peer, stream);
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      peer.state =
        s === "connected"
          ? "connected"
          : s === "failed"
            ? "failed"
            : "connecting";
      if (s === "failed" && peer.offerer) this.restart(userId);
      this.emit();
    };
    return peer;
  }

  // Every connection gets a two-way audio slot, even without a microphone,
  // so the mic can be switched on later without reconnecting.
  attachLocal(peer, transceiver) {
    const track = this.localStream?.getAudioTracks()[0] || null;
    if (transceiver) {
      transceiver.direction = "sendrecv";
      if (track) transceiver.sender.replaceTrack(track).catch(() => {});
      peer.transceiver = transceiver;
      return;
    }
    if (!this.placeholderStream) this.placeholderStream = new MediaStream();
    peer.transceiver = peer.pc.addTransceiver(track || "audio", {
      direction: "sendrecv",
      streams: [this.localStream || this.placeholderStream],
    });
  }

  async connectTo(userId, offerer) {
    this.dropPeer(userId);
    const peer = this.newPeer(userId, offerer);
    if (!offerer) return peer;
    this.attachLocal(peer);
    try {
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      this.signal(userId, { description: peer.pc.localDescription });
    } catch (err) {
      console.error("group call offer", err);
    }
    return peer;
  }

  async restart(userId) {
    const peer = this.peers.get(userId);
    if (!peer || this.closed) return;
    try {
      const offer = await peer.pc.createOffer({ iceRestart: true });
      await peer.pc.setLocalDescription(offer);
      this.signal(userId, { description: peer.pc.localDescription });
    } catch {
      this.connectTo(userId, true);
    }
  }

  signal(to, data) {
    this.socket.emit("group:signal", { to, data });
  }

  async handleSignal(from, data) {
    if (this.closed || !this.members.has(from)) return;
    let peer = this.peers.get(from);
    try {
      if (data.description) {
        const desc = data.description;
        if (desc.type === "offer") {
          // A new call from someone (or a restart of an existing one).
          if (!peer || peer.offerer) peer = await this.connectTo(from, false);
          await peer.pc.setRemoteDescription(desc);
          const transceiver = peer.pc
            .getTransceivers()
            .find((t) => t.receiver.track?.kind === "audio");
          if (!peer.attached) {
            this.attachLocal(peer, transceiver);
            peer.attached = true;
          }
          const answer = await peer.pc.createAnswer();
          await peer.pc.setLocalDescription(answer);
          this.signal(from, { description: peer.pc.localDescription });
        } else if (peer) {
          await peer.pc.setRemoteDescription(desc);
        }
        for (const c of peer.pending.splice(0)) {
          await peer.pc.addIceCandidate(c).catch(() => {});
        }
      } else if (data.candidate && peer) {
        if (peer.pc.remoteDescription) {
          await peer.pc.addIceCandidate(data.candidate).catch(() => {});
        } else {
          peer.pending.push(data.candidate);
        }
      }
    } catch (err) {
      console.error("group call signal", err);
    }
  }

  playRemote(userId, peer, stream) {
    if (!peer.audio) {
      peer.audio = new Audio();
      peer.audio.autoplay = true;
      peer.audio.setAttribute("playsinline", "");
    }
    peer.audio.srcObject = stream;
    peer.audio.play().then(
      () => {
        if (this.audioBlocked) {
          this.audioBlocked = false;
          this.emit();
        }
      },
      () => {
        this.audioBlocked = true;
        this.emit();
      },
    );
    this.meter(userId, stream);
  }

  // Tap-to-listen fallback for browsers that block audio until a tap.
  resumeAudio() {
    this.audioCtx?.resume?.();
    for (const peer of this.peers.values()) peer.audio?.play().catch(() => {});
    this.audioBlocked = false;
    this.emit();
  }

  // Lightweight level meter so members can see who is talking.
  meter(userId, stream) {
    if (!this.audioCtx) return;
    this.meters.get(userId)?.stop();
    try {
      const source = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      const timer = setInterval(() => {
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
        const id = userId === "__self" ? this.selfId : userId;
        if (!id) return;
        const member = this.members.get(id);
        const loud =
          Math.sqrt(sum / data.length) > SPEAKING_LEVEL && !member?.muted;
        if (loud !== this.speaking.has(id)) {
          if (loud) this.speaking.add(id);
          else this.speaking.delete(id);
          this.emit();
        }
      }, 150);
      this.meters.set(userId, {
        stop: () => {
          clearInterval(timer);
          source.disconnect();
        },
      });
    } catch {
      // Level meter is optional.
    }
  }

  dropPeer(userId) {
    const peer = this.peers.get(userId);
    if (!peer) return;
    this.peers.delete(userId);
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    if (peer.audio) {
      peer.audio.pause();
      peer.audio.srcObject = null;
    }
    this.meters.get(userId)?.stop();
    this.meters.delete(userId);
    this.speaking.delete(userId);
  }

  sendState(state) {
    this.socket?.emit("group:state", state);
  }

  setMuted(muted) {
    // No microphone yet: unmuting asks for it (see enableMic).
    if (!muted && !this.localStream) return;
    this.muted = muted;
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
    this.sendState({ muted });
    this.emit();
  }

  setHand(hand) {
    this.hand = hand;
    this.sendState({ hand });
    this.emit();
  }

  setPrompt(prompt, category) {
    this.socket?.emit("group:prompt", {
      prompt,
      categoryId: category?.id,
      categoryTitle: category?.title,
    });
  }

  end(reason, message) {
    if (this.status === "ended") return;
    this.status = "ended";
    this.endReason = { code: reason, message: message || null };
    this.teardown();
    this.onChange(this.snapshot());
  }

  leave() {
    if (this.socket && this.status === "live") this.socket.emit("group:leave");
    this.closed = true;
    this.teardown();
  }

  teardown() {
    for (const id of [...this.peers.keys()]) this.dropPeer(id);
    for (const m of this.meters.values()) m.stop();
    this.meters.clear();
    for (const [event, fn] of this.handlers) {
      if (event === "__reconnect") this.socket.io.off("reconnect", fn);
      else this.socket.off(event, fn);
    }
    this.handlers = [];
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.audioCtx?.close?.().catch(() => {});
    this.audioCtx = null;
  }
}
