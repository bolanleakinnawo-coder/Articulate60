import { useEffect, useRef, useState } from "react";
import {
  Flame,
  Play,
  Pause,
  Volume2,
  ArrowRight,
  Crown,
  Mic,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import StreakPopup from "../Components/StreakPopup";
import useLiveStreak from "../hooks/useLiveStreak";

const API_URL = import.meta.env.VITE_API_URL;

// Word of the Day pronunciation.
// Laptops (Chrome/Edge) ship a natural "Google UK English Female" voice, which
// is the sound we want everywhere. Phones list very different voices: iPhones
// include robotic novelty voices (Flo, Shelley, Grandma, Rocko, Eddy...) that
// the old picker could choose, and Android's engine distorts when the pitch
// and rate are nudged. So we score every British voice, never pick a novelty
// voice, prefer natural/enhanced ones, and only nudge pitch/rate on desktop.
const NOVELTY_VOICES =
  /\b(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|fred|kathy|princess)\b/i;
const FEMALE_VOICES =
  /\b(female|woman|serena|kate|sonia|hazel|libby|amy|charlotte|olivia|stephanie|martha|natasha|emma|fiona|moira|tessa|karen|catherine|susan)\b/i;
const MALE_VOICES =
  /\b(daniel|oliver|arthur|george|james|ryan|thomas|william|brian|malcolm|male|man)\b/i;

const isPhone = () =>
  typeof navigator !== "undefined" &&
  /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || "");

function scoreVoice(voice) {
  const name = voice.name || "";
  const lang = (voice.lang || "").replace("_", "-").toLowerCase();
  if (!lang.startsWith("en")) return -1;
  if (NOVELTY_VOICES.test(name)) return -1;
  let score = 0;
  if (lang === "en-gb") score += 40;
  else if (/^en-(ie|au|nz|za)$/.test(lang)) score += 15;
  else if (lang === "en-us") score += 5;
  if (/google/i.test(name)) score += 20;
  if (/(enhanced|premium|natural|neural|online)/i.test(name)) score += 18;
  if (FEMALE_VOICES.test(name)) score += 12;
  if (MALE_VOICES.test(name)) score -= 8;
  // Android: network voices sound much better than the compact local ones.
  if (voice.localService === false) score += 4;
  return score;
}

