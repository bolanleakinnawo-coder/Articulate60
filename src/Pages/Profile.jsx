import { useState } from "react";
import {
  Eye,
  EyeOff,
  Settings,
  Play,
  User,
  X,
  Flame,
  Trophy,
  CircleCheck,
  Clock3,
} from "lucide-react";
import axios from "axios";
import "./Profile.css";

const API_URL = import.meta.env.VITE_API_URL;

const STATS = [
  { value: "23", label: "Current streak", icon: Flame },
  { value: "27", label: "Longest streak", icon: Trophy },
  { value: "54", label: "Sessions completed", icon: CircleCheck },
  { value: "3h 42m", label: "Speaking time", icon: Clock3 },
];

const RECORDINGS = [
  {
    title: "Should people choose job security over passion?",
    level: "Level 2",
    duration: "2 min",
    date: "May 8, 2024",
  },
  {
    title: "Is social media doing more harm than good?",
    level: "Level 3",
    duration: "3 min",
    date: "May 7, 2024",
  },
  {
    title: "Describe a time you had to solve a problem quickly.",
    level: "Level 1",
    duration: "1 min",
    date: "May 6, 2024",
  },
];

export default function Profile({ user }) {
  const storedUser = user || getStoredUser();
  const [profileUser, setProfileUser] = useState(storedUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: storedUser?.fullName || "",
    username: storedUser?.username || "",
    email: storedUser?.email || "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.put(`${API_URL}/user/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedUser = response.data.user;
      setProfileUser(updatedUser);
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditing(false);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not update your profile. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const name = profileUser?.fullName || profileUser?.username || "Amara";

  const memberSince = user?.memberSince || "Member since Apr 2024";

  return (
    <div className="profile-content">
      <header className="profile-header">
        <span className="profile-eyebrow">Profile</span>
        <button className="profile-settings" aria-label="Settings">
          <Settings size={20} />
        </button>
      </header>

      <div className="profile-card">
        <div className="profile-info">
          <h1>{name}</h1>

          <p>{memberSince}</p>
        </div>
        <button
          className="profile-edit-button"
          onClick={() => {
            setFormData({
              fullName: profileUser?.fullName || "",
              username: profileUser?.username || "",
              email: profileUser?.email || "",
              newPassword: "",
              confirmPassword: "",
            });
            setError("");
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setIsEditing(true);
          }}
        >
          Edit Profile
        </button>
      </div>

      {isEditing && (
        <form className="profile-edit-form" onSubmit={handleSave}>
          <div className="profile-edit-form-header">
            <h2>Edit Profile</h2>
            <button
              type="button"
              className="profile-close-button"
              onClick={() => setIsEditing(false)}
              aria-label="Close edit form"
            >
              <X size={18} />
            </button>
          </div>
          {[
            ["fullName", "Full name", "text"],
            ["username", "Username", "text"],
            ["email", "Email", "email"],
          ].map(([field, label, type]) => (
            <label className="profile-edit-field" key={field}>
              {label}
              <input
                type={type}
                value={formData[field]}
                onChange={(event) =>
                  setFormData({ ...formData, [field]: event.target.value })
                }
              />
            </label>
          ))}
          <label className="profile-edit-field">
            New password <span className="profile-field-hint">Optional</span>
            <div className="password-input-wrapper">
              <input
                type={showNewPassword ? "text" : "password"}
                value={formData.newPassword}
                placeholder="Leave blank to keep current password"
                onChange={(event) =>
                  setFormData({ ...formData, newPassword: event.target.value })
                }
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword((visible) => !visible)}
                aria-label={
                  showNewPassword ? "Hide new password" : "Show new password"
                }
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <label className="profile-edit-field">
            Confirm new password
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                placeholder="Confirm your new password"
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    confirmPassword: event.target.value,
                  })
                }
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button
            className="profile-save-button"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </form>
      )}

      <section className="profile-section profile-stats-section">
        <h2>Your Stats</h2>
        <div className="profile-stats-grid">
          {STATS.map((stat) => (
            <div className="profile-stat-card" key={stat.label}>
              <stat.icon
                className="profile-stat-icon"
                size={20}
                strokeWidth={2}
              />
              <span className="profile-stat-value">{stat.value}</span>
              <span className="profile-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-section profile-recordings-section">
        <div className="profile-section-header">
          <h2>Your Recordings</h2>
          <button className="profile-see-all">See all</button>
        </div>

        <div className="profile-recordings-list">
          {RECORDINGS.map((recording) => (
            <div className="profile-recording-item" key={recording.title}>
              <div className="profile-recording-avatar">
                <User size={16} />
              </div>
              <div className="profile-recording-details">
                <h3>{recording.title}</h3>
                <p>
                  {recording.level} · {recording.duration}
                  <span className="profile-recording-date">
                    {recording.date}
                  </span>
                </p>
              </div>
              <button
                className="profile-recording-play"
                aria-label="Play recording"
              >
                <Play size={14} fill="currentColor" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}
