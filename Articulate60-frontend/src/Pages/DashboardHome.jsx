import { useEffect, useState } from "react";
import { Flame, Play, Volume2, ArrowRight } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function Home() {
  const location = useLocation();
  const currentUser = location.state?.user || getStoredUser();
  const [username, setUsername] = useState(
    () => currentUser?.username || location.state?.username || "there",
  );

  console.log("Current account:", currentUser);

  useEffect(() => {
    if (location.state?.user?.username) {
      setUsername(location.state.user.username);
    }
  }, [location.state]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">ARTICULATE 60</p>

          <h1>Good morning, {username} 👋</h1>

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

          <button className="primary-button">Spin for a topic</button>
        </div>

        <div className="card">
          <div className="card-heading">
            <span>Word of the Day</span>
            <Volume2 size={17} />
          </div>

          <h2>Pragmatic</h2>

          <p>Dealing with situations realistically and practically.</p>

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
