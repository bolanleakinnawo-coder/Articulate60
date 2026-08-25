function StepIndicator({ currentStep }) {
  const steps = [1, 2, 3, 4, 5, 6];

  return (
    <div className="step-indicator">
      {steps.map((step, index) => (
        <div className="step-item" key={step}>
          <div className={`step-number ${currentStep >= step ? "active" : ""}`}>
            {step}
          </div>

          {index < steps.length - 1 && (
            <div
              className={`step-line ${currentStep > step ? "active" : ""}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default StepIndicator;
