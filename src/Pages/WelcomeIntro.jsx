import { Link } from "react-router-dom";

export default function WelcomeIntro() {
  return (
    <main className="registration-page welcome-intro-page">
      <div className="registration-container intro-container">
        <p className="intro-logo">
          articulate<span className="intro-logo-accent">60</span>
        </p>

        <h1 className="intro-heading">
          Communication isn’t a talent you either have or don’t.{" "}
          <span className="intro-heading-accent">
            It’s a skill you can build.
          </span>
        </h1>
        <p className="intro-note">Welcome to Articulate60.</p>

        <Link to="/register" className="registration-next intro-cta">
          Get Started
        </Link>
      </div>
    </main>
  );
}
