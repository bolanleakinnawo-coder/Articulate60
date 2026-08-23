import React from "react";

function StepOne({ onNext }) {
  return (
    <div className="registration-step-content">
      <div className="registration-header">
        <h1>Create your account</h1>

        <p>Start your journey today.</p>
      </div>

      <div className="registration-options">
        <button type="button" className="social-button">
          Continue with Google
        </button>

        <button type="button" className="social-button">
          Continue with Apple
        </button>

        <div className="divider">
          <span>or</span>
        </div>

        <button type="button" className="email-button" onClick={onNext}>
          Sign up with email
        </button>
      </div>
    </div>
  );
}

export default StepOne;
