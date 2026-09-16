import { useEffect, useRef, useState } from "react";
import { Flame, Play, Pause, Volume2, ArrowRight, Trophy } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/Dashboardlogo.PNG";
import api from "../api/axios";

const API_URL = import.meta.env.VITE_API_URL;

const LEADERBOARD_TABS = [
  { key: "streak", label: "Current Streak" },
  { key: "sessions", label: "Most Sessions" },
  { key: "speakingTime", label: "Most Speaking Time" },
];

// Hardcoded for now — swap for a real API call once the backend
// endpoint exists.
// Hardcoded for now — swap for a real API call once the backend
// endpoint exists.
const LEADERBOARD_DATA = {
  streak: [
    { username: "Amara", displayValue: "41 days" },
    { username: "Tobi", displayValue: "29 days" },
  ],
  sessions: [
    { username: "Amara", displayValue: "58 sessions" },
    { username: "Tobi", displayValue: "45 sessions" },
  ],
  speakingTime: [
    { username: "Amara", displayValue: "3h 12m" },
    { username: "Tobi", displayValue: "2h 40m" },
  ],
};
function speakWord(word) {
  if (!window.speechSynthesis) return; // very old browsers only

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-GB";
  utterance.rate = 0.9; // slightly slower for clarity

  const voices = window.speechSynthesis.getVoices();
  const britishVoice = voices.find((v) => v.lang === "en-GB");
  if (britishVoice) {
    utterance.voice = britishVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = location.state?.user || getStoredUser();
  const [username, setUsername] = useState(
    () => currentUser?.username || location.state?.username || "there",
  );

  // Word of the Day state — fetched from the backend instead of hardcoded
  const [wordOfDay, setWordOfDay] = useState(null);
  const [loadingWord, setLoadingWord] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [needsPracticeToday, setNeedsPracticeToday] = useState(false);
  const [recentActivity, setRecentActivity] = useState(null);

  // Recent activity — only the single most recent item is shown on Home.
  // "See all" routes to the Profile tab, where the full history lives.
  // Leaderboard state
  const [leaderboardTab, setLeaderboardTab] = useState("streak");
  const leaderboard = LEADERBOARD_DATA;

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
    if (location.state?.user?.username) {
      setUsername(location.state.user.username);
    }
  }, [location.state]);

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
    api
      .get("/api/practice/streak")
      .then((response) => {
        setCurrentStreak(response.data.current || 0);
        setNeedsPracticeToday(Boolean(response.data.needsPracticeToday));
      })
      .catch(() => {
        setCurrentStreak(0);
        setNeedsPracticeToday(false);
      });
  }, []);

  useEffect(() => {
    api
      .get("/api/practice/recent?limit=1")
      .then((response) => setRecentActivity(response.data[0] || null))
      .catch(() => setRecentActivity(null));
  }, []);

  const activeLeaderboardEntries = leaderboard[leaderboardTab] || [];

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

      {needsPracticeToday && (
        <p className="subtitle">
          You have not practised today. Complete a practice to keep your streak
          going.
        </p>
      )}

      <section className="home-grid">
        <div className="card today-practice-card">
          <div className="card-heading">
            <span>Today's Practice</span>
          </div>

          <h2>Get a topic. Speak for 60 seconds.</h2>

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
              onClick={() => wordOfDay && speakWord(wordOfDay.word)}
              disabled={!wordOfDay}
              aria-label="Play pronunciation"
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

          <button className="text-button">
            Try using it today
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Your Recent Activity</h2>

          <button
            className="text-button"
            onClick={() => navigate("/app/profile")}
          >
            See all
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
          <h2>Articulate Leaderboard</h2>

          <button
            className="text-button"
            onClick={() => navigate("/app/profile")}
          >
            See all
          </button>
        </div>

        <div className="card leaderboard-card">
          <div className="leaderboard-tabs">
            {LEADERBOARD_TABS.map((tab) => (
              <button
                key={tab.key}
                className={
                  "leaderboard-tab" +
                  (leaderboardTab === tab.key ? " leaderboard-tab-active" : "")
                }
                onClick={() => setLeaderboardTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="leaderboard-list">
            {activeLeaderboardEntries.map((entry, index) => (
              <LeaderboardRow
                key={entry.userId || entry.username || index}
                rank={index + 1}
                name={entry.username}
                value={entry.displayValue}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function getStoredUser() {
  const storedUser = sessionStorage.getItem("user");

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

function formatPracticeDate(date) {
  const practiceDate = new Date(date);
  if (practiceDate.toDateString() === new Date().toDateString()) return "Today";
  return practiceDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function LeaderboardRow({ rank, name, value }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div className="leaderboard-item">
      <span className="leaderboard-rank">{rank}</span>

      <div className="leaderboard-avatar">{initial}</div>

      <span className="leaderboard-name">{name}</span>

      <span className="leaderboard-value">{value}</span>
    </div>
  );
}
