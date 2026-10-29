import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock3,
  Eye,
  EyeOff,
  Flame,
  Gem,
  Headphones,
  LifeBuoy,
  LogOut,
  MessageCircle,
  Mic,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import api from "../api/axios";
import ProfileImageCropper from "../Components/ProfileImageCropper";
import FeedbackReport from "../Components/practice/FeedbackReport";
import { getPlan, getUsage } from "../data/plans";
import {
  getNotificationPrefs,
  setNotificationPrefs,
} from "../data/notifications";
import "./Profile.css";

const STATS = [
  { key: "current", label: "Current streak", icon: Flame },
  { key: "vocabulary", label: "Vocabulary practice", icon: Trophy },
  { key: "sessions", label: "Sessions completed", icon: CircleCheck },
  { key: "speakingTime", label: "Speaking time", icon: Clock3 },
];

// Profile home: a summary card, "Your activity" and "Your account" lists.
// A down arrow opens the row in place; a right arrow opens its own page.
export default function Profile({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = user || getStoredUser();
  const [profileUser, setProfileUser] = useState(storedUser);
  const [view, setView] = useState(location.state?.open || "main"); // main | practices | usage | notifications
  const [openRow, setOpenRow] = useState(null); // stats | win
  const [feedbackRecording, setFeedbackRecording] = useState(null);
  const [analysingId, setAnalysingId] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [recordings, setRecordings] = useState([]);
  const [winText, setWinText] = useState("");
  const [winDisplayName, setWinDisplayName] = useState(
    storedUser?.username || "",
  );
  const [isSubmittingWin, setIsSubmittingWin] = useState(false);
  const [winError, setWinError] = useState("");
  const [winMessage, setWinMessage] = useState("");
  const recordingAudioRef = useRef(null);
  const profilePhotoInputRef = useRef(null);
  const [playingRecordingId, setPlayingRecordingId] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [removeProfilePhoto, setRemoveProfilePhoto] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notificationPrefs, setPrefs] = useState(getNotificationPrefs);
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
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) =>
        payload.append(key, value),
      );
      if (profilePhoto) payload.append("profilePhoto", profilePhoto);
      if (removeProfilePhoto) payload.append("removeProfilePhoto", "true");

      const response = await api.put("/user/profile", payload);
      const updatedUser = response.data.user;
      setProfileUser(updatedUser);
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      setProfilePhoto(null);
      setRemoveProfilePhoto(false);
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

  const handleWinSubmit = async (event) => {
    event.preventDefault();
    setWinError("");
    setWinMessage("");
    setIsSubmittingWin(true);

    try {
      await api.post("/api/testimonials", {
        quote: winText,
        displayName: winDisplayName,
      });
      setWinText("");
      setWinMessage("Your win was submitted for review.");
    } catch (requestError) {
      setWinError(
        requestError.response?.data?.message ||
          "Could not submit your win. Please try again.",
      );
    } finally {
      setIsSubmittingWin(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login", { replace: true });
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

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view, feedbackRecording]);

  const name = profileUser?.fullName || profileUser?.username || "Amara";
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const plan = getPlan(profileUser);
  const usage = getUsage(recordings, profileUser);

  const memberSince = profileUser?.createdAt
    ? `Member since ${new Date(profileUser.createdAt).toLocaleDateString(
        undefined,
        {
          month: "long",
          year: "numeric",
        },
      )}`
    : "Your communication journey";
  const totalSeconds = recordings.reduce(
    (total, recording) => total + (recording.durationSeconds || 0),
    0,
  );
  const stats = {
    current: streak.current,
    vocabulary: recordings.filter((recording) => recording.isWordOfTheDay)
      .length,
    sessions: recordings.length,
    speakingTime: formatSpeakingTime(totalSeconds),
  };

  const toggleRecordingPlayback = async (recording) => {
    const currentAudio = recordingAudioRef.current;
    try {
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
    } catch (playError) {
      console.error("Playback failed:", playError);
      setPlayingRecordingId(null);
    }
  };

  // Ask for feedback on an older recording that doesn't have any yet.
  const getFeedback = async (recording) => {
    setAnalysisError("");
    setAnalysingId(recording._id);
    try {
      const res = await api.post(
        `/api/practice/recordings/${recording._id}/analyze`,
        null,
        { timeout: 120000 },
      );
      const updated = {
        ...recording,
        ...res.data,
        analysisStatus: "done",
        analyzedAt: new Date().toISOString(),
      };
      setRecordings((list) =>
        list.map((r) => (r._id === recording._id ? updated : r)),
      );
      setFeedbackRecording(updated);
    } catch (err) {
      if (err.response?.data?.code === "UPGRADE_REQUIRED") {
        navigate("/app/membership", { state: { reason: "feedback" } });
        return;
      }
      setAnalysisError(
        err.response?.data?.message ||
          "We couldn't get feedback for this recording right now.",
      );
    } finally {
      setAnalysingId(null);
    }
  };

  const updatePref = (key) => {
    const next = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setPrefs(next);
    setNotificationPrefs(next);
  };

  // ---------- SAVED FEEDBACK ----------
  if (feedbackRecording) {
    const r = feedbackRecording;
    return (
      <div className="profile-content pf-feedback">
        <button className="pf-back" onClick={() => setFeedbackRecording(null)}>
          <ArrowLeft size={18} /> Your practices
        </button>
        <FeedbackReport
          report={{
            transcript: r.transcript,
            metrics: r.metrics || {},
            analysis: r.analysis || {},
          }}
          topic={r.topic}
          audioUrl={r.audioUrl}
          durationSeconds={r.durationSeconds}
          recordedAt={r.createdAt}
          onTryAgain={() =>
            navigate(
              r.category === "Yap Mode"
                ? "/app/practice/yap-session"
                : "/app/practice/prepare",
              {
                state: {
                  level: r.level,
                  category: { id: "", title: r.category },
                  prompt: r.topic,
                  isYap: r.category === "Yap Mode",
                  speakSeconds: r.durationSeconds > 60 ? 120 : 60,
                },
              },
            )
          }
          onDone={() => setFeedbackRecording(null)}
          doneLabel="Back to your practices"
        />
      </div>
    );
  }

  // ---------- YOUR PRACTICES ----------
  if (view === "practices") {
    return (
      <div className="profile-content">
        <SubHeader
          title="Your practices"
          subtitle="Revisit your speaking sessions and your feedback."
          onBack={() => setView("main")}
        />
        {analysisError && <p className="form-error">{analysisError}</p>}
        <div className="pf-practice-list">
          {recordings.length === 0 && (
            <p className="pf-empty">
              No practices yet. Your recordings will appear here.
            </p>
          )}
          {recordings.map((recording) => {
            const hasFeedback =
              recording.analysisStatus === "done" && recording.analysis;
            const isPlaying = playingRecordingId === recording._id;
            return (
              <article className="pf-practice" key={recording._id}>
                <div className="pf-practice-top">
                  <div className="pf-practice-text">
                    <p className="pf-practice-date">
                      {formatRecordedAt(recording.createdAt)}
                    </p>
                    <h3>{recording.topic}</h3>
                    <p className="pf-practice-meta">
                      {[
                        recording.category,
                        recording.level ? `Level ${recording.level}` : null,
                        formatDuration(recording.durationSeconds),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    className="play-button"
                    aria-label={
                      isPlaying ? "Pause recording" : "Play recording"
                    }
                    onClick={() => toggleRecordingPlayback(recording)}
                  >
                    {isPlaying ? (
                      <Pause size={14} fill="currentColor" />
                    ) : (
                      <Play size={14} fill="currentColor" />
                    )}
                  </button>
                </div>
                {hasFeedback ? (
                  <button
                    className="pf-feedback-btn"
                    onClick={() => setFeedbackRecording(recording)}
                  >
                    <Sparkles size={15} /> See your feedback
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    className="pf-feedback-btn pf-feedback-btn-quiet"
                    disabled={analysingId === recording._id}
                    onClick={() => getFeedback(recording)}
                  >
                    <Sparkles size={15} />
                    {analysingId === recording._id
                      ? "Getting your feedback…"
                      : "Get AI feedback"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- USAGE & LIMITS ----------
  if (view === "usage") {
    const rows = [
      {
        icon: MessageCircle,
        title: "AI Feedback",
        left: usage.aiFeedback.left,
        total: usage.aiFeedback.total,
        unit: "sessions",
      },
      {
        icon: Headphones,
        title: "Group Practice",
        left: usage.groupMinutes.left,
        total: usage.groupMinutes.total,
        unit: "minutes",
      },
    ];
    return (
      <div className="profile-content">
        <SubHeader
          title="Usage & Limits"
          subtitle="Track your daily allowances."
          onBack={() => setView("main")}
        />
        <button
          className="pf-row pf-row-card"
          onClick={() => navigate("/app/membership")}
        >
          <span className="pf-row-icon">
            <Gem size={18} />
          </span>
          <span className="pf-row-text">
            <strong>{plan.name}</strong>
            <span>Your membership plan</span>
          </span>
          <ChevronRight size={18} className="pf-row-chev" />
        </button>
        {rows.map((row) => {
          const pct = row.total ? Math.round((row.left / row.total) * 100) : 0;
          return (
            <section className="pf-usage-card" key={row.title}>
              <p className="pf-usage-title">
                <row.icon size={18} /> {row.title}
              </p>
              {row.total ? (
                <>
                  <div className="pf-usage-line">
                    <strong>
                      {row.left} {row.unit} left
                    </strong>
                    <span>{pct}% available</span>
                  </div>
                  <span className="pf-bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <p className="pf-usage-foot">
                    {row.total} {row.unit} per day
                  </p>
                </>
              ) : (
                <p className="pf-usage-foot">
                  Not included in your plan.{" "}
                  <button
                    className="pf-inline-link"
                    onClick={() => navigate("/app/membership")}
                  >
                    See plans
                  </button>
                </p>
              )}
            </section>
          );
        })}
        <p className="pf-reset-note">
          <RefreshCw size={16} /> Your allowances reset at midnight.
        </p>
      </div>
    );
  }

  // ---------- NOTIFICATIONS ----------
  if (view === "notifications") {
    const prefs = [
      {
        key: "streakPopups",
        title: "Streak pop-ups",
        text: "A quick nudge when your streak needs you, and a cheer when you hit a milestone.",
      },
      {
        key: "practiceNudges",
        title: "Practice nudges",
        text: "Tips and reminders shaped around what you told us you want to improve.",
      },
    ];
    return (
      <div className="profile-content">
        <SubHeader
          title="Notifications"
          subtitle="Choose which pop-ups you see in Loquiex."
          onBack={() => setView("main")}
        />
        <div className="pf-list">
          {prefs.map((p) => (
            <label className="pf-row pf-toggle-row" key={p.key}>
              <span className="pf-row-text">
                <strong>{p.title}</strong>
                <span>{p.text}</span>
              </span>
              <input
                type="checkbox"
                className="pf-switch"
                checked={notificationPrefs[p.key]}
                onChange={() => updatePref(p.key)}
              />
            </label>
          ))}
        </div>
        <div className="pf-list">
          <button className="pf-row" onClick={() => navigate("/app/help")}>
            <span className="pf-row-icon">
              <LifeBuoy size={18} />
            </span>
            <span className="pf-row-text">
              <strong>Help & Support</strong>
              <span>FAQs and contacting the Loquiex team</span>
            </span>
            <ChevronRight size={18} className="pf-row-chev" />
          </button>
        </div>
      </div>
    );
  }

  // ---------- PROFILE HOME ----------
  return (
    <div className="profile-content">
      <header className="profile-header">
        <span className="profile-eyebrow">Profile</span>
      </header>

      <section className="pf-summary">
        <div className="pf-summary-top">
          {profileUser?.profileImageUrl ? (
            <img
              className="pf-avatar pf-avatar-image"
              src={profileUser.profileImageUrl}
              alt={`${name}'s profile`}
            />
          ) : (
            <div className="pf-avatar" aria-label={`${name}'s profile initial`}>
              {initial}
            </div>
          )}
          <div className="pf-summary-info">
            <h1>{name}</h1>
            <p className="pf-plan-badge">
              <Gem size={14} /> {plan.name}
            </p>
            <p className="pf-member-since">{memberSince}</p>
          </div>
          <button
            className="pf-edit"
            aria-label="Edit profile"
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
              setProfilePhoto(null);
              setRemoveProfilePhoto(false);
              setIsEditing(true);
            }}
          >
            <Pencil size={16} />
          </button>
        </div>
        <div className="pf-summary-stats">
          <div>
            <span>Practices</span>
            <strong>{recordings.length}</strong>
          </div>
          <div>
            <span>Speaking time</span>
            <strong>{formatSpeakingTime(totalSeconds)}</strong>
          </div>
          <div>
            <span>Streak</span>
            <strong>
              {streak.current} day{streak.current === 1 ? "" : "s"}
            </strong>
          </div>
        </div>
      </section>

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
          <div className="profile-edit-photo">
            <div className="profile-edit-photo-preview">
              {profileUser?.profileImageUrl ? (
                removeProfilePhoto ? (
                  <span aria-hidden="true">{initial}</span>
                ) : (
                  <img
                    src={profileUser.profileImageUrl}
                    alt={`${name}'s current profile`}
                  />
                )
              ) : (
                <span aria-hidden="true">{initial}</span>
              )}
            </div>
            <div className="profile-edit-photo-copy">
              <strong>Profile picture</strong>
              <span>
                {removeProfilePhoto
                  ? "Your photo will be removed when you save"
                  : profilePhoto
                    ? profilePhoto.name
                    : !profileUser?.profileImageUrl &&
                      "Add a photo whenever you're ready"}
              </span>
              <input
                ref={profilePhotoInputRef}
                className="profile-edit-photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  setCropFile(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                className="profile-photo-change-button"
                onClick={() => profilePhotoInputRef.current?.click()}
              >
                {profileUser?.profileImageUrl || profilePhoto
                  ? "Edit picture"
                  : "Upload a photo"}
              </button>
              {(profileUser?.profileImageUrl || profilePhoto) &&
                !removeProfilePhoto && (
                  <button
                    type="button"
                    className="profile-photo-remove-button"
                    onClick={() => {
                      setProfilePhoto(null);
                      setRemoveProfilePhoto(
                        Boolean(profileUser?.profileImageUrl),
                      );
                    }}
                  >
                    Remove picture
                  </button>
                )}
            </div>
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
      {cropFile && (
        <ProfileImageCropper
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onCrop={(photo) => {
            setProfilePhoto(photo);
            setRemoveProfilePhoto(false);
            setCropFile(null);
          }}
        />
      )}

      <h2 className="pf-group-title">Your activity</h2>
      <div className="pf-list">
        <ExpandRow
          icon={BarChart3}
          title="Your stats"
          text="Explore your progress"
          open={openRow === "stats"}
          onToggle={() => setOpenRow(openRow === "stats" ? null : "stats")}
        >
          <div className="profile-stats-grid">
            {STATS.map((stat) => (
              <div className="profile-stat-card" key={stat.label}>
                <stat.icon
                  className="profile-stat-icon"
                  size={20}
                  strokeWidth={2}
                />
                <span className="profile-stat-value">{stats[stat.key]}</span>
                <span className="profile-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </ExpandRow>

        <ExpandRow
          icon={Share2}
          title="Share a win"
          text="Celebrate your progress"
          open={openRow === "win"}
          onToggle={() => setOpenRow(openRow === "win" ? null : "win")}
        >
          <p className="profile-win-intro">
            What's a communication win you're celebrating today?
          </p>
          <p className="profile-win-prompt">
            Big or small, tell us about the moment
          </p>
          <form
            className="profile-section profile-win-form"
            onSubmit={handleWinSubmit}
          >
            <label className="profile-edit-field">
              <textarea
                value={winText}
                onChange={(event) => setWinText(event.target.value)}
                maxLength={280}
                rows={4}
                required
                placeholder='E.g. "I finally spoke up in a meeting at work."'
              />
              <span className="profile-field-hint">
                {winText.length}/280 characters
              </span>
            </label>

            {winError && <p className="form-error">{winError}</p>}
            {winMessage && <p className="profile-win-success">{winMessage}</p>}
            <button
              className="profile-save-button profile-win-submit"
              type="submit"
              disabled={isSubmittingWin}
            >
              <Send size={15} />
              {isSubmittingWin ? "Submitting..." : "Share my win"}
            </button>
          </form>
          <p className="profile-win-review-note">
            Your win will be reviewed before it&apos;s shared with the Loquiex
            community.
          </p>
        </ExpandRow>

        <button className="pf-row" onClick={() => setView("practices")}>
          <span className="pf-row-icon">
            <Mic size={18} />
          </span>
          <span className="pf-row-text">
            <strong>Your practices</strong>
            <span>Revisit your speaking sessions</span>
          </span>
          <ChevronRight size={18} className="pf-row-chev" />
        </button>
      </div>

      <h2 className="pf-group-title">Your account</h2>
      <div className="pf-list">
        <button className="pf-row" onClick={() => navigate("/app/membership")}>
          <span className="pf-row-icon pf-row-icon-plain">
            <Gem size={18} />
          </span>
          <span className="pf-row-text">
            <strong>My plan</strong>
          </span>
          <ChevronRight size={18} className="pf-row-chev" />
        </button>
        <button className="pf-row" onClick={() => setView("usage")}>
          <span className="pf-row-icon pf-row-icon-plain">
            <BarChart3 size={18} />
          </span>
          <span className="pf-row-text">
            <strong>Usage & Limits</strong>
          </span>
          <ChevronRight size={18} className="pf-row-chev" />
        </button>
        <button className="pf-row" onClick={() => setView("notifications")}>
          <span className="pf-row-icon pf-row-icon-plain">
            <Bell size={18} />
          </span>
          <span className="pf-row-text">
            <strong>Notifications</strong>
          </span>
          <ChevronRight size={18} className="pf-row-chev" />
        </button>
        <button className="pf-row" onClick={() => navigate("/app/help")}>
          <span className="pf-row-icon pf-row-icon-plain">
            <LifeBuoy size={18} />
          </span>
          <span className="pf-row-text">
            <strong>Help & Support</strong>
          </span>
          <ChevronRight size={18} className="pf-row-chev" />
        </button>
        <button className="pf-row pf-row-logout" onClick={handleLogout}>
          <span className="pf-row-icon pf-row-icon-plain">
            <LogOut size={18} />
          </span>
          <span className="pf-row-text">
            <strong>Log out</strong>
          </span>
          <ChevronRight size={18} className="pf-row-chev" />
        </button>
      </div>
    </div>
  );
}

function SubHeader({ title, subtitle, onBack }) {
  return (
    <header className="pf-subheader">
      <button className="pf-back-circle" onClick={onBack} aria-label="Back">
        <ArrowLeft size={18} />
      </button>
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  );
}

function ExpandRow({ icon: Icon, title, text, open, onToggle, children }) {
  return (
    <div className={`pf-expand ${open ? "pf-expand-open" : ""}`}>
      <button className="pf-row" onClick={onToggle} aria-expanded={open}>
        <span className="pf-row-icon">
          <Icon size={18} />
        </span>
        <span className="pf-row-text">
          <strong>{title}</strong>
          <span>{text}</span>
        </span>
        <ChevronDown size={18} className="pf-row-chev pf-row-chev-down" />
      </button>
      {open && <div className="pf-expand-body">{children}</div>}
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

function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${remainingSeconds}s`;
}

function formatSpeakingTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes} min`;
  return `${seconds} sec`;
}

// "Tue, 28 Oct 2026 · 11:05 PM"
function formatRecordedAt(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}
