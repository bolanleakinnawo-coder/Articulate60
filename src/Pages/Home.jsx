import { useEffect, useRef, useState } from "react";
import {
  Flame,
  Play,
  Pause,
  Volume2,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
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
function speakWord(word, availableVoices = []) {
  if (!("speechSynthesis" in window)) return;

  const voices = availableVoices.length
    ? availableVoices
    : window.speechSynthesis.getVoices();
  const britishVoices = voices.filter((voice) =>
    /^en[-_]gb\b/i.test(voice.lang),
  );
  const preferredFemaleNames =
    /\b(serena|kate|sonia|hazel|libby|amy|charlotte|olivia|rosie|martha|flo|shelley|natasha)\b/i;
  const knownMaleNames =
    /\b(daniel|oliver|arthur|george|james|ryan|thomas|william|brian|male|man)\b/i;
  const britishFemaleVoice =
    britishVoices.find((voice) =>
      /\b(female|woman)\b/i.test(voice.name),
    ) ||
    britishVoices.find((voice) => preferredFemaleNames.test(voice.name)) ||
    britishVoices.find((voice) => !knownMaleNames.test(voice.name));
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-GB";
  utterance.rate = 0.88;
  utterance.pitch = 1.08;
  utterance.volume = 1;
  if (britishFemaleVoice) utterance.voice = britishFemaleVoice;

  window.speechSynthesis.speak(utterance);
}

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = location.state?.user || getStoredUser();
  const username =
    currentUser?.username || location.state?.username || "there";

  // Word of the Day state — fetched from the backend instead of hardcoded
  const [wordOfDay, setWordOfDay] = useState(null);
  const [loadingWord, setLoadingWord] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [needsPracticeToday, setNeedsPracticeToday] = useState(false);
  const [showPracticeReminder, setShowPracticeReminder] = useState(true);
  const [recentActivity, setRecentActivity] = useState(null);
  const [communityWins, setCommunityWins] = useState([]);
  const [communityWinsError, setCommunityWinsError] = useState("");
  const [activeCommunityWin, setActiveCommunityWin] = useState(0);
  const [speechVoices, setSpeechVoices] = useState([]);
  const communityWinsTrackRef = useRef(null);

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

    const loadVoices = () => setSpeechVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
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

  useEffect(() => {
    api
      .get("/api/testimonials")
      .then((response) => setCommunityWins(response.data))
      .catch((error) => {
        console.error("Could not load approved community wins:", error);
        setCommunityWinsError("Community wins couldn't be loaded right now.");
      });
  }, []);

  useEffect(() => {
    const track = communityWinsTrackRef.current;
    if (!track) return undefined;

    const updateActiveWin = () => {
      if (track.clientWidth > 0) {
        setActiveCommunityWin(
          Math.min(
            communityWins.length - 1,
            Math.round(track.scrollLeft / track.clientWidth),
          ),
        );
      }
    };

    updateActiveWin();
    track.addEventListener("scroll", updateActiveWin, { passive: true });
    const resizeObserver = new ResizeObserver(updateActiveWin);
    resizeObserver.observe(track);

    return () => {
      track.removeEventListener("scroll", updateActiveWin);
      resizeObserver.disconnect();
    };
  }, [communityWins.length]);

  const activeLeaderboardEntries = leaderboard[leaderboardTab] || [];
  const showCommunityWin = (index) => {
    const track = communityWinsTrackRef.current;
    if (!track) return;

    track.scrollTo({
      left: index * track.clientWidth,
      behavior: "smooth",
    });
  };

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

      {needsPracticeToday && showPracticeReminder && (
        <aside className="practice-reminder" aria-live="polite">
          <span className="practice-reminder-icon" aria-hidden="true">
            <Flame size={20} />
          </span>
          <div className="practice-reminder-copy">
            <strong>Your streak is waiting!</strong>
            <span>A quick practice today keeps your momentum going.</span>
          </div>
          <button
            className="practice-reminder-action"
            onClick={() => navigate("/app/practice")}
          >
            Keep my streak <ArrowRight size={16} />
          </button>
          <button
            className="practice-reminder-dismiss"
            aria-label="Dismiss practice reminder"
            onClick={() => setShowPracticeReminder(false)}
          >
            <X size={18} />
          </button>
        </aside>
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
              onClick={() => wordOfDay && speakWord(wordOfDay.word, speechVoices)}
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

      {(communityWins.length > 0 || communityWinsError) && (
        <section className="section community-wins-section">
          <div className="section-header community-wins-header">
            <h2>See other people&apos;s wins</h2>
          </div>

          {communityWinsError ? (
            <p className="community-wins-message" role="status">
              {communityWinsError}
            </p>
          ) : (
            <div className="community-wins-carousel">
              <div
                className="community-wins-track"
                ref={communityWinsTrackRef}
                role="region"
                aria-label="Approved community wins"
                tabIndex={0}
              >
                {communityWins.map((win) => (
                  <article className="community-win-card" key={win._id}>
                    <span className="community-win-label">Community win</span>
                    <p className="community-win-quote">{win.quote}</p>
                    <div className="community-win-author">
                      <span className="community-win-avatar" aria-hidden="true">
                        {win.displayName?.charAt(0)?.toUpperCase() || "A"}
                      </span>
                      <div>
                        <strong>{win.displayName}</strong>
                        <span>Articulate60 member</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {communityWins.length > 1 && (
                <div
                  className="community-wins-pagination"
                >
                  <button
                    type="button"
                    className="community-wins-arrow"
                    aria-label="Show previous win"
                    disabled={activeCommunityWin === 0}
                    onClick={() => showCommunityWin(activeCommunityWin - 1)}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {communityWins.map((win, index) => (
                    <button
                      key={win._id}
                      type="button"
                      className={`community-wins-dot${activeCommunityWin === index ? " active" : ""}`}
                      aria-label={`Show community win ${index + 1}`}
                      aria-current={activeCommunityWin === index ? "true" : undefined}
                      onClick={() => showCommunityWin(index)}
                    />
                  ))}
                  <button
                    type="button"
                    className="community-wins-arrow"
                    aria-label="Show next win"
                    disabled={activeCommunityWin === communityWins.length - 1}
                    onClick={() => showCommunityWin(activeCommunityWin + 1)}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}
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
