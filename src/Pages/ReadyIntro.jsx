import { useNavigate } from "react-router-dom";

export default function ReadyIntro() {
  const navigate = useNavigate();

  return (
    <main className="registration-page">
      <div className="registration-container intro-container">
        <p className="intro-logo">
          articulate<span className="intro-logo-accent">60</span>
        </p>

        <h1 className="intro-heading">
          60 seconds a day can change the way you speak.
        </h1>
        <p className="intro-note">Your first 60 starts today.</p>

        <button
          className="registration-next intro-cta"
          onClick={() => navigate("/app/home")}
        >
          I am ready
        </button>
      </div>
    </main>
  );
}
