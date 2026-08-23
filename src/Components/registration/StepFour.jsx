function StepFour({ onNext, onBack, formData, updateFormData }) {
  const frequencies = [
    {
      title: "Every day",
      description: "Make it a daily habit",
    },
    {
      title: "A few times a week",
      description: "Practice 3–4 times a week",
    },
  ];

  const selectFrequency = (frequency) => {
    updateFormData({
      practiceFrequency: frequency,
    });
  };

  return (
    <div className="registration-step-content">
      <div className="registration-header">
        <h1>How often do you want to practice?</h1>

        <p>Consistency is the key to progress.</p>
      </div>

      <div className="practice-options">
        {frequencies.map((frequency) => {
          const isSelected = formData.practiceFrequency === frequency.title;

          return (
            <button
              key={frequency.title}
              type="button"
              className={`practice-option ${isSelected ? "selected" : ""}`}
              onClick={() => selectFrequency(frequency.title)}
            >
              <div>
                <h3>{frequency.title}</h3>
                <p>{frequency.description}</p>
              </div>

              <span
                className={`option-radio ${isSelected ? "selected" : ""}`}
              />
            </button>
          );
        })}
      </div>

      <div className="form-actions">
        <button type="button" className="back-button" onClick={onBack}>
          Back
        </button>

        <button type="button" className="registration-next" onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  );
}

export default StepFour;
