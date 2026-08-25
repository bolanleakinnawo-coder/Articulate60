import heroImg from "../../assets/hero2.jpeg";
import { ShieldCheck } from "lucide-react";

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-container">
        {/* LEFT: Text content */}
        <div className="hero-content">
          <span className="hero-badge">
            YOUR DAILY COMMUNICATION PRACTICE PLATFORM
          </span>

          <h1 className="hero-title">
            Become a better communicator by actually
            <span className="hero-title-accent"> practicing.</span>
          </h1>

          <p className="hero-subtext">
            Articulate 60 gives you daily speaking practice, expert-led
            masterclasses, structured challenges, and practical resources to
            help you become a more articulate and confident communicator.
          </p>

          <div className="hero-cta-group">
            <button className="btn-primary">
              START YOUR FIRST PRACTICE <span className="arrow">→</span>
            </button>
          </div>

          <p className="hero-note">
            <ShieldCheck size={14} strokeWidth={1.8} />
            Free to start. Practise anytime.
          </p>
        </div>

        {/* RIGHT: Image + floating cards */}
        <div className="hero-visual">
          <div className="hero-image-wrapper">
            <img
              src={heroImg}
              alt="Woman practicing speaking on phone"
              className="hero-image"
            />

            <div className="float-card streak-card">
              <div className="streak-header">
                <span className="fire-icon">🔥</span> 14 Day Streak
              </div>
              <div className="streak-days">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="streak-day">
                    <span className={`streak-dot ${i < 5 ? "filled" : ""}`} />
                    <span className="streak-label">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="float-card practice-card">
              <p className="practice-label">Today's Practice</p>
              <div className="practice-info">
                <span>2 min · Level 2</span>
                <span className="practice-tag">Story Telling</span>
                <span className="mic-icon">🎙️</span>
              </div>
            </div>

            <div className="float-card progress-card">
              <div className="progress-header">
                <span>Progress</span>
                <span className="progress-percent">85%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "85%" }} />
              </div>
              <p className="progress-note">Keep it up!</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
