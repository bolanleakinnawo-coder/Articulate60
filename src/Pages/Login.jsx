import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Please fill in both fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_URL}/user/login`, {
        identifier,
        password,
      });

      sessionStorage.setItem("token", response.data.token);
      sessionStorage.setItem("user", JSON.stringify(response.data.user));

      navigate("/dashboard", { state: { user: response.data.user } });
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="registration-page">
      <div className="registration-container">
        <div className="registration-header">
          <h1>Welcome back</h1>
          <p>Log in to continue practising.</p>
        </div>

        <form className="registration-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="identifier">Email or username</label>
            <input
              id="identifier"
              type="text"
              placeholder="Enter your email or username"
              value={identifier}
              aria-invalid={Boolean(error)}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              aria-invalid={Boolean(error)}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            type="submit"
            className="registration-next"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="login-switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </main>
  );
}

export default Login;
