import { Link } from "react-router-dom";
import brandLogo from "../assets/brandlogo.PNG";

export default function WelcomeIntro() {
  return (
    <main className="registration-page welcome-intro-page">
      <div className="registration-container intro-container">
        <div className="intro-logo" aria-label="Loquiex">
          <img src={brandLogo} alt="Loquiex" />
        </div>

        <h1 className="intro-heading">
          Communication isn’t a talent you either have or don’t.{" "}
          <span className="intro-heading-accent">
            It’s a skill you can build.
          </span>
        </h1>
        <p className="intro-note">Welcome to Loquiex.</p>

        <Link to="/register" className="registration-next intro-cta">
          Get Started
        </Link>
      </div>
    </main>
  );
}
