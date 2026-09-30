import { useState } from "react";
import {
  ArrowRight,
  Check,
  MessageCircle,
  Settings,
  Users,
} from "lucide-react";

import { Lock } from "lucide-react";
import "./Learn.css";

/* ---------- Content (swap for API data later) ---------- */

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "instructor", label: "Instructor-led" },
  { id: "self", label: "Self-paced" },
];

const LIVE_SESSION = {
  label: "Live",
  title: "The Communication Upgrade",
  subtitle: "A 7-Day Intensive Programme",
  description:
    "Go from struggling to get your thoughts across to communicating them clearly, confidently and intentionally.",

  cta: "Save My Spot",
};

const BUNDLE = {
  badge: "Complete bundle",
  title: "Speak With Ease",
  subtitle: "Your Communication Backup",
  description:
    "The complete bundle for navigating real-life communication situations.",
  cta: "Coming soon",
  includes: [
    "What Do I Say?",
    "What Do I Do?",
    "Communication Personality Map",
    "Conversation Recovery Kit",
  ],
};

const AUDIT = {
  badge: "Coming soon",
  title: "Communication Audit with Azimah",
  subtitle: "Know what's holding you back.",
  description:
    "Understand your communication strengths, identify your gaps, and get a personalised 90-day plan to improve how you communicate.",
  cta: "Coming soon",
};

const GUIDES = [
  {
    id: "say",
    icon: MessageCircle,
    title: "What Do I Say?",
    meta: "100 Real-Life Communication Situations",
    description:
      "For the moments when you know you need to say something, but you're not sure what to say.",
  },
  {
    id: "do",
    icon: Settings,
    title: "What Do I Do?",
    meta: "120 Real-Life Communication Situations",
    description:
      "For the moments when you know something needs to change, but you're not sure how to handle it.",
  },
];

const LIVE_LEARNING = [
  {
    id: "masterclasses",
    icon: Users,
    title: "Masterclasses",
    description:
      "Short, focused live sessions on specific communication skills.",
  },
];

/* ---------- Component ---------- */

export default function Learn({ onNavigate = () => {} }) {
  const [category, setCategory] = useState("all");

  const showInstructor = category === "all" || category === "instructor";
  const showSelf = category === "all" || category === "self";

  return (
    <div className="learn-content">
      {/* Header */}
      <header className="learn-header">
        <h1 className="learn-title">Learn</h1>
        <p className="learn-subtitle">
          Build the skills to communicate better.
        </p>
      </header>

      {/* Category filter */}
      <div
        className="learn-categories"
        role="tablist"
        aria-label="Learning type"
      >
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={category === c.id}
            className={`learn-chip ${category === c.id ? "active" : ""}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Featured live session */}
      {showInstructor && (
        <section className="learn-hero">
          <div className="learn-hero-main">
            <span className="learn-badge">
              <span className="learn-badge-dot" />
              {LIVE_SESSION.label}
            </span>
            <h2 className="learn-hero-title">{LIVE_SESSION.title}</h2>
            <h3 className="learn-hero-subtitle">{LIVE_SESSION.subtitle}</h3>
            <p className="learn-hero-text">{LIVE_SESSION.description}</p>
            <button
              className="learn-cta"
              onClick={() => onNavigate("save-spot")}
            >
              {LIVE_SESSION.cta} <ArrowRight size={16} />
            </button>
          </div>
          <div className="learn-hero-date">
            <span>{LIVE_SESSION.date}</span>
            <span>{LIVE_SESSION.time}</span>
          </div>
        </section>
      )}

      {/* Instructor-led */}
      {showInstructor && (
        <section className="learn-section">
          <div className="learn-section-head">
            <h2>Instructor-led</h2>
            <p>Someone to guide you.</p>
          </div>

          <div className="learn-bundle">
            <div className="learn-bundle-main">
              <span className="learn-badge">{AUDIT.badge}</span>
              <h3 className="learn-bundle-title">{AUDIT.title}</h3>
              <h4 className="learn-bundle-subtitle">{AUDIT.subtitle}</h4>
              <p className="learn-bundle-text">{AUDIT.description}</p>
              <button className="learn-cta" disabled>
                {AUDIT.cta}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Self-paced */}
      {showSelf && (
        <section className="learn-section">
          <div className="learn-section-head">
            <h2>Self-paced</h2>
            <p>Learn at your own pace.</p>
          </div>

          <div className="learn-bundle">
            <div className="learn-bundle-main">
              <span className="learn-badge">{BUNDLE.badge}</span>
              <h3 className="learn-bundle-title">{BUNDLE.title}</h3>
              <h4 className="learn-bundle-subtitle">{BUNDLE.subtitle}</h4>
              <p className="learn-bundle-text">{BUNDLE.description}</p>
              <button
                className="learn-cta"
                onClick={() => onNavigate("bundle")}
              >
                {BUNDLE.cta}
              </button>
            </div>
            <div className="learn-bundle-includes">
              <span className="learn-includes-label">Includes</span>
              <ul>
                {BUNDLE.includes.map((item) => (
                  <li key={item}>
                    <span className="learn-check">
                      <Check size={11} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="learn-guides">
            {GUIDES.map(({ id, icon: Icon, title, meta, description }) => (
              <button
                key={id}
                className="learn-guide"
                onClick={() => onNavigate(id)}
              >
                <div className="learn-guide-top">
                  <span className="learn-icon-circle">
                    <Icon size={18} />
                  </span>
                  <ArrowRight size={16} className="learn-guide-arrow" />
                </div>
                <h3>{title}</h3>
                <span className="learn-guide-meta">{meta}</span>
                <p>{description}</p>
                <span className="learn-guide-link locked">
                  <Lock size={14} />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
