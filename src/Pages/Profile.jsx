import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  LifeBuoy,
  LogOut,
  Mic,
  Share2,
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
  // main | stats | win | practices | usage | invite | notifications | account
  const [view, setView] = useState(location.state?.open || "main");
  const [inviteCopied, setInviteCopied] = useState(false);
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

  // ---------- INVITE & EARN ----------
  if (view === "invite") {
    const inviteLink = `${window.location.origin}/register?ref=${encodeURIComponent(
      profileUser?.username || "",
    )}`;
    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(inviteLink);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
      } catch {
        setInviteCopied(false);
      }
    };
    const shareLink = () =>
      navigator
        .share({
          title: "Join me on Loquiex",
          text: "I'm practising speaking with Loquiex. Come practise with me.",
          url: inviteLink,
        })
        .catch(() => {});
    return (
      <div className="profile-content">
        <SubHeader
          title="Invite & Earn"
          subtitle="Referrals and rewards."
          onBack={() => setView("main")}
        />
        <section className="pf-panel">
          <p className="pf-panel-title">Invite a friend to Loquiex</p>
          <p className="pf-panel-text">
            Share your personal link. When friends join and start practising,
            you&apos;ll both earn rewards.
          </p>
          <div className="pf-invite-link">
            <span>{inviteLink}</span>
            <button type="button" onClick={copyLink}>
              {inviteCopied ? <Check size={16} /> : <Copy size={16} />}
              {inviteCopied ? "Copied" : "Copy"}
            </button>
          </div>
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              type="button"
              className="profile-save-button pf-wide-button"
              onClick={shareLink}
            >
              <Share2 size={16} /> Share invite link
            </button>
          )}
        </section>
        <section className="pf-panel">
          <p className="pf-panel-title">Your rewards</p>
          <div className="pf-invite-stats">
            <div>
              <strong>0</strong>
              <span>Friends joined</span>
            </div>
            <div>
              <strong>0</strong>
              <span>Rewards earned</span>
            </div>
          </div>
        </section>
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
          onClick: () => setView("invite"),
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
    <div className="profile-content">
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

      <div className="pf-list pf-list-logout">
        <NavRow
          icon={LogOut}
          title="Log out"
          text="Sign out of your Loquiex account"
          onClick={handleLogout}
          className="pf-row-logout"
        />
      </div>
    </div>
  );
}

function NavRow({ icon: Icon, title, text, onClick, className = "" }) {
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

function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}
