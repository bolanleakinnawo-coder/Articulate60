import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Mail,
  MessagesSquare,
} from "lucide-react";
import { FAQS, QUICK_COUNT, SUPPORT_EMAIL } from "../data/support";
import "./Profile.css";

// Help & support: quick answers (expandable), all questions, and email.
export default function HelpSupport() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromProfile = location.state?.from === "profile";
  const [open, setOpen] = useState(() => new Set([FAQS[0].id]));
  const [showAll, setShowAll] = useState(false);

  const shown = showAll ? FAQS : FAQS.slice(0, QUICK_COUNT);
  const toggle = (id) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="profile-content pf-help-page">
      <button
        className="pf-back pf-back-link"
        onClick={() => (fromProfile ? navigate("/app/profile") : navigate(-1))}
      >
        <ArrowLeft size={18} /> {fromProfile ? "Your Profile" : "Back"}
      </button>

      <header className="pf-page-header">
        <h1>Help &amp; support</h1>
        <p>Find answers or contact Loquiex.</p>
      </header>

      <div className="pf-help-section">
        <span className="pf-row-icon">
          <MessagesSquare size={18} />
        </span>
        <div>
          <h2 className="pf-stats-title">Quick answers</h2>
          <p className="pf-panel-text">A few things you might want to know.</p>
        </div>
      </div>

      <div className="pf-list pf-faq">
        {shown.map((faq) => {
          const isOpen = open.has(faq.id);
          return (
            <div className="pf-faq-item" key={faq.id}>
              <button
                className="pf-faq-q"
                aria-expanded={isOpen}
                aria-controls={`faq-${faq.id}`}
                onClick={() => toggle(faq.id)}
              >
                <span>{faq.question}</span>
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {isOpen && (
                <p className="pf-faq-a" id={`faq-${faq.id}`}>
                  {faq.answer}
                </p>
              )}
            </div>
          );
        })}
        {FAQS.length > QUICK_COUNT && (
          <button className="pf-faq-more" onClick={() => setShowAll((v) => !v)}>
            {showAll ? (
              <>
                Show fewer questions <ChevronUp size={16} />
              </>
            ) : (
              <>
                View all questions <ArrowRight size={16} />
              </>
            )}
          </button>
        )}
      </div>

      <hr className="pf-divider" />

      <div className="pf-help-section">
        <span className="pf-row-icon">
          <Mail size={18} />
        </span>
        <div>
          <h2 className="pf-stats-title">Contact us</h2>
          <p className="pf-panel-text">Still have a question? Send us an email.</p>
        </div>
      </div>

      <section className="pf-panel">
        <p className="pf-panel-title">Email support</p>
        <p className="pf-panel-text">
          Have something you need to ask or clarify? You can reach us by email
          at <strong className="pf-email">{SUPPORT_EMAIL}</strong>.
        </p>
        <a
          className="profile-save-button pf-wide-button pf-email-button"
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Loquiex support")}`}
        >
          Email support <ArrowUpRight size={18} />
        </a>
        <p className="pf-stats-note pf-email-note">
          Please make sure your email address is correct before sending your
          message.
        </p>
      </section>
    </div>
  );
}
