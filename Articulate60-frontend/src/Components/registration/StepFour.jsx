function StepFour({ onNext, onBack, formData, updateFormData }) {
  const improvements = [
    "Speaking confidently",
    "Organising my thoughts",
    "Expressing my ideas clearly",
    "Speaking fluently without getting stuck",
    "Holding better conversations",
    "Speaking in professional/work settings",
    "Public speaking",
    "Vocabulary and finding the right words",
    "Grammar",
    "Speaking without fillers",
    "Other",
  ];

  const toggleImprovement = (item) => {
    const current = formData.improvements;

    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];

    updateFormData({
      improvements: updated,
      improvementOther: updated.includes("Other")
        ? formData.improvementOther
        : "",
    });
  };

  const isNextDisabled =
    formData.improvements.length === 0 ||
    (formData.improvements.includes("Other") &&
      !formData.improvementOther.trim());

  return (
    <div className="registration-step-content">
      <div className="registration-header">
        <p className="registration-step">STEP 4 OF 6</p>
        <h1>What do you most want to improve about your communication?</h1>
        <p>You can choose more than one.</p>
      </div>

      <div className="goal-options">
        {improvements.map((item) => {
          const isSelected = formData.improvements.includes(item);

          return (
            <button
              key={item}
              type="button"
              className={`goal-option ${isSelected ? "selected" : ""}`}
              onClick={() => toggleImprovement(item)}
            >
              <span>{item}</span>
              <span className="option-check">{isSelected ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>

      {formData.improvements.includes("Other") && (
        <div className="form-field other-field">
          <input
            type="text"
            placeholder="Tell us more"
            value={formData.improvementOther}
            onChange={(e) =>
              updateFormData({ improvementOther: e.target.value })
            }
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

export default StepFour;
