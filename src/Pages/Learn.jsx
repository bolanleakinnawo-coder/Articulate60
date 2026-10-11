import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  X,
  Layers,
  Mic,
  Presentation,
  Radio,
} from "lucide-react";
import api from "../api/axios";
import heroImage from "../assets/learn-hero.jpeg";
import auditImage from "../assets/audit.jpeg";
import speakWithEaseImage from "../assets/speakwithease.jpeg";
import whatDoISayImage from "../assets/whatdoisay.PNG";
import whatDoIDoImage from "../assets/whatdoido.jpeg";

/* ---------- Content (swap for API data later) ---------- */

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "instructor", label: "Instructor-led" },
  { id: "self", label: "Self-paced" },
];

// Subtitle shown under the chips (none for "All")
const CATEGORY_SUBTITLES = {
  all: null,
  instructor: "Someone to guide you.",
  self: "Learn at your own pace.",
};

const LIVE_SESSION = {
  label: "Live",
  title: "The 7-Day Communication Reset",
  description:
    "Go from struggling to express your thoughts to communicating them clearly, confidently, and intentionally.",
  cta: "Save My Spot",
  image: heroImage,
  imageAlt: "Two people having a conversation",
};

const UPCOMING = [
  {
    id: "communication-audit",
    category: "instructor",
    icon: Presentation,
    title: "Communication Audit With Azimah",
    description: "Understand what’s holding your communication back.",
    image: auditImage,
  },
  {
    id: "speak-with-ease",
    category: "self",
    icon: Layers,
    title: "Speak With Ease Bundle",
    description: "Make difficult communication moments easier to navigate.",
    image: speakWithEaseImage,
  },
  {
    id: "what-do-i-say",
    category: "self",
    icon: BookOpen,
    title: "What Do I Say?",
    description:
      "Find the right words when you’re not sure how to express yourself.",
    image: whatDoISayImage,
  },
  {
    id: "what-do-i-do",
    category: "self",
    icon: Mic,
    title: "What Do I Do?",
    description: "Know what to do in difficult communication situations.",
    image: whatDoIDoImage,
  },
];

/* ---------- Component ---------- */

export default function Learn({ onNavigate = () => {} }) {
  const [category, setCategory] = useState("all");
  const [notified, setNotified] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedProduct) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        setSelectedProduct(null);
        setSubmissionError("");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedProduct, isSubmitting]);

  const showHero = category === "all" || category === "instructor";
  const subtitle = CATEGORY_SUBTITLES[category];

  const visibleItems = UPCOMING.filter(
    (item) => category === "all" || item.category === category,
  );

  const openNotifyForm = (product) => {
    setSelectedProduct(product);
    setSubmissionError("");
  };

  const closeNotifyForm = () => {
    if (isSubmitting) return;
    setSelectedProduct(null);
    setSubmissionError("");
  };

  const handleNotifySubmit = async (event) => {
    event.preventDefault();
    if (!selectedProduct || isSubmitting) return;

    setSubmissionError("");
    setIsSubmitting(true);
    try {
      await api.post("/api/learn-notifications", {
        name,
        email,
        productId: selectedProduct.id,
      });
      setNotified((previous) => [...previous, selectedProduct.id]);
      setSelectedProduct(null);
      setName("");
      setEmail("");
    } catch (error) {
      setSubmissionError(
        error.response?.data?.message ||
          "We couldn't save your request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Category subtitle */}
      {subtitle && <p className="learn-category-subtitle">{subtitle}</p>}

      {/* Hero banner */}
      {showHero && (
        <section className="learn-hero" aria-labelledby="learn-hero-title">
          <div className="learn-hero-main">
            <span className="learn-badge">
              <Radio size={14} aria-hidden="true" />
              {LIVE_SESSION.label}
            </span>
            <h2 id="learn-hero-title" className="learn-hero-title">
              {LIVE_SESSION.title}
            </h2>
            <p className="learn-hero-text">{LIVE_SESSION.description}</p>
            <button
              className="learn-cta"
              onClick={() => onNavigate("save-spot")}
            >
              {LIVE_SESSION.cta} <ArrowRight size={18} />
            </button>
          </div>

          <div className="learn-hero-media">
            {LIVE_SESSION.image ? (
              <img
                src={LIVE_SESSION.image}
                alt={LIVE_SESSION.imageAlt}
                className="learn-hero-img"
              />
            ) : (
              <div className="learn-image-slot" aria-hidden="true" />
            )}
          </div>
        </section>
      )}

      {/* Next on Learn */}
      {visibleItems.length > 0 && (
        <section className="learn-section">
          <div className="learn-section-head">
            <h2>Next on Learn</h2>
            <p>More learning experiences are on the way.</p>
          </div>

          <div className="learn-grid">
            {visibleItems.map(
              (product, index) => {
                const { id, icon: Icon, title, description, image } = product;
                const isNotified = notified.includes(id);
                return (
                  <article key={id} className="learn-card">
                    <div
                      className={`learn-card-media ${
                        index % 2 === 0 ? "tone-a" : "tone-b"
                      }`}
                    >
                      {image ? (
                        <img src={image} alt="" className="learn-card-img" />
                      ) : (
                        <Icon size={26} aria-hidden="true" />
                      )}
                    </div>

                    <span className="learn-card-tag">Coming soon</span>
                    <h3 className="learn-card-title">{title}</h3>
                    <p className="learn-card-text">{description}</p>

                    <button
                      className={`learn-notify ${isNotified ? "done" : ""}`}
                      onClick={() => openNotifyForm(product)}
                      disabled={isNotified}
                    >
                      {isNotified ? (
                        <>
                          <Check size={14} strokeWidth={3} /> We'll notify you
                        </>
                      ) : (
                        "Notify me"
                      )}
                    </button>
                  </article>
                );
              },
            )}
          </div>
        </section>
      )}

      {selectedProduct && (
        <div
          className="learn-notify-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeNotifyForm();
          }}
        >
          <section
            className="learn-notify-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="learn-notify-title"
          >
            <button
              className="learn-notify-close"
              type="button"
              aria-label="Close notification form"
              onClick={closeNotifyForm}
              disabled={isSubmitting}
            >
              <X size={20} />
            </button>
            <p className="learn-notify-eyebrow">Coming soon</p>
            <h2 id="learn-notify-title">Get notified when it&apos;s ready</h2>
            <p className="learn-notify-product">{selectedProduct.title}</p>
            <p className="learn-notify-description">
              Leave your details and we&apos;ll let you know when this learning
              experience is available.
            </p>
            <form className="learn-notify-form" onSubmit={handleNotifySubmit}>
              <label htmlFor="learn-notify-name">Name</label>
              <input
                id="learn-notify-name"
                name="name"
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={80}
                required
                disabled={isSubmitting}
              />
              <label htmlFor="learn-notify-email">Email</label>
              <input
                id="learn-notify-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                required
                disabled={isSubmitting}
              />
              {submissionError && (
                <p className="learn-notify-error" role="alert">
                  {submissionError}
                </p>
              )}
              <button
                className="learn-notify-submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
