function StepSix({ onSubmit, isSubmitting, formData, updateFormData }) {
  return (
    <div className="registration-step-content success-step">
      <div className="success-icon">✓</div>

      <div className="registration-header">
        <p className="registration-step">STEP 6 OF 6</p>
        <h1>You're all set!</h1>
        <p>Review complete. Submit to create your account.</p>
      </div>

      <form onSubmit={onSubmit}>
        <label className="profile-photo-upload">
          Profile photo <span>(optional)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              updateFormData({ profilePhoto: event.target.files?.[0] || null })
            }
          />
          {formData.profilePhoto && <small>{formData.profilePhoto.name}</small>}
        </label>
        <button
          type="submit"
          className="registration-next"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating your account..." : "Submit and get started"}
        </button>
      </form>
    </div>
  );
}

export default StepSix;
