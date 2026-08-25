function StepThree({ onNext, onBack, formData, updateFormData }) {
  const roles = [
    "Student",
    "Working professional",
    "Business owner / Entrepreneur",
    "Job seeker",
    "Recent graduate",
    "Other",
  ];

  const selectRole = (role) => {
    updateFormData({
      role,
      roleOther: role === "Other" ? formData.roleOther : "",
    });
  };

  const isNextDisabled =
    !formData.role || (formData.role === "Other" && !formData.roleOther.trim());

  return (
    <div className="registration-step-content">
      <div className="registration-header">
        <p className="registration-step">STEP 3 OF 6</p>
        <h1>Which best describes you right now?</h1>
        <p>This helps us tailor your experience.</p>
      </div>

      <div className="goal-options">
        {roles.map((role) => {
          const isSelected = formData.role === role;

          return (
            <button
              key={role}
              type="button"
              className={`goal-option ${isSelected ? "selected" : ""}`}
              onClick={() => selectRole(role)}
            >
              <span>{role}</span>
              <span
                className={`option-radio ${isSelected ? "selected" : ""}`}
              />
            </button>
          );
        })}
      </div>

      {formData.role === "Other" && (
        <div className="form-field other-field">
          <input
            type="text"
            placeholder="Tell us more"
            value={formData.roleOther}
            onChange={(e) => updateFormData({ roleOther: e.target.value })}
          />
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="back-button" onClick={onBack}>
          Back
        </button>

        <button
          type="button"
          className="registration-next"
          onClick={onNext}
          disabled={isNextDisabled}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default StepThree;
