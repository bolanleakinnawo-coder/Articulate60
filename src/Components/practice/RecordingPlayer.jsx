import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import "./FeedbackReport.css";

function clock(total) {
  const s = Math.max(0, Math.floor(Number(total) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Play / pause, seek bar and times for a recording (a blob URL right after
// recording, or the saved R2 URL later). Shared by the analysing screen, the
// feedback page and saved feedback in the profile.
export default function RecordingPlayer({
  src,
  fallbackSeconds,
  title,
  subtitle,
}) {
  const audioRef = useRef(null);
  const fixingDuration = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    setFailed(false);
    setPlaying(false);
    setCurrent(0);

    const readDuration = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setDuration(el.duration);
        return;
      }
      // Recorded webm files report an Infinite duration until the browser
      // has scanned to the end. Jump far ahead once to make it work it out,
      // then come back to the start (seeking breaks without this).
      if (el.duration === Infinity && !fixingDuration.current) {
        fixingDuration.current = true;
        el.currentTime = 1e101;
      }
    };
    const onTime = () => {
      if (fixingDuration.current) {
        fixingDuration.current = false;
        el.currentTime = 0;
        readDuration();
        return;
      }
      setCurrent(el.currentTime);
      if (Number.isFinite(el.duration) && el.duration > 0)
        setDuration(el.duration);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onError = () => {
      setPlaying(false);
      setFailed(true);
    };
    el.addEventListener("loadedmetadata", readDuration);
    el.addEventListener("durationchange", readDuration);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    return () => {
      el.pause();
      el.removeEventListener("loadedmetadata", readDuration);
      el.removeEventListener("durationchange", readDuration);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
  }, [src]);

  const total = duration || Number(fallbackSeconds) || 0;
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      // Some browsers need an explicit load after the source was swapped.
      if (el.readyState === 0) el.load();
      el.play().catch((err) => {
        console.error("Playback failed:", err);
        if (err?.name === "NotSupportedError") setFailed(true);
      });
    } else {
      el.pause();
    }
  };

  const seek = (e) => {
    const el = audioRef.current;
    if (!el || !total) return;
    el.currentTime = (Number(e.target.value) / 100) * total;
    setCurrent(el.currentTime);
  };

  if (!src) {
    return (
      <div className="fb-card fb-player fb-player-empty">
        <p className="fb-muted">
          Your recording isn't available to play right now.
        </p>
      </div>
    );
  }

  return (
    <div className={`fb-card fb-player ${title ? "fb-player-titled" : ""}`}>
      <audio ref={audioRef} src={src} preload="metadata" playsInline />
      <div className="fb-player-row">
        <button
          type="button"
          className="fb-play-btn"
          onClick={toggle}
          aria-label={playing ? "Pause recording" : "Play recording"}
        >
          {playing ? (
            <Pause size={22} fill="currentColor" strokeWidth={0} />
          ) : (
            <Play size={22} fill="currentColor" strokeWidth={0} />
          )}
        </button>
        {title ? (
          <div className="fb-player-copy">
            <p className="fb-player-title">{title}</p>
            {subtitle && <p className="fb-player-sub">{subtitle}</p>}
          </div>
        ) : null}
        {title && (
          <span className="fb-player-clock">
            {clock(current)} / {clock(total)}
          </span>
        )}
      </div>
      <div className="fb-player-main">
        <input
          type="range"
          className="fb-seek"
          min="0"
          max="100"
          step="0.1"
          value={pct}
          onChange={seek}
          aria-label="Seek recording"
          style={{ "--fb-seek": `${pct}%` }}
        />
        {!title && (
          <div className="fb-player-times">
            <span>{clock(current)}</span>
            <span>{clock(total)}</span>
          </div>
        )}
      </div>
      {failed && (
        <p className="fb-footnote">
          This recording couldn't play on this device. Try opening Loquiex in
          another browser.
        </p>
      )}
    </div>
  );
}
