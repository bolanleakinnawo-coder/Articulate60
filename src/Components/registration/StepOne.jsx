function StepOne({ onNext }) {
  return (
    <div className="registration-step-content welcome-step">
      <div className="intro-main">
        <h1 className="intro-heading">
          Communication isn’t a talent you either have or don’t.{" "}
          <span className="intro-heading-accent">
            It’s a skill you can build.
          </span>
        </h1>
        <p className="intro-note">Welcome to Loquiex.</p>

        <button
          type="button"
          className="registration-next intro-cta"
          onClick={onNext}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

export default StepOne;
