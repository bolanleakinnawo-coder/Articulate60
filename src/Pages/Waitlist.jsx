import brandLogo from "../assets/brandlogo.PNG";
import learnOneImage from "../assets/learn1.jpeg";
import practiceImage from "../assets/pratice.jpeg";
import profileImage from "../assets/profile.jpeg";
import waitlistHeroImage from "../assets/wishlist1.jpeg";
import "./Waitlist.css";

const HERO_IMG = waitlistHeroImage;
const WHATSAPP_WAITLIST_URL =
  "https://chat.whatsapp.com/Cd4oGvxLNGGI2K6JSkkzSS?mode=gi_t";

const PAIN_POINTS = [
  "You knew what you meant. But your explanation came out messy.",
  "You had an opinion, but struggled to put it into words.",
  "You wanted to contribute, but someone else spoke first.",
  "You answered a simple question and somehow ended up talking around the point.",
];

const STEPS = [
  {
    title: "Learn",
    text: "Understand the skills and techniques behind effective communication.",
  },
  {
    title: "Practise",
    text: "Get out of your head and put your communication skills to work.",
  },
  {
    title: "Improve",
    text: "Keep practising, notice your progress and continue building the skill.",
  },
];

const OUTCOMES = [
  "Get to your point instead of rambling or losing your message along the way.",
  "Organise your thoughts so your explanations are easier to follow.",
  "Speak more confidently, even when you haven't rehearsed every word.",
  "Express opinions and ideas without struggling to get them out.",
  "Use your voice more intentionally to make your message clearer.",
  "Navigate conversations with greater ease instead of constantly wondering what to say next.",
];

const TESTIMONIALS = [
  { quote: "[STUDENT TESTIMONIAL 1]", name: "Student name" },
  { quote: "[STUDENT TESTIMONIAL 2]", name: "Student name" },
  { quote: "[STUDENT TESTIMONIAL 3]", name: "Student name" },
];

const TIMELINE = [
  { date: "October 30", text: "Registration opens to the waitlist." },
  { date: "First 24 hours", text: "Register at the ₦10,000 founding price." },
  {
    date: "November 1 to 2",
    text: "Programme registrants receive early Loquiex access.",
  },
  { date: "November 3", text: "Loquiex officially launches to the public." },
  { date: "November 15", text: "The 7-Day Speaking Reset begins." },
];

function ImageSlot({ src, alt, label, className = "" }) {
  if (src) return <img className={`lq-img ${className}`} src={src} alt={alt} />;
  return (
    <div className={`lq-slot ${className}`} role="img" aria-label={label}>
      <span>{label}</span>
    </div>
  );
}

