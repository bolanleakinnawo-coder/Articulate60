import { useState } from "react";
import { Mail } from "lucide-react";
import "../../styles/Newsletter.css";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    // TODO: wire up to your email service (Mailchimp, ConvertKit, etc.)
    setSubmitted(true);
    setEmail("");
  };

  return (
    <section className="news">
      <div className="news-container">
        <div className="news-card">
          <div className="news-icon">
            <Mail size={26} strokeWidth={1.8} />
          </div>

          <div className="news-content">
            <h2 className="news-title">
              Tips, topics, and updates
              <br className="news-break" />
              delivered to you.
            </h2>

            <p className="news-desc">
              Get weekly insights to help you communicate with more clarity and
              confidence.
            </p>

            <form className="news-form" onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Enter your email"
                className="news-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="news-btn">
                {submitted ? "SUBSCRIBED ✓" : "SUBSCRIBE"}
              </button>
            </form>

            <p className="news-note">No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
