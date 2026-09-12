import { useEffect, useState } from "react";
import { Flame, Play, Volume2, ArrowRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

// Reads a word aloud using the browser's built-in voice — no audio
// files, no backend storage needed.
// Reads a word aloud using the browser's built-in voice, set to
// British English.
function speakWord(word) {
  if (!window.speechSynthesis) return; // very old browsers only

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-GB";
  utterance.rate = 0.9; // slightly slower for clarity

  // Try to pick an actual British voice if one is installed on the
  // device — setting lang alone sometimes isn't enough, since some
  // browsers fall back to whatever default voice is available.
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

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">ARTICULATE 60</p>

          <h1>Good morning, {username}</h1>

          <p className="subtitle">Let's get better today.</p>
        </div>

        <div className="streak">
          <Flame size={20} />
          <div>
            <strong>7</strong>
            <span>Day streak</span>
          </div>
        </div>
      </header>

      <section className="home-grid">
        <div className="card today-practice-card">
          <div className="card-heading">
            <span>Today's Practice</span>
          </div>

          <h2>Get a topic. Think for 60 seconds.</h2>

          <p>
            Then speak for 2 minutes and improve your ability to communicate
            clearly.
          </p>

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
          <h2>Recent Activity</h2>

          <button className="text-button">See all</button>
        </div>

        <div className="activity-list">
          <Activity
            title="Should people choose job security over passion?"
            level="Level 2"
            duration="2 min"
          />

          <Activity
            title="Is social media doing more harm than good?"
            level="Level 3"
            duration="3 min"
          />

          <Activity
            title="Describe a time you had to solve a problem quickly."
            level="Level 1"
            duration="1 min"
          />
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

function Activity({ title, level, duration }) {
  return (
    <div className="activity-item">
      <div>
        <h3>{title}</h3>

        <p>
          {level} · {duration}
        </p>
      </div>

      <button className="play-button">
        <Play size={15} fill="currentColor" />
      </button>
    </div>
  );
}
