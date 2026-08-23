function StepThree({
  onNext,
  onBack,
  formData,
  updateFormData,
}) {
  const goals = [
    "Speak with more confidence",
    "Organize my thoughts",
    "Improve my communication skills",
    "Advance my career",
    "Become a better speaker",
    "Personal growth",
  ];

  const toggleGoal = (goal) => {
    const currentGoals = formData.goals;

    const updatedGoals = currentGoals.includes(goal)
      ? currentGoals.filter((item) => item !== goal)
      : [...currentGoals, goal];

    updateFormData({
      goals: updatedGoals,
    });
  };

  return (
    <div className="registration-step-content">
      <div className="registration-header">
        <h1>What brings you here?</h1>

        <p>You can choose more than one.</p>
      </div>

      <div className="goal-options">
        {goals.map((goal) => {
          const isSelected = formData.goals.includes(goal);

          return (
            <button
              key={goal}
              type="button"
              className={`goal-option ${
                isSelected ? "selected" : ""
              }`}
              onClick={() => toggleGoal(goal)}
            >
              <span>{goal}</span>

              <span className="option-check">
                {isSelected ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          Back
        </button>

        <button
          type="button"
          className="registration-next"
          onClick={onNext}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default StepThree;