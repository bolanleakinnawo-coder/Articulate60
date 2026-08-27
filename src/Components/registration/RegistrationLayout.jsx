import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import StepIndicator from "./StepIndicator";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import StepThree from "./StepThree";
import StepFour from "./StepFour";
import StepFive from "./StepFive";
import StepSix from "./StepSix";

const API_URL = import.meta.env.VITE_API_URL;

console.log("API_URL is:", API_URL); // temporary debug line

function RegistrationLayout() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

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
    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_URL}/user/signup`, formData);
      sessionStorage.setItem("token", response.data.token);
      sessionStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/app/home");
    } catch (error) {
      console.error(error);

      if (error.response?.data?.errors) {
        alert(Object.values(error.response.data.errors)[0]);
      } else if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
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
          <StepSix onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        )}
      </div>
    </main>
  );
}

export default RegistrationLayout;
