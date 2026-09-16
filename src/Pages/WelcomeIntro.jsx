import { Link } from "react-router-dom";

export default function WelcomeIntro() {
  return (
    <main className="registration-page">
      <div className="registration-container intro-container">
        <p className="intro-logo">
          articulate<span className="intro-logo-accent">60</span>
        </p>

        <h1 className="intro-heading">
          You don't become a better speaker by thinking about speaking better.
        </h1>
        <p className="intro-subheading">You become one by speaking.</p>
        <p className="intro-note">Welcome to Articulate 60.</p>

        <Link to="/register" className="registration-next intro-cta">
          Get Started
        </Link>
      </div>
    </main>
  );
}
