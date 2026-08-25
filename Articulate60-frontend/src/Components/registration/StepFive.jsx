function StepFive({ onNext, onBack, formData, updateFormData }) {
  const frequencies = [
    { title: "Every day", description: "Make it a daily habit" },
    { title: "5 to 6 days a week", description: "Almost every day" },
    { title: "3 to 4 days a week", description: "A steady rhythm" },
    { title: "1 to 2 days a week", description: "Light and manageable" },
    { title: "Whenever I have time", description: "No fixed schedule" },
  ];

  const selectFrequency = (frequency) => {
    updateFormData({ practiceFrequency: frequency });
  };

  return (
    <div className="registration-step-content">
      <div className="registration-header">
        <p className="registration-step">STEP 5 OF 6</p>
        <h1>How often do you realistically want to practise?</h1>
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

        <button
          type="button"
          className="registration-next"
          onClick={onNext}
          disabled={!formData.practiceFrequency}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default StepFive;
