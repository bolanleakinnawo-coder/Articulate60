import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Mail,
  MessagesSquare,
  Search,
} from "lucide-react";
import { FAQS, SUPPORT_EMAIL } from "../data/support";
import "../styles/HelpSupport.css";

export default function HelpSupport() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return FAQS.filter((f) =>
        `${f.question} ${f.answer}`.toLowerCase().includes(q),
      );
    }
    return showAll ? FAQS : FAQS.filter((f) => f.popular);
  }, [query, showAll]);

  const heading = query.trim()
    ? "Search results"
    : showAll
      ? "All FAQs"
      : "Popular questions";

  return (
    <div className="page hs-page">
      <header className="hs-header">
        <button
          className="hs-back"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1>Help & Support</h1>
      </header>

      <section className="hs-hero">
        <span className="hs-hero-icon" aria-hidden="true">
          <MessagesSquare size={22} />
        </span>
        <h2>How can we help?</h2>
        <p>
          Find answers, solve a problem, or get help with your Loquiex account.
        </p>
        <label className="hs-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search for answers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </section>

      <h2 className="hs-section-title">{heading}</h2>
      <div className="hs-list">
        {results.length === 0 && (
          <p className="hs-empty">
            No answers match that yet. Contact support below and we'll help.
          </p>
        )}
        {results.map((faq) => {
          const open = openId === faq.id;
          return (
            <div className={`hs-faq ${open ? "hs-faq-open" : ""}`} key={faq.id}>
              <button
                className="hs-faq-q"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : faq.id)}
              >
                <span>{faq.question}</span>
                <ChevronDown size={18} className="hs-chev" />
              </button>
              {open && <p className="hs-faq-a">{faq.answer}</p>}
            </div>
          );
        })}
        {!query.trim() && (
          <button className="hs-view-all" onClick={() => setShowAll((v) => !v)}>
            <span>{showAll ? "Show popular questions" : "View all FAQs"}</span>
            <ArrowRight size={18} />
          </button>
        )}
      </div>

      <h2 className="hs-section-title">Still need help?</h2>
      <a
        className="hs-contact"
        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Loquiex support")}`}
      >
        <span className="hs-contact-icon" aria-hidden="true">
          <Mail size={20} />
        </span>
        <span className="hs-contact-text">
          <strong>Contact support</strong>
          <span>Tell us what you need help with.</span>
        </span>
        <ArrowRight size={18} className="hs-contact-chev" />
      </a>
    </div>
  );
}
