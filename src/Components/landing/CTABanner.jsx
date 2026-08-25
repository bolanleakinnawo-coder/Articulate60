import { Target, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import "../../styles/CTABanner.css";

const CTABanner = () => {
  return (
    <section className="ctab">
      <div className="ctab-container">
        <div className="ctab-card">
          <div className="ctab-icon">
            <Target size={26} strokeWidth={1.8} />
          </div>

          <h2 className="ctab-title">
            Your communication skills won't improve by accident.{" "}
            <span className="ctab-accent">Start with one practice.</span>
          </h2>

          <Link to="/register" className="ctab-btn">
            START YOUR FIRST PRACTICE <span className="arrow">→</span>
          </Link>

          <p className="ctab-note">
            <ShieldCheck size={14} strokeWidth={1.8} />
            Free to start. Practise anytime.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
