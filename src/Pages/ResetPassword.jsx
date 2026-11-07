import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LinkIcon } from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = "loquiex.resetToken";

// The token comes in the email link (?token=...). It's moved out of the
// address bar straight away so it isn't left in history or sent to other
// sites, and kept for this tab only in case the page is reloaded.
function readToken() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("token");
  try {
    if (fromUrl) {
      sessionStorage.setItem(TOKEN_KEY, fromUrl);
      window.history.replaceState(null, "", window.location.pathname);
      return fromUrl;
    }
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return fromUrl || "";
  }
}

function forgetToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked: nothing kept.
  }
}

const passwordProblem = (password) => {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 128) return "Use 128 characters or fewer.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return "Include at least one letter and one number.";
  return "";
};

function ResetPassword() {
  const navigate = useNavigate();
  const [token] = useState(readToken);
  const [status, setStatus] = useState(token ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    axios
      .post(`${API_URL}/user/reset-password/check`, { token })
      .then((res) => active && setStatus(res.data.valid ? "ready" : "invalid"))
      // If the check itself fails, let them try; the reset call checks again.
      .catch(() => active && setStatus("ready"));
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    if (password !== confirmPassword) {
      setError("Your passwords don't match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/user/reset-password`, {
        token,
        password,
        confirmPassword,
      });
      forgetToken();
      // Any old sign-in on this device is no longer valid.
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      navigate("/login", {
        replace: true,
        state: { notice: "Your password has been reset. Log in with your new password." },
      });
    } catch (err) {
      if (err.response?.data?.code === "RESET_LINK_INVALID") {
        forgetToken();
        setStatus("invalid");
        return;
      }
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordInput = (id, label, value, setValue, shown, toggle, placeholder) => (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-wrapper">
        <input
          id={id}
          type={shown ? "text" : "password"}
          autoComplete="new-password"
          placeholder={placeholder}
          value={value}
          aria-invalid={Boolean(error)}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={toggle}
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );

  return (
    <main className="registration-page login-page">
      <div className="registration-container">
        {status === "checking" && (
          <div className="registration-header">
            <h1>Checking your link…</h1>
            <p>This only takes a moment.</p>
          </div>
        )}

        {status === "invalid" && (
          <>
            <div className="registration-header">
              <span className="auth-icon" aria-hidden="true">
                <LinkIcon size={24} />
              </span>
              <h1>This link has expired</h1>
              <p>
                Reset links work once and last 30 minutes. Ask for a new one
                and use the newest email we send.
              </p>
            </div>
            <Link to="/forgot-password" className="registration-next auth-full auth-link-button">
              Send a new link
            </Link>
          </>
        )}

        {status === "ready" && (
          <>
            <div className="registration-header">
              <h1>Choose a new password</h1>
              <p>You'll be signed out on every device and can log in with the new one.</p>
            </div>
            <form className="registration-form" onSubmit={handleSubmit} noValidate>
              {passwordInput(
                "new-password",
                "New password",
                password,
                setPassword,
                showPassword,
                () => setShowPassword((v) => !v),
                "Enter a new password",
              )}
              {passwordInput(
                "confirm-password",
                "Confirm password",
                confirmPassword,
                setConfirmPassword,
                showConfirm,
                () => setShowConfirm((v) => !v),
                "Re-enter your new password",
              )}
              <p className="auth-help auth-help-tight">
                At least 8 characters, with a letter and a number.
              </p>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="registration-next" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Reset password"}
              </button>
            </form>
          </>
        )}

        <p className="login-switch">
          <Link to="/login" className="auth-back-link">
            <ArrowLeft size={15} /> Back to log in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default ResetPassword;
