function StepTwo({
  onNext,
  onBack,
  formData,
  updateFormData,
}) {
  return (
    <div className="registration-step-content">
      <div className="registration-header">
        <h1>Tell us about yourself</h1>

        <p>Let's get to know you.</p>
      </div>

      <form className="registration-form">
        {/* Full Name */}
        <div className="form-field">
          <label htmlFor="fullName">Full name</label>

          <input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={(e) =>
              updateFormData({
                fullName: e.target.value,
              })
            }
          />
        </div>

        {/* Username */}
        <div className="form-field">
          <label htmlFor="username">Username</label>

          <input
            id="username"
            type="text"
            placeholder="Choose a username"
            value={formData.username}
            onChange={(e) =>
              updateFormData({
                username: e.target.value,
              })
            }
          />
        </div>

        {/* Email */}
        <div className="form-field">
          <label htmlFor="email">Email address</label>

          <input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={(e) =>
              updateFormData({
                email: e.target.value,
              })
            }
          />
        </div>

        {/* Phone Number */}
        <div className="form-field">
          <label htmlFor="phoneNumber">Phone number</label>

          <input
            id="phoneNumber"
            type="tel"
            placeholder="Enter your phone number"
            value={formData.phoneNumber}
            onChange={(e) =>
              updateFormData({
                phoneNumber: e.target.value,
              })
            }
          />
        </div>

        {/* Password */}
        <div className="form-field">
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) =>
              updateFormData({
                password: e.target.value,
              })
            }
          />
        </div>

        {/* Confirm Password */}
        <div className="form-field">
          <label htmlFor="confirmPassword">
            Confirm password
          </label>

          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) =>
              updateFormData({
                confirmPassword: e.target.value,
              })
            }
          />
        </div>

        {/* Actions */}
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
      </form>
    </div>
  );
}

export default StepTwo;