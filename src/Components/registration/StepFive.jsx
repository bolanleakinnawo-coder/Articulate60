function StepFive({ formData, onSubmit }) {
  return (
    <div className="registration-step-content success-step">
      <div className="success-icon">✓</div>

      <div className="registration-header">
        <p className="registration-step">STEP 5 OF 5</p>

        <h1>You're all set!</h1>

        <p>Your account is ready. Let's get started.</p>
      </div>

      <form onSubmit={onSubmit}>
        <button type="submit" className="registration-next">
          Let's get started
        </button>
      </form>
    </div>
  );
}

export default StepFive;
