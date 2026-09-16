import { useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Play,
  Pause,
  X,
  Flame,
  Trophy,
  CircleCheck,
  Clock3,
} from "lucide-react";
import axios from "axios";
import api from "../api/axios";
import "./Profile.css";

const API_URL = import.meta.env.VITE_API_URL;

const STATS = [
  { key: "current", label: "Current streak", icon: Flame },
  { key: "vocabulary", label: "Vocabulary practice", icon: Trophy },
  { key: "sessions", label: "Sessions completed", icon: CircleCheck },
  { key: "speakingTime", label: "Speaking time", icon: Clock3 },
];

export default function Profile({ user }) {
  const storedUser = user || getStoredUser();
  const [profileUser, setProfileUser] = useState(storedUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [recordings, setRecordings] = useState([]);
  const recordingAudioRef = useRef(null);
  const [playingRecordingId, setPlayingRecordingId] = useState(null);
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

  useEffect(() => {
    api
      .get("/api/practice/streak")
      .then((response) => setStreak(response.data))
      .catch(() => setStreak({ current: 0, longest: 0 }));
  }, []);

  useEffect(() => {
    return () => recordingAudioRef.current?.pause();
  }, []);

  useEffect(() => {
    api
      .get("/api/practice/recordings")
      .then((response) => setRecordings(response.data))
      .catch(() => setRecordings([]));
  }, []);

  const name = profileUser?.fullName || profileUser?.username || "Amara";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  const memberSince = profileUser?.createdAt
    ? `Member since ${new Date(profileUser.createdAt).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })}`
    : "Member since —";
  const stats = {
    current: streak.current,
    vocabulary: "—",
    sessions: recordings.length,
    speakingTime: formatSpeakingTime(
      recordings.reduce((total, recording) => total + recording.durationSeconds, 0),
    ),
  };

  const toggleRecordingPlayback = async (recording) => {
    const currentAudio = recordingAudioRef.current;
    if (currentAudio?.src === recording.audioUrl) {
      if (currentAudio.paused) {
        await currentAudio.play();
        setPlayingRecordingId(recording._id);
      } else {
        currentAudio.pause();
        setPlayingRecordingId(null);
      }
      return;
    }

    currentAudio?.pause();
    const audio = new Audio(recording.audioUrl);
    audio.addEventListener("ended", () => setPlayingRecordingId(null));
    recordingAudioRef.current = audio;
    await audio.play();
    setPlayingRecordingId(recording._id);
  };

  return (
    <div className="profile-content">
      <header className="profile-header">
        <span className="profile-eyebrow">Profile</span>
      </header>

      <div className="profile-card">
        {profileUser?.profileImageUrl ? (
          <img
            className="profile-avatar profile-avatar-image"
            src={profileUser.profileImageUrl}
            alt={`${name}'s profile`}
          />
        ) : (
          <div className="profile-avatar" aria-label={`${name}'s profile initial`}>
            {initial}
          </div>
        )}
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
              <span className="profile-stat-value">
                {stats[stat.key]}
              </span>
              <span className="profile-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-section profile-recordings-section">
        <div className="profile-section-header">
          <h2>Your Recordings</h2>
        </div>

        <div className="profile-recordings-list">
          {recordings.map((recording) => ({
            ...recording,
            title: recording.topic,
            level: `Level ${recording.level}`,
            duration: formatDuration(recording.durationSeconds),
          })).map((recording) => (
            <div className="activity-item" key={recording.title}>
              <div>
                <h3>{recording.title}</h3>
                <p>
                  {recording.level} · {recording.duration}
                </p>
              </div>
              <button
                className="play-button"
                aria-label={playingRecordingId === recording._id ? "Pause recording" : "Play recording"}
                onClick={() => toggleRecordingPlayback(recording)}
              >
                {playingRecordingId === recording._id ? (
                  <Pause size={14} fill="currentColor" />
                ) : (
                  <Play size={14} fill="currentColor" />
                )}
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

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

function formatSpeakingTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}