function pickVoice(voices) {
  let best = null;
  let bestScore = -1;
  for (const voice of voices) {
    const score = scoreVoice(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

function speakWord(word, availableVoices = []) {
  if (!("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  const voices = availableVoices.length ? availableVoices : synth.getVoices();
  const voice = pickVoice(voices);
  const phone = isPhone();

  // Android Chrome can get stuck with a queued or paused utterance.
  synth.cancel();
  if (synth.paused) synth.resume();

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = voice?.lang || "en-GB";
  // Phone engines already speak at a natural pace; nudging pitch/rate is what
  // made them sound strained.
  utterance.rate = phone ? 0.95 : 0.88;
  utterance.pitch = phone ? 1 : 1.08;
  utterance.volume = 1;
  if (voice) utterance.voice = voice;

  synth.speak(utterance);
}

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser] = useState(() => location.state?.user || getStoredUser());
  const username = currentUser?.username || location.state?.username || "there";

  // Word of the Day state — fetched from the backend instead of hardcoded
  const [wordOfDay, setWordOfDay] = useState(null);
  const [loadingWord, setLoadingWord] = useState(true);
  const [recentActivity, setRecentActivity] = useState(null);
  const [communityWins, setCommunityWins] = useState([]);
  const [communityWinsError, setCommunityWinsError] = useState("");
  const [speechVoices, setSpeechVoices] = useState([]);
  const [leaderboard, setLeaderboard] = useState({
    streak: [],
    sessions: [],
    speakingTime: [],
  });
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState("");

  // Recent practices: only the single most recent one is shown on Home.
  // "View all" opens Profile straight on the "Your practices" page.

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  function capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  useEffect(() => {
    fetch(`${API_URL}/api/word-of-the-day`)
      .then((res) => {
        if (!res.ok) throw new Error("Word of the day request failed");
        return res.json();
      })
      .then((data) => {
        setWordOfDay(data);
        setLoadingWord(false);
      })
      .catch(() => setLoadingWord(false));
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return undefined;

    const loadVoices = () =>
      setSpeechVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // Live streak: worked out in the member's time zone and updated in real
  // time (Socket.IO) after a practice on any device or at reminder time.
  const streakData = useLiveStreak();
  const currentStreak = streakData?.current || 0;

  useEffect(() => {
    api
      .get("/api/practice/recent?limit=1")
      .then((response) => setRecentActivity(response.data[0] || null))
      .catch(() => setRecentActivity(null));
  }, []);

  useEffect(() => {
    api
      .get("/api/practice/leaderboard")
      .then((response) => setLeaderboard(response.data))
      .catch((error) => {
        console.error("Could not load the leaderboard:", error);
        setLeaderboardError("The leaderboard couldn't be loaded right now.");
      })
      .finally(() => setLoadingLeaderboard(false));
  }, []);

  useEffect(() => {
    api
      .get("/api/testimonials")
      .then((response) => setCommunityWins(response.data))
      .catch((error) => {
        console.error("Could not load approved community wins:", error);
        setCommunityWinsError("Community wins couldn't be loaded right now.");
      });
  }, []);

  // Ranked by current streak; speaking time is the time spoken during that
  // streak (ties go to whoever spoke longer in their streak).
  const activeLeaderboardEntries = leaderboard.streak || [];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>
            {getGreeting()}, {capitalize(username)}
          </h1>

          <p className="subtitle">Let's get better today.</p>
        </div>

        <div className="streak">
          <Flame size={20} />
          <div>
            <strong>{currentStreak}</strong>
            <span>Day streak</span>
          </div>
        </div>
      </header>

      {/* Tailored streak notification, shown as a pop-up. */}
      <StreakPopup streak={streakData} user={currentUser} />

      <section className="home-grid">
        <div className="card today-practice-card">
          <div className="card-heading">
            <span>Today's Practice</span>
          </div>

          <h2>Get a topic. Speak for up to 2 minutes.</h2>

          <p>Build your ability to communicate clearly and confidently.</p>

          <button
            className="primary-button"
            onClick={() => navigate("/app/practice")}
          >
            Spin for a topic
          </button>
        </div>

        <div className="card word-of-day-card">
          <div className="card-heading">
            <span>Word of the Day</span>
            <button
              className="icon-button word-of-day-audio"
              onClick={() =>
                wordOfDay && speakWord(wordOfDay.word, speechVoices)
              }
              disabled={!wordOfDay}
              aria-label="Play British pronunciation"
            >
              <Volume2 size={17} />
            </button>
          </div>

          {loadingWord ? (
            <p>Loading...</p>
          ) : wordOfDay ? (
            <>
              <h2>{wordOfDay.word}</h2>
              <p>{wordOfDay.meaning}</p>
            </>
          ) : (
            <p>Couldn't load today's word.</p>
          )}

          <button
            className="text-button"
            disabled={!wordOfDay}
            onClick={() =>
              navigate("/app/practice", {
                state: { wordOfTheDay: wordOfDay },
              })
            }
          >
            Try using it today
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Your Recent Practices</h2>

          <button
            className="text-button"
            onClick={() =>
              navigate("/app/profile", { state: { open: "practices" } })
            }
          >
            View all
          </button>
        </div>

        <div className="activity-list">
          {recentActivity ? (
            <Activity recording={recentActivity} />
          ) : (
            <p>
              No practices completed yet. Your latest recording will appear
              here.
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Loquiex Leaderboard</h2>
        </div>

        <div className="card leaderboard-card">
          <div className="leaderboard-list">
            {loadingLeaderboard ? (
              <p role="status">Loading leaderboard...</p>
            ) : leaderboardError ? (
              <p role="alert">{leaderboardError}</p>
            ) : activeLeaderboardEntries.length > 0 ? (
              <div className="leaderboard-table-wrap">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th scope="col">Rank</th>
                      <th scope="col">Username</th>
                      <th scope="col">Streak</th>
                      <th scope="col">Speaking Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLeaderboardEntries.map((entry, index) => (
                      <LeaderboardRow
                        key={entry.userId}
                        rank={index + 1}
                        entry={entry}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No practice stats to show yet. Be the first to practise!</p>
            )}
          </div>
        </div>
      </section>

      {(communityWins.length > 0 || communityWinsError) && (
        <section className="section community-wins-section">
          <div className="section-header">
            <h2>See other people&apos;s wins</h2>
          </div>

          {communityWinsError ? (
            <p className="community-wins-message" role="status">
              {communityWinsError}
            </p>
          ) : (
            <div className="community-wins-list">
              {communityWins.map((win) => {
                const posted = timeAgo(win.createdAt);
                return (
                  <article className="community-win-card" key={win._id}>
                    <span className="community-win-avatar" aria-hidden="true">
                      {win.displayName?.charAt(0)?.toUpperCase() || "A"}
                    </span>
                    <div className="community-win-body">
                      <p className="community-win-quote">“{win.quote}”</p>
                      <strong className="community-win-name">
                        {capitalizeFirstLetter(win.displayName)}
                      </strong>
                      <span className="community-win-meta">
                        Loquiex member{posted && ` · ${posted}`}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function capitalizeFirstLetter(value = "") {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function getStoredUser() {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

function Activity({ recording }) {
  const title = recording.topic;
  const level = `Level ${recording.level}`;
  const duration = formatDuration(recording.durationSeconds);
  const date = formatPracticeDate(recording.createdAt);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(recording.audioUrl);
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener("ended", handleEnded);
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
    };
  }, [recording.audioUrl]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="activity-item">
      <div>
        <h3>{title}</h3>

        <p>
          {level} · {duration}
        </p>
      </div>

      {date && <span className="activity-date">{date}</span>}

      <button
        className="play-button"
        onClick={togglePlayback}
        aria-label={isPlaying ? "Pause recording" : "Play recording"}
      >
        {isPlaying ? (
          <Pause size={15} fill="currentColor" />
        ) : (
          <Play size={15} fill="currentColor" />
        )}
      </button>
    </div>
  );
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${remainingSeconds}s`;
}

function timeAgo(date) {
  if (!date) return "";
  const then = new Date(date);
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (Number.isNaN(seconds)) return "";
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatPracticeDate(date) {
  const practiceDate = new Date(date);
  if (practiceDate.toDateString() === new Date().toDateString()) return "Today";
  return practiceDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function LeaderboardRow({ rank, entry }) {
  const username = entry.username || "?";
  const displayName = username.charAt(0).toUpperCase() + username.slice(1);
  const initials =
    username
      .split(/[._\s-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?";

  return (
    <tr className="leaderboard-item">
      <td className="leaderboard-rank-cell" data-label="Rank">
        <span
          className={`leaderboard-rank${rank <= 3 ? ` leaderboard-rank-${rank}` : ""}`}
          aria-label={`Rank ${rank}`}
        >
          {rank === 1 && <Crown size={13} aria-hidden="true" />}
          {rank}
        </span>
      </td>
      <td className="leaderboard-name-cell" data-label="Username">
        <div className="leaderboard-profile">
          <div className="leaderboard-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="leaderboard-identity">
            <span className="leaderboard-name">{displayName}</span>
          </div>
        </div>
      </td>
      <td className="leaderboard-streak-cell" data-label="Current Streak">
        <span className="leaderboard-metric">
          <Flame size={15} aria-hidden="true" />
          {entry.currentStreak} day{entry.currentStreak === 1 ? "" : "s"}
        </span>
      </td>
      <td className="leaderboard-speaking-time-cell" data-label="Speaking Time">
        <span className="leaderboard-metric">
          <Mic size={15} aria-hidden="true" />
          {formatLeaderboardSeconds(entry)}
        </span>
      </td>
    </tr>
  );
}

// Speaking time during the current streak: hours, minutes and seconds.
function formatLeaderboardSeconds(entry) {
  const raw = Number(entry.streakSpeakingTimeSeconds);
  if (!Number.isFinite(raw)) return entry.streakSpeakingTimeDisplay || "0s";
  const total = Math.max(0, Math.round(raw));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
}
