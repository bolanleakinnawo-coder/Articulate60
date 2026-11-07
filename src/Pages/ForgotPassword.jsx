import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, MailCheck } from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const RESEND_SECONDS = 60;

// Step 1 of "Forgot password": ask for the email (or username) and send a
// reset link. The server answers the same way whether or not the account
// exists, so this page never says whether an email is registered.
function ForgotPassword() {
  const location = useLocation();
  const [identifier, setIdentifier] = useState(
    location.state?.identifier || "",
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const send = async (event) => {
    event?.preventDefault();
    setError("");
    const value = identifier.trim();
    if (!value) {
      setError("Please enter your email address or username.");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/user/forgot-password`, { identifier: value });
      setSentTo(value);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "We couldn't send the link just now. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="registration-page login-page">
      <div className="registration-container">
        {sentTo ? (
          <>
            <div className="registration-header">
              <span className="auth-icon" aria-hidden="true">
                <MailCheck size={26} />
              </span>
              <h1>Check your email</h1>
              <p>
                If an account matches <strong className="auth-strong">{sentTo}</strong>,
                we've sent a link to reset your password. It expires in 30
                minutes.
              </p>
            </div>
            <p className="auth-help">
              Can't see it? Check your spam or promotions folder, or make sure
              you used the email on your Loquiex account.
            </p>
            {error && <p className="form-error">{error}</p>}
            <button
              type="button"
              className="registration-next auth-full"
              onClick={send}
              disabled={isSubmitting || cooldown > 0}
            >
              {isSubmitting
                ? "Sending..."
                : cooldown > 0
                  ? `Resend link in ${cooldown}s`
                  : "Resend link"}
            </button>
            <button
              type="button"
              className="auth-text-button"
              onClick={() => {
                setSentTo("");
                setError("");
              }}
            >
              Use a different email
            </button>
          </>
        ) : (
          <>
            <div className="registration-header">
              <h1>Forgot your password?</h1>
              <p>
                Enter the email or username on your account and we'll email you
                a link to choose a new one.
              </p>
            </div>
            <form className="registration-form" onSubmit={send} noValidate>
              <div className="form-field">
                <label htmlFor="identifier">Email or username</label>
                <input
                  id="identifier"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="Enter your email or username"
                  value={identifier}
                  aria-invalid={Boolean(error)}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button
                type="submit"
                className="registration-next"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send reset link"}
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

export default ForgotPassword;
