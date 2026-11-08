// The group call the member is in right now, kept outside any page so the
// call keeps going when they move to another tab (Home, Profile...). The
// call bar at the top of the app (Components/layout/CallBar.jsx) shows it
// and takes them back. Leaving happens only when they tap Leave, close the
// app, or the call ends.
import { useSyncExternalStore } from "react";
import api from "../api/axios";
import { GroupCall } from "./groupCall";

let session = null;
let snapshot = null;
const listeners = new Set();

function publish(next) {
  snapshot = next;
  listeners.forEach((fn) => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot() {
  return snapshot;
}

// Live snapshot of the current call (null when not in one).
export function useActiveCall() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function activeSession() {
  return session;
}

// Starts (or replaces) the current call. `action` is what GroupCall.join
// takes: { create }, { code } or { roomId }.
export function startCall(action, stream) {
  if (session) session.leave();
  const call = new GroupCall((snap) => {
    if (session === call) publish(snap);
  });
  session = call;
  publish(call.snapshot());
  call.join(action, { stream });
  return call;
}

export function leaveCall() {
  session?.leave();
  session = null;
  publish(null);
}

// Clears a call that has already ended (after its "ended" screen is seen).
export function clearEndedCall() {
  if (snapshot?.status === "ended") {
    session = null;
    publish(null);
  }
}

// Controls for the current call.
export const callActions = {
  setMuted: (v) => session?.setMuted(v),
  enableMic: () => session?.enableMic() || Promise.resolve({ error: "ended" }),
  setHand: (v) => session?.setHand(v),
  setPrompt: (p, c) => session?.setPrompt(p, c),
  resumeAudio: () => session?.resumeAudio(),
};

// ---- Practices planned for later (REST, see ROUTES/group.js) --------------
export async function fetchScheduled() {
  try {
    const { data } = await api.get("/api/group/scheduled");
    return { upcoming: data.upcoming || [], mine: data.mine || [] };
  } catch {
    return null;
  }
}

export async function schedulePractice(details) {
  try {
    const { data } = await api.post("/api/group/scheduled", details);
    return { ok: true, scheduled: data.scheduled };
  } catch (err) {
    return {
      ok: false,
      message:
        err?.response?.data?.message ||
        "We couldn't plan the practice. Check your connection and try again.",
    };
  }
}

export async function setReminder(id, on) {
  try {
    const { data } = await api.post(`/api/group/scheduled/${id}/remind`, {
      on,
    });
    return data.scheduled;
  } catch {
    return null;
  }
}

export async function cancelScheduled(id) {
  try {
    await api.delete(`/api/group/scheduled/${id}`);
    return true;
  } catch {
    return false;
  }
}

// Title members see for a room or planned practice: the host's own topic,
// or the Loquiex prompt (category shown underneath).
export function roomTitle(room) {
  if (!room) return "";
  if (room.mode === "host") return room.topic || room.categoryTitle;
  return room.prompt || room.categoryTitle || "Group practice";
}

export function roomMeta(room) {
  if (!room) return "";
  return room.mode === "host"
    ? "Host-led discussion"
    : `${room.categoryTitle || "Open conversation"} · Loquiex-guided`;
}