export default function Waitlist() {
  return (
    <div className="lq-page">
      <div className="lq-container">
        {/* HEADER */}
        <header className="lq-header">
          <img className="lq-brand" src={brandLogo} alt="Loquiex" />
          <span className="lq-pill">Coming soon</span>
        </header>

        <main className="lq-main">
          {/* HERO */}
          <section className="lq-hero lq-split lq-center">
            <div className="lq-hero-copy">
              <h1 className="lq-hero-title">
                You have something to say. Let's help you say it.
              </h1>
              <p className="lq-hero-text">
                Become the communicator who can express ideas clearly, speak
                with confidence and navigate conversations without constantly
                second-guessing yourself.
              </p>
              <p className="lq-tagline">
                Learn communication. Practise it. Use it.
              </p>
              <a
                className="lq-cta lq-whatsapp-cta"
                href={WHATSAPP_WAITLIST_URL}
                target="_blank"
                rel="noreferrer"
              >
                Join the Loquiex waitlist
              </a>
              <p className="lq-fine">
                Registration for our first programme opens October 30.
              </p>
            </div>
            <ImageSlot
              src={HERO_IMG}
              alt="Loquiex website preview"
              label="Loquiex website preview. Add your platform screenshot."
              className="lq-hero-media"
            />
          </section>

          {/* PAIN */}
          <section className="lq-section lq-split">
            <div className="lq-stack">
              <h2 className="lq-h2">
                You know that feeling when you walk away from a conversation
                wishing you'd said things differently?
              </h2>
            </div>
            <div className="lq-stack">
              <ul className="lq-pain">
                {PAIN_POINTS.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="lq-copy">
                Maybe you even replay conversations afterwards, thinking of all
                the better ways you could have expressed yourself.
              </p>
              <p className="lq-lead">
                What if you could actually work on that?
              </p>
            </div>
          </section>

          {/* INTRO */}
          <section className="lq-section">
            <div className="lq-split">
              <div className="lq-stack">
                <h2 className="lq-h2">Introducing Loquiex</h2>
                <p className="lq-lead">
                  A place to develop your communication, not just read about it.
                </p>
              </div>
              <div className="lq-stack">
                <p className="lq-copy">
                  Loquiex helps you build better communication skills, practise
                  them consistently, and use them with confidence in everyday
                  life.
                </p>
                <p className="lq-copy">
                  Not just learning what a good communicator does. Not just
                  saving tips you may never use. But actually working on how you
                  think, express yourself and speak, until better communication
                  becomes something you can practise and improve.
                </p>
              </div>
            </div>

            <ol className="lq-steps">
              {STEPS.map((s, i) => (
                <li key={s.title} className="lq-step">
                  <span className="lq-step-num">{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>

            <div
              className="lq-product-gallery"
              role="group"
              aria-label="Explore Loquiex Practice and Profile"
            >
              <figure className="lq-product-shot lq-product-shot-practice">
                <img
                  className="lq-img"
                  src={practiceImage}
                  alt="Loquiex Practice page with speaking prompts and practice modes"
                />
                <figcaption>Practise your communication skills</figcaption>
              </figure>
              <figure className="lq-product-shot lq-product-shot-profile">
                <img
                  className="lq-img"
                  src={profileImage}
                  alt="A member profile in Loquiex"
                />
                <figcaption>Track your progress in your profile</figcaption>
              </figure>
            </div>
          </section>

          {/* RESET */}
          <section className="lq-section lq-panel">
            <div className="lq-split">
              <div className="lq-stack">
                <p className="lq-kicker">First experience inside Loquiex</p>
                <h2 className="lq-h2">Start with the 7-Day Speaking Reset.</h2>
                <p className="lq-copy">
                  A 7-day intensive programme. If you've been wanting to
                  communicate better but aren't sure where to start, this is
                  your starting point.
                </p>
                <p className="lq-copy">
                  The 7-Day Speaking Reset is a guided experience designed to
                  help you get your thoughts across more clearly, express your
                  ideas with greater confidence and become more intentional
                  about how you communicate.
                </p>
                <p className="lq-copy">
                  This is the first major learning experience inside Loquiex.
                  It's how we're beginning, not all that Loquiex will be.
                </p>
              </div>
              <div className="lq-stack">
                <p className="lq-lead">
                  By the end, you'll have worked on your ability to:
                </p>
                <ul className="lq-checks">
                  {OUTCOMES.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>
            <ImageSlot
              src={learnOneImage}
              alt="Loquiex Learn page featuring the 7-Day Communication Reset"
              label="Loquiex Learn page"
              className="lq-wide lq-learn-reset-shot"
            />
          </section>

          {/* TESTIMONIALS */}
          <section className="lq-section">
            <div className="lq-stack">
              <h2 className="lq-h2">The kind of progress you can expect</h2>
              <p className="lq-copy">
                Before Loquiex and the 7-Day Speaking Reset, students were
                already putting these communication principles into practice
                inside the Speak Better Program. Here's what some of them had to
                say about their experience:
              </p>
            </div>
            <div className="lq-quotes">
              {TESTIMONIALS.map((t, i) => (
                <figure key={i} className="lq-quote">
                  <blockquote>{t.quote}</blockquote>
                  <figcaption>{t.name}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* PRICING + TIMELINE */}
          <section className="lq-section lq-split">
            <div className="lq-stack">
              <h2 className="lq-h2">Be among the first inside.</h2>
              <p className="lq-copy">
                Registration for the 7-Day Speaking Reset opens October 30.
              </p>
              <div className="lq-pricing">
                <div className="lq-price lq-price-main">
                  <span className="lq-price-label">First 24 hours only</span>
                  <strong>₦10,000</strong>
                  <span>Founding price</span>
                </div>
                <div className="lq-price">
                  <span className="lq-price-label">
                    After the first 24 hours
                  </span>
                  <strong>₦15,000</strong>
                  <span>Regular price</span>
                </div>
              </div>
              <p className="lq-copy">
                Register for the Speaking Reset before the public launch and
                you'll receive immediate access to Loquiex. That means you can
                explore the platform, start practising and get familiar with
                your new communication space before the programme begins.
              </p>
            </div>
            <div className="lq-stack">
              <h3 className="lq-h3">Launch timeline</h3>
              <ol className="lq-timeline">
                {TIMELINE.map((t) => (
                  <li key={t.date}>
                    <strong>{t.date}</strong>
                    <span>{t.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* JOIN */}
          <section className="lq-section lq-join lq-split">
            <div className="lq-stack">
              <h2 className="lq-h2">
                You don't have to stay the communicator you are today.
              </h2>
              <p className="lq-lead">
                Start building the communicator you want to become.
              </p>
              <p className="lq-disclaimer">
                Joining the waitlist does not provide immediate platform access.
                It gives you launch updates and the opportunity to save ₦5,000
                when you register for the 7-Day Speaking Reset within 24 hours
                of opening registration. Programme registrants receive early
                access before the November 3 public launch.
              </p>
            </div>

            <div className="lq-stack">
              <a
                className="lq-cta lq-whatsapp-cta"
                href={WHATSAPP_WAITLIST_URL}
                target="_blank"
                rel="noreferrer"
              >
                Join the waitlist
              </a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
