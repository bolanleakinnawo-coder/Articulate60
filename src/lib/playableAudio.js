import { useEffect, useState } from "react";
import api from "../api/axios";

// Recordings play in every browser (round 10, Sheriff 2026-11-19).
// New recordings are saved as .m4a, which every browser plays. Older ones
// were saved as webm, which iPhone Safari can't play, so the server turns
// each of those into .m4a once (POST /api/practice/recordings/:id/playable)
// and from then on the recording points at the new file.

const NEEDS_CONVERTING = /\.(webm|ogg|oga)(\?|#|$)/i;
const pending = new Map();

export function needsConverting(url) {
  return Boolean(url) && !url.startsWith("blob:") && NEEDS_CONVERTING.test(url);
}

export function makePlayable(recordingId, url) {
  if (!recordingId || !needsConverting(url)) return Promise.resolve(url);
  if (!pending.has(recordingId)) {
    pending.set(
      recordingId,
      api
        .post(`/api/practice/recordings/${recordingId}/playable`)
        .then((res) => res.data?.audioUrl || url)
        .catch((err) => {
          pending.delete(recordingId);
          throw err;
        }),
    );
  }
  return pending.get(recordingId);
}

// The address to play: the saved one, swapped for the .m4a copy as soon as
// it's ready. `ready` is false while an old recording is being prepared.
export function usePlayableUrl(recordingId, url) {
  const [state, setState] = useState({ key: "", url: "" });
  const key = `${recordingId || ""}|${url || ""}`;
  useEffect(() => {
    if (!needsConverting(url) || !recordingId) return undefined;
    let alive = true;
    makePlayable(recordingId, url)
      .then((playable) => alive && setState({ key, url: playable }))
      // Couldn't convert: keep the original, it still plays in most browsers.
      .catch(() => alive && setState({ key, url }));
    return () => {
      alive = false;
    };
  }, [key, recordingId, url]);

  if (!needsConverting(url) || !recordingId) return { url, ready: true };
  if (state.key === key) return { url: state.url, ready: true };
  return { url, ready: false };
}
