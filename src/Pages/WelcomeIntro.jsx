import { Link } from "react-router-dom";
import { ArrowRight, AudioLines, Mic2, Sparkles } from "lucide-react";

export default function WelcomeIntro() {
  return (
    <main className="registration-page welcome-page">
      <div className="welcome-shell">
        <header className="welcome-topbar">
          <p className="welcome-logo">
            articulate<span>60</span>
          </p>
          <span className="welcome-step">
            <span className="welcome-step-dot" />
            YOUR STARTING POINT
          </span>
        </header>

        <section className="welcome-card">
          <div className="welcome-copy">
            <p className="welcome-eyebrow">
              <Sparkles size={14} />
              A little practice goes a long way
            </p>
            <h1>
              You don&apos;t become a better speaker by thinking about speaking
              better. <span>You become one by speaking.</span>
            </h1>
            <p className="welcome-description">
              Build confidence one short, focused practice at a time. Your
              first minute starts here.
            </p>
            <Link to="/register" className="welcome-cta">
              Get started <ArrowRight size={17} />
            </Link>
            <p className="welcome-reassurance">
              No pressure. Just one minute to begin.
            </p>
          </div>

          <aside className="welcome-practice-card" aria-label="A 60-second practice">
            <div className="welcome-practice-top">
              <span className="welcome-practice-icon">
                <Mic2 size={18} />
              </span>
              <span>YOUR DAILY PRACTICE</span>
            </div>
            <div className="welcome-timer">
              <strong>60</strong>
              <span>SECONDS</span>
            </div>
            <div className="welcome-wave" aria-hidden="true">
              {[16, 27, 20, 36, 24, 42, 25, 34, 17, 29, 21, 38, 18].map(
                (height, index) => (
                  <span key={index} style={{ "--wave-height": `${height}px` }} />
                ),
              )}
            </div>
            <div className="welcome-practice-caption">
              <AudioLines size={15} />
              <span>One small step. Real progress.</span>
            </div>
          </aside>
        </section>

        <footer className="welcome-footer">
          A clearer, more confident you starts with showing up.
        </footer>
      </div>
    </main>
  );
}
