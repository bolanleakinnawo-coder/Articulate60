import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  LifeBuoy,
  LogOut,
  Mic,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  Users,
} from "lucide-react";
import api from "../api/axios";
import ProfileImageCropper from "../Components/ProfileImageCropper";
import FeedbackReport from "../Components/practice/FeedbackReport";
import ProfileStats from "./ProfileStats";
import ProfileShareWin from "./ProfileShareWin";
import ProfilePractices from "./ProfilePractices";
import ProfileUsage from "./ProfileUsage";
import ProfileNotifications from "./ProfileNotifications";
import { getPlan } from "../data/plans";
import {
  getNotificationPrefs,
  setNotificationPrefs,
} from "../data/notifications";
import "./Profile.css";
import { disablePush } from "../lib/push";
import { disconnectRealtime } from "../lib/realtime";

// Profile home: a summary card, then "Your Loquiex", "Your membership" and
// "Account & preferences" lists. Every row opens its own page.
export default function Profile({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = user || getStoredUser();
  const [profileUser, setProfileUser] = useState(storedUser);
  // main | stats | win | practices | usage | notifications | account
  const [view, setView] = useState(location.state?.open || "main");
  const [saveMessage, setSaveMessage] = useState("");
  const [feedbackRecording, setFeedbackRecording] = useState(null);
  const [analysingId, setAnalysingId] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [recordings, setRecordings] = useState([]);
  const profilePhotoInputRef = useRef(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [removeProfilePhoto, setRemoveProfilePhoto] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notificationPrefs, setPrefs] = useState(getNotificationPrefs);
  const [deleteForm, setDeleteForm] = useState({ password: "", confirmText: "" });
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
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
    setSaveMessage("");
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Your new passwords don't match.");
      return;
    }
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
      // A new password signs out every other device; this one gets a new
      // sign-in token so it stays signed in.
      if (response.data.token) {
        sessionStorage.setItem("token", response.data.token);
        disconnectRealtime();
      }
      setProfileUser(updatedUser);
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      setProfilePhoto(null);
      setRemoveProfilePhoto(false);
      setFormData((data) => ({
        ...data,
        newPassword: "",
        confirmPassword: "",
      }));
      setSaveMessage(
        formData.newPassword
          ? "Your changes and new password are saved."
          : "Your changes are saved.",
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not update your profile. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Personal information and Privacy & security share one form state.
  const openForm = (nextView) => {
    setFormData({
      fullName: profileUser?.fullName || "",
      username: profileUser?.username || "",
      email: profileUser?.email || "",
      newPassword: "",
      confirmPassword: "",
    });
    setError("");
    setSaveMessage("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setProfilePhoto(null);
    setRemoveProfilePhoto(false);
    setView(nextView);
  };

  const handleLogout = async () => {
    // Stop this device's streak reminders and live updates for this member.
    await disablePush().catch(() => {});
    disconnectRealtime();
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const openDelete = () => {
    setDeleteForm({ password: "", confirmText: "" });
    setDeleteError("");
    setShowDeletePassword(false);
    setView("delete");
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    setDeleteError("");
    if (deleteForm.confirmText.trim() !== "DELETE") {
      setDeleteError("Type DELETE in capital letters to confirm.");
      return;
    }
    if (!deleteForm.password) {
      setDeleteError("Enter your password to confirm it's you.");
      return;
    }
    setIsDeleting(true);
    try {
      await api.delete("/user/account", {
        data: {
          password: deleteForm.password,
          confirmText: deleteForm.confirmText.trim(),
        },
      });
      await disablePush().catch(() => {});
      disconnectRealtime();
      sessionStorage.clear();
      try {
        localStorage.clear();
      } catch {
        // Storage blocked: nothing kept on this device.
      }
      navigate("/login", {
        replace: true,
        state: { notice: "Your account has been deleted. We're sorry to see you go." },
      });
    } catch (requestError) {
      setDeleteError(
        requestError.response?.data?.message ||
          "We couldn't delete your account just now. Please try again.",
      );
      setIsDeleting(false);
    }
  };

  // Streak and recordings drive the stats, so keep them live: load on open,
  // reload when the app comes back into focus, and every minute while the
  // stats or usage page is showing.
  useEffect(() => {
    const refresh = () => {
      api
        .get("/api/practice/streak")
        .then((response) => setStreak(response.data))
        .catch(() => {});
      api
        .get("/api/practice/recordings")
        .then((response) => setRecordings(response.data))
        .catch(() => {});
    };
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    const timer =
      view === "stats" || view === "usage" ? setInterval(refresh, 60000) : null;
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) clearInterval(timer);
    };
  }, [view]);

  // Show a freshly cropped picture before it's saved.
  const photoPreview = useMemo(
    () => (profilePhoto ? URL.createObjectURL(profilePhoto) : null),
    [profilePhoto],
  );
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view, feedbackRecording]);

  const name = profileUser?.fullName || profileUser?.username || "Amara";
  const plan = getPlan(profileUser);

  const memberSince = profileUser?.createdAt
    ? `Member since ${new Date(profileUser.createdAt).toLocaleDateString(
        undefined,
        {
          month: "long",
          year: "numeric",
        },
      )}`
    : "Your communication journey";

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
      <ProfilePractices
        recordings={recordings}
        analysingId={analysingId}
        analysisError={analysisError}
        onOpenFeedback={setFeedbackRecording}
        onGetFeedback={getFeedback}
        onBack={() => setView("main")}
        onStart={() => navigate("/app/practice")}
      />
    );
  }

  // ---------- USAGE & LIMITS ----------
  if (view === "usage") {
    return (
      <ProfileUsage
        user={profileUser}
        recordings={recordings}
        onBack={() => setView("main")}
        onPlans={() =>
          navigate("/app/membership", { state: { from: "profile" } })
        }
      />
    );
  }

  // ---------- NOTIFICATIONS ----------
  if (view === "notifications") {
    return (
      <ProfileNotifications
        prefs={notificationPrefs}
        onTogglePref={updatePref}
        onBack={() => setView("main")}
      />
    );
  }

  // ---------- YOUR STATS ----------
  if (view === "stats") {
    return (
      <ProfileStats
        recordings={recordings}
        streak={streak}
        onBack={() => setView("main")}
        onStart={() => navigate("/app/practice")}
      />
    );
  }

  // ---------- SHARE A WIN ----------
  if (view === "win") {
    return (
      <ProfileShareWin user={profileUser} onBack={() => setView("main")} />
    );
  }

  // ---------- DELETE ACCOUNT ----------
  if (view === "delete") {
    const subscription = profileUser?.subscription;
    const expiresAt = subscription?.expiresAt ? new Date(subscription.expiresAt) : null;
    const daysLeft =
      plan.id !== "free" && expiresAt
        ? daysUntil(expiresAt)
        : 0;
    const count = recordings.length;
    const losing = [
      `${count} practice recording${count === 1 ? "" : "s"} and ${count === 1 ? "its" : "their"} AI feedback`,
      streak.current > 0
        ? `Your ${streak.current}-day streak (best: ${streak.longest} days)`
        : `Your streak history (best: ${streak.longest} day${streak.longest === 1 ? "" : "s"})`,
      "Your wins and testimonials",
      "Your profile, photo and notification settings",
    ];
    const ready =
      deleteForm.confirmText.trim() === "DELETE" && deleteForm.password.length > 0;
    return (
      <div className="profile-content pf-delete-page">
        <SubHeader
          title="Delete account"
          subtitle="Permanently remove your Loquiex account and data."
          onBack={() => setView("main")}
        />

        <section className="pf-panel pf-delete-warning">
          <p className="pf-panel-title">This can't be undone</p>
          <p className="pf-panel-text">
            Deleting your account removes everything below from Loquiex
            straight away. You won't be able to get it back.
          </p>
          <ul className="pf-delete-list">
            {losing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {daysLeft > 0 && (
            <p className="pf-delete-plan">
              Your {plan.name.replace(/^Loquiex\s+/i, "")} plan has {daysLeft} day
              {daysLeft === 1 ? "" : "s"} left. It ends when your account is
              deleted, and unused time isn't refunded. Plans don't renew on
              their own, so nothing else will be charged.
            </p>
          )}
          <p className="pf-field-hint">
            We keep payment receipts (amount, date and reference, with no name
            or email) because the law requires financial records.
          </p>
        </section>

        <form className="pf-panel pf-form" onSubmit={handleDeleteAccount} noValidate>
          <p className="pf-panel-title">Confirm it's you</p>
          <label className="pf-field">
            <span className="pf-field-label">Password</span>
            <span className="pf-field-wrap">
              <input
                type={showDeletePassword ? "text" : "password"}
                value={deleteForm.password}
                placeholder="Enter your password"
                autoComplete="current-password"
                onChange={(event) =>
                  setDeleteForm({ ...deleteForm, password: event.target.value })
                }
              />
              <button
                type="button"
                className="pf-field-eye"
                onClick={() => setShowDeletePassword((v) => !v)}
                aria-label={showDeletePassword ? "Hide password" : "Show password"}
              >
                {showDeletePassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
            <span className="pf-field-hint">
              Forgot it?{" "}
              <button
                type="button"
                className="pf-inline-link"
                onClick={() =>
                  navigate("/forgot-password", {
                    state: { identifier: profileUser?.email || "" },
                  })
                }
              >
                Reset your password
              </button>
            </span>
          </label>
          <label className="pf-field">
            <span className="pf-field-label">Type DELETE to confirm</span>
            <input
              type="text"
              value={deleteForm.confirmText}
              placeholder="DELETE"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(event) =>
                setDeleteForm({ ...deleteForm, confirmText: event.target.value })
              }
            />
          </label>
          {deleteError && <p className="form-error">{deleteError}</p>}
          <button
            type="submit"
            className="pf-danger-button pf-delete-submit"
            disabled={!ready || isDeleting}
          >
            <Trash2 size={18} />
            {isDeleting ? "Deleting your account..." : "Delete my account"}
          </button>
          <button
            type="button"
            className="pf-outline-button"
            onClick={() => setView("main")}
            disabled={isDeleting}
          >
            Keep my account
          </button>
        </form>
      </div>
    );
  }

  // ---------- PERSONAL INFORMATION ----------
  if (view === "account") {
    const photoUrl = photoPreview
      ? photoPreview
      : removeProfilePhoto
        ? null
        : profileUser?.profileImageUrl;
    const passwordField = (field, label, placeholder, hint, shown, toggle) => (
      <label className="pf-field">
        <span className="pf-field-label">{label}</span>
        <span className="pf-field-wrap">
          <input
            type={shown ? "text" : "password"}
            value={formData[field]}
            placeholder={placeholder}
            autoComplete="new-password"
            onChange={(event) =>
              setFormData({ ...formData, [field]: event.target.value })
            }
          />
          <button
            type="button"
            className="pf-field-eye"
            onClick={toggle}
            aria-label={
              shown
                ? `Hide ${label.toLowerCase()}`
                : `Show ${label.toLowerCase()}`
            }
          >
            {shown ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
        <span className="pf-field-hint">{hint}</span>
      </label>
    );
    return (
      <div className="profile-content pf-personal-page">
        <button
          className="pf-back pf-back-link"
          onClick={() => setView("main")}
        >
          <ArrowLeft size={18} /> Your Profile
        </button>

        <header className="pf-page-header">
          <h1>Personal information</h1>
          <p>Manage your name and account details.</p>
        </header>

        <section className="pf-identity">
          {photoUrl ? (
            <img
              className="pf-identity-avatar"
              src={photoUrl}
              alt={`${name}'s profile`}
            />
          ) : (
            <span className="pf-identity-avatar" aria-hidden="true">
              <User size={40} strokeWidth={1.8} />
            </span>
          )}
          <p className="pf-identity-name">{name}</p>
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
          <div className="pf-identity-links">
            <button
              type="button"
              className="pf-inline-link"
              onClick={() => profilePhotoInputRef.current?.click()}
            >
              {photoUrl ? "Edit profile picture" : "Add profile picture"}
            </button>
            {photoUrl && (
              <button
                type="button"
                className="pf-inline-link pf-link-muted"
                onClick={() => {
                  setProfilePhoto(null);
                  setRemoveProfilePhoto(Boolean(profileUser?.profileImageUrl));
                }}
              >
                Remove
              </button>
            )}
          </div>
          {(profilePhoto || removeProfilePhoto) && (
            <p className="pf-field-hint">
              {removeProfilePhoto
                ? "Your picture will be removed when you save."
                : "Save changes to keep your new picture."}
            </p>
          )}
        </section>

        <form className="pf-panel pf-form" onSubmit={handleSave}>
          <p className="pf-panel-title">Basic information</p>
          {[
            [
              "fullName",
              "Full name",
              "text",
              "name",
              "Your full name, including surname.",
            ],
            [
              "username",
              "Username",
              "text",
              "username",
              "Displayed on your profile.",
            ],
            [
              "email",
              "Email address",
              "email",
              "email",
              "For sign-in and account updates.",
            ],
          ].map(([field, label, type, autoComplete, hint]) => (
            <label className="pf-field" key={field}>
              <span className="pf-field-label">{label}</span>
              <input
                type={type}
                value={formData[field]}
                autoComplete={autoComplete}
                onChange={(event) =>
                  setFormData({ ...formData, [field]: event.target.value })
                }
              />
              <span className="pf-field-hint">{hint}</span>
            </label>
          ))}
          {passwordField(
            "newPassword",
            "Change password",
            "Enter new password",
            "Choose a strong password. Leave blank to keep your current one.",
            showNewPassword,
            () => setShowNewPassword((v) => !v),
          )}
          {passwordField(
            "confirmPassword",
            "Confirm password",
            "Re-enter new password",
            "Re-enter your new password.",
            showConfirmPassword,
            () => setShowConfirmPassword((v) => !v),
          )}
          {error && <p className="form-error">{error}</p>}
          {saveMessage && <p className="profile-win-success">{saveMessage}</p>}
          <button
            className="profile-save-button pf-wide-button"
            type="submit"
            disabled={isSaving}
          >
            <Check size={18} /> {isSaving ? "Saving..." : "Save changes"}
          </button>
        </form>
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
      </div>
    );
  }

  // ---------- PROFILE HOME ----------
  const planShortName = plan.name.replace(/^Loquiex\s+/i, "");
  const sections = [
    {
      title: "Your Loquiex",
      rows: [
        {
          icon: BarChart3,
          title: "Your Stats",
          text: "Your progress and milestones",
          onClick: () => setView("stats"),
        },
        {
          icon: Trophy,
          title: "Share a Win",
          text: "Celebrate and share your progress",
          onClick: () => setView("win"),
        },
        {
          icon: Mic,
          title: "Your Practices",
          text: "Previous sessions and feedback",
          onClick: () => setView("practices"),
        },
      ],
    },
    {
      title: "Your membership",
      rows: [
        {
          icon: TrendingUp,
          title: "Usage & Limits",
          text: "Your remaining allowances",
          onClick: () => setView("usage"),
        },
        {
          icon: Users,
          title: "Invite & Earn",
          text: "Referrals and rewards",
          soon: true,
        },
        {
          icon: CreditCard,
          title: "Manage Membership",
          text: "Plan, billing and renewal",
          onClick: () =>
            navigate("/app/membership", { state: { from: "profile" } }),
        },
      ],
    },
    {
      title: "Account & preferences",
      rows: [
        {
          icon: User,
          title: "Personal information",
          text: "Manage your name and account details",
          onClick: () => openForm("account"),
        },
        {
          icon: Bell,
          title: "Notifications",
          text: "Check your latest Loquiex updates",
          onClick: () => setView("notifications"),
        },
        {
          icon: LifeBuoy,
          title: "Help & support",
          text: "Get assistance with Loquiex",
          onClick: () => navigate("/app/help", { state: { from: "profile" } }),
        },
      ],
    },
  ];

  return (
    <div className="profile-content pf-home">
      <header className="pf-page-header">
        <h1>Your Profile</h1>
        <p>Your communication journey, all in one place.</p>
      </header>

      <button className="pf-summary" onClick={() => openForm("account")}>
        {profileUser?.profileImageUrl ? (
          <img
            className="pf-avatar pf-avatar-image"
            src={profileUser.profileImageUrl}
            alt={`${name}'s profile`}
          />
        ) : (
          <span className="pf-avatar" aria-hidden="true">
            <User size={30} strokeWidth={1.8} />
          </span>
        )}
        <span className="pf-summary-info">
          <strong className="pf-summary-name">{name}</strong>
          <span className="pf-summary-plan">
            Current plan: <span className="pf-plan-pill">{planShortName}</span>
          </span>
          <span className="pf-member-since">{memberSince}</span>
        </span>
        <ChevronRight size={20} className="pf-row-chev" />
      </button>

      <div className="pf-groups">
        {sections.map((section) => (
          <section className="pf-group" key={section.title}>
            <h2 className="pf-group-title">{section.title}</h2>
            <div className="pf-list">
              {section.rows.map((row) => (
                <NavRow key={row.title} {...row} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="pf-list pf-list-logout">
        <NavRow
          icon={LogOut}
          title="Log out"
          text="Sign out of your Loquiex account"
          onClick={handleLogout}
          className="pf-row-logout"
        />
        <NavRow
          icon={Trash2}
          title="Delete account"
          text="Permanently remove your account and data"
          onClick={openDelete}
          className="pf-row-logout"
        />
      </div>
    </div>
  );
}

function NavRow({
  icon: Icon,
  title,
  text,
  onClick,
  className = "",
  soon = false,
}) {
  // Not available yet: shown, but it can't be opened.
  if (soon) {
    return (
      <div
        className={`pf-row pf-row-soon ${className}`}
        aria-disabled="true"
        aria-label={`${title}, coming soon`}
      >
        <span className="pf-row-icon">
          <Icon size={20} />
        </span>
        <span className="pf-row-text">
          <strong>{title}</strong>
          <span>{text}</span>
        </span>
        <span className="pf-soon-pill">Coming soon</span>
      </div>
    );
  }
  return (
    <button className={`pf-row ${className}`} onClick={onClick}>
      <span className="pf-row-icon">
        <Icon size={20} />
      </span>
      <span className="pf-row-text">
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
      <ChevronRight size={18} className="pf-row-chev" />
    </button>
  );
}

function SubHeader({ title, subtitle, onBack }) {
  return (
    <>
      <button className="pf-back pf-back-link" onClick={onBack}>
        <ArrowLeft size={18} /> Your Profile
      </button>
      <header className="pf-page-header">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </header>
    </>
  );
}

// Whole days left until `date` (rounded up), never below 0.
function daysUntil(date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}

function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}
