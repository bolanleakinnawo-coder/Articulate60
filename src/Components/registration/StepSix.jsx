import { ImagePlus } from "lucide-react";
import { useState } from "react";
import ProfileImageCropper from "../ProfileImageCropper";

function StepSix({
  onSubmit,
  isSubmitting,
  submitError,
  formData,
  updateFormData,
}) {
  const [cropFile, setCropFile] = useState(null);

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
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              setCropFile(event.target.files?.[0] || null);
              event.target.value = "";
            }}
          />
          {formData.profilePhoto && (
            <span className="profile-photo-filename">
              {formData.profilePhoto.name}
            </span>
          )}
        </label>
        {submitError && (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        )}
        <button
          type="submit"
          className="registration-next"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating your account..." : "Submit and get started"}
        </button>
      </form>
      {cropFile && (
        <ProfileImageCropper
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onCrop={(photo) => {
            updateFormData({ profilePhoto: photo });
            setCropFile(null);
          }}
        />
      )}
    </div>
  );
}

export default StepSix;
