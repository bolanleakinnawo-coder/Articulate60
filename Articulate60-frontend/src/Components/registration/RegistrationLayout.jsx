import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import StepIndicator from "./StepIndicator";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import StepThree from "./StepThree";
import StepFour from "./StepFour";
import StepFive from "./StepFive";
import StepSix from "./StepSix";

function RegistrationLayout() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    role: "",
    roleOther: "",
    improvements: [],
    improvementOther: "",
    practiceFrequency: "",
  });

  const updateFormData = (updates) => {
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  const previousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "http://localhost:3001/user/signup",
        formData,
      );
      const currentUser = response.data.user || {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
      };
      sessionStorage.setItem("token", response.data.token);
      sessionStorage.setItem("user", JSON.stringify(currentUser));
      navigate("/app/home", { state: { user: currentUser } });
    } catch (error) {
      console.error(error);

      if (error.response?.data?.errors) {
        const firstError = Object.values(error.response.data.errors)[0];
        alert(firstError);
      } else if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <main className="registration-page">
      <div className="registration-container">
        <StepIndicator currentStep={currentStep} />

        {currentStep === 1 && <StepOne onNext={nextStep} />}

        {currentStep === 2 && (
          <StepTwo
            onNext={nextStep}
            onBack={previousStep}
            formData={formData}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 3 && (
          <StepThree
            onNext={nextStep}
            onBack={previousStep}
            formData={formData}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 4 && (
          <StepFour
            onNext={nextStep}
            onBack={previousStep}
            formData={formData}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 5 && (
          <StepFive
            onNext={nextStep}
            onBack={previousStep}
            formData={formData}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 6 && (
          <StepSix formData={formData} onSubmit={handleSubmit} />
        )}
      </div>
    </main>
  );
}

export default RegistrationLayout;
