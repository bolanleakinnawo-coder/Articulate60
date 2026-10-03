import { ImagePlus } from "lucide-react";

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
        <label className="profile-photo-upload" htmlFor="registration-profile-photo">
          <span className="profile-photo-icon" aria-hidden="true">
            <ImagePlus size={22} />
          </span>
          <span className="profile-photo-copy">
            <strong>Add a profile photo</strong>
            <small>Optional · Choose an image from your device</small>
          </span>
          <input
            id="registration-profile-photo"
            type="file"
            accept="image/*"
            onChange={(event) =>
              updateFormData({ profilePhoto: event.target.files?.[0] || null })
            }
          />
          {formData.profilePhoto && (
            <span className="profile-photo-filename">
              {formData.profilePhoto.name}
            </span>
          )}
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
