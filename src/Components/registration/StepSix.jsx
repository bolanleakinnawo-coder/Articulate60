function StepSix({ onSubmit, isSubmitting }) {
  return (
    <div className="registration-step-content success-step">
      <div className="success-icon">✓</div>

      <div className="registration-header">
        <p className="registration-step">STEP 6 OF 6</p>
        <h1>You're all set!</h1>
        <p>Review complete. Submit to create your account.</p>
      </div>

      <form onSubmit={onSubmit}>
        <button
          type="submit"
          className="registration-next"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating your account..." : "Submit and get started"}
        </button>
      </form>
    </div>
  );
}

export default StepSix;
