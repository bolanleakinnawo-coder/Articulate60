import { useEffect, useRef, useState } from "react";
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

function RegistrationLayout() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submitInProgress = useRef(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    marketingOptIn: false,
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    role: "",
    roleOther: "",
    improvements: [],
    improvementOther: "",
    practiceFrequency: "",
    profilePhoto: null,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentStep]);

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
    if (submitInProgress.current) return;

    submitInProgress.current = true;
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "profilePhoto") {
          if (value) payload.append(key, value);
        } else if (key === "improvements") {
          payload.append(key, JSON.stringify(value));
        } else {
          payload.append(key, value);
        }
      });
      const response = await axios.post(`${API_URL}/user/signup`, payload);
      sessionStorage.setItem("token", response.data.token);
      sessionStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/app/home", { replace: true });
    } catch (error) {
      console.error(error);
      const validationMessage = error.response?.data?.errors
        ? Object.values(error.response.data.errors)[0]
        : null;
      setSubmitError(
        validationMessage ||
          error.response?.data?.message ||
          (error.request
            ? "We couldn't reach the server. Check your connection and try again."
            : "Something went wrong. Please try again."),
      );
    } finally {
      submitInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <main className="registration-page registration-flow-page">
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
          <StepSix
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitError={submitError}
            formData={formData}
            updateFormData={updateFormData}
          />
        )}
      </div>
    </main>
  );
}

export default RegistrationLayout;
