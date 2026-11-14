// Public landing page. Route "/" for visitors (signed-in members go straight
// to the app, see Routes/AppRoutes.jsx). "/landingpage" always shows it.
//
// The wording on this page is Sheriff's, copied word for word from the
// landing page mockup. Please don't reword it. Only the layout and colours
// (Home tab palette) differ from the mockup. The referral programme section
// is left out on purpose until referrals are live (Sheriff, 2026-11-14).
// Pictures are placeholders, swapped in one place: src/data/landingImages.js.
// Footer links that don't have a page yet are set in FOOTER_SUPPORT below.

import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Clock3,
  Flame,
  Mic,
  Share2,
  Users,
} from "lucide-react";

import brandLogo from "../assets/landing/loquiex-logo.png";
import { LANDING_IMAGES } from "../data/landingImages";
import "../styles/PublicLanding.css";

const NAV_LINKS = [
  { label: "The platform", href: "#platform" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Plans", href: "#plans" },
  { label: "FAQs", href: "#faqs" },
];

// Contact, Privacy policy and Terms and conditions: change the addresses
// here when those pages exist.
const FOOTER_SUPPORT = [
  { label: "FAQs", href: "#faqs" },
  { label: "Contact", href: "/app/help" },
  { label: "Privacy policy", href: "#privacy-policy" },
  { label: "Terms and conditions", href: "#terms-and-conditions" },
];

const JOURNEY = [
  {
    title: "First, you find your starting point.",
    body: "Create your account and enter your Loquiex practice space. You can explore speaking prompts, choose the kind of communication situation you want to work on and start with a practice level that suits you.",
    image: "solo",
  },
  {
    eyebrow: "Then, you start speaking.",
    title: "Practise putting your thoughts into words.",
    body: "Choose a prompt, take your preparation time and record yourself speaking. You get to practise expressing your ideas without depending on a script. You can work on everyday conversations, difficult situations, work-related communication, interviews, storytelling and more.",
    dark: true,
  },
  {
    title: "You begin to understand how you communicate.",
    body: "With AI speaking feedback available through paid memberships, you can review your recording and transcript, see what you did well, understand the areas that need attention and learn how to improve your next attempt.",
  },
  {
    eyebrow: "Beyond practising alone",
    title: "You get to practise with other people, too.",
    body: "Join or host audio-only group practice sessions. Discuss ideas, respond to questions, listen to other perspectives and get more comfortable expressing yourself around people.",
    dark: true,
  },
  {
    title: "And you can see yourself making progress.",
    body: "Track your practice activity, work towards milestones, celebrate your wins and share your journey. The more consistently you practise, the more opportunities you give yourself to develop.",
  },
  {
    title: "The goal is bigger than completing a practice session.",
    body: "It's to become someone who can organise their thoughts, communicate their ideas and express themselves with greater confidence in real-life situations.",
    dark: true,
  },
];

const FOR_YOU = [
  "You have ideas but sometimes struggle to put them into words.",
  "You want to contribute more confidently at work.",
  "You want to become a better public speaker.",
  "You want to express yourself more clearly in everyday conversations.",
  "You want to make communication practice part of your routine.",
];

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₦0",
    per: "forever",
    intro: "A place to begin and build your practice habit.",
    points: [
      "Free speaking practice",
      "Practise expressing your thoughts",
      "Track practice activity",
      "Share practice wins",
    ],
    cta: "Get started for free",
  },
  {
    id: "bloom",
    pill: "Popular choice",
    name: "Bloom",
    price: "₦4,900",
    per: "/ month",
    intro: "Everything in Free, plus:",
    points: [
      "150 AI feedback sessions per month",
      "Up to 5 AI feedback sessions per day",
      "1,350 group practice minutes per month",
      "Up to 45 group practice minutes per day",
      "Share speaking progress and AI feedback highlights",
    ],
    cta: "Choose Bloom",
  },
  {
    id: "flourish",
    pill: "More access",
    name: "Flourish",
    price: "₦8,000",
    per: "/ month",
    intro: "Everything in Bloom, plus:",
    points: [
      "360 AI feedback sessions per month",
      "Up to 12 AI feedback sessions per day",
      "2,700 group practice minutes per month",
      "Up to 90 group practice minutes per day",
      "Learner discount benefits",
    ],
    cta: "Choose Flourish",
    featured: true,
  },
  {
    id: "infinity",
    pill: "Premium",
    name: "Infinity",
    price: "₦29,800",
    per: "/ month",
    intro: "Premium membership access.",
    points: ["Expanded practice and feedback capacity", "Learner discount benefits"],
    note: "Detailed allowances and additional benefits to be confirmed.",
    cta: "Explore Infinity",
    dark: true,
  },
];

const COMPARE = [
  ["Price/month", "₦4,900", "₦8,000", "₦29,800"],
  ["AI sessions/ month", "150", "360", "TBC"],
  ["Daily AI limit", "5", "12", "TBC"],
  ["Group minutes/ month", "1,350", "2,700", "TBC"],
  ["Daily group limit", "45", "90", "TBC"],
  ["Learner benefits", "No", "Yes", "Yes"],
];

const FAQS = [
  {
    q: "What is Loquiex?",
    a: "Loquiex is a communication practice platform that helps you organise your thoughts, express yourself clearly and build confidence through practice.",
  },
  {
    q: "What happens when I join?",
    a: "You can explore the platform, choose a speaking prompt and begin solo practice. You can also explore learning resources, track your activity and participate in other available features based on your membership.",
  },
  {
    q: "Can I use Loquiex for free?",
    a: "Yes. You can start with the Free membership and access its included features without a monthly subscription.",
  },
  {
    q: "Do I need AI to practise?",
    a: "No. You can practise speaking on your own. AI feedback is an additional feature available through paid memberships.",
  },
  {
    q: "How does AI feedback work?",
    a: "After a speaking session, AI reviews your speech and provides feedback to help you understand your communication strengths and areas to improve.",
  },
  {
    q: "What is group practice?",
    a: "Group practice lets you join or host audio-only sessions with other members to practise speaking in a group setting.",
  },
  {
    q: "What is the difference between sharing a practice session and sharing a win?",
    a: "A practice session card announces that you have completed a speaking practice. A win is an achievement shared from your profile and displayed on the Loquiex community wall.",
  },
  {
    q: "Can I track my progress?",
    a: "Yes. Your stats and milestones help you follow your practice activity and recognise your progress.",
  },
  {
    q: "What is the Loquiex dashboard?",
    a: "Your dashboard brings together your practice activity and community information, including your position on the leaderboard.",
  },
  {
    q: "Are there learner discounts?",
    a: "Learner discount benefits are included in the Flourish and Infinity plans. Eligibility and verification requirements apply.",
  },
  {
    q: "Can I change my membership plan?",
    a: "Plan changes are subject to the subscription and billing terms shown when you manage your membership.",
  },
];

// Signed in on this device? (Storage can be blocked in private mode.)
function hasToken() {
  try {
    return Boolean(localStorage.getItem("token"));
  } catch {
    return false;
  }
}

function Img({ name, className = "" }) {
  const image = LANDING_IMAGES[name];
  return (
    <div className={`lp-media ${className}`}>
      <img src={image.src} alt={image.alt} loading="lazy" />
    </div>
  );
}

function Eyebrow({ children }) {
  return <p className="lp-eyebrow">{children}</p>;
}

function MoreLink({ to, children }) {
  const inner = (
    <>
      {children} <ArrowRight size={15} aria-hidden="true" />
    </>
  );
  // "#section" links scroll this page; others open an app page.
  if (to.startsWith("#"))
    return (
      <a className="lp-more" href={to}>
        {inner}
      </a>
    );
  return (
    <Link className="lp-more" to={to}>
      {inner}
    </Link>
  );
}

export default function LandingPage() {
  const signedIn = hasToken();
  const startTo = signedIn ? "/app/home" : "/register";
  const planTo = signedIn ? "/app/membership" : "/register";

  useEffect(() => {
    const previous = document.title;
    document.title = "Loquiex · Practise speaking with confidence";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="lp">
      {/* ---------- Nav ---------- */}
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-inner">
          <a href="#top" className="lp-logo" aria-label="Loquiex home">
            <img src={brandLogo} alt="Loquiex" />
          </a>
          <nav className="lp-nav-links" aria-label="Page sections">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="lp-nav-actions">
            {signedIn ? (
              <Link className="lp-btn lp-btn-sm" to="/app/home">
                Open app
              </Link>
            ) : (
              <>
                <Link className="lp-nav-login" to="/login">
                  Log in
                </Link>
                <Link className="lp-btn lp-btn-sm" to="/register">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="top">
        {/* ---------- Hero ---------- */}
        <section className="lp-section lp-hero">
          <div className="lp-wrap lp-split">
            <div>
              <span className="lp-pill">Your voice has room to grow</span>
              <h1 className="lp-h1">
                You have so much to say. Let's help you say it well.
              </h1>
              <p className="lp-lead">
                A communication practice platform designed to help you organise
                your thoughts, express yourself clearly and build confidence
                through consistent practice.
              </p>
              <div className="lp-actions">
                <Link className="lp-btn" to={startTo}>
                  Start practising
                </Link>
                <a className="lp-btn-text" href="#platform">
                  Explore Loquiex <ArrowDown size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
            <div>
              <Img name="hero" className="lp-media-hero" />
              <p className="lp-hero-note">
                <Mic size={15} aria-hidden="true" /> Think clearly. Speak
                freely. Grow consistently.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Your ideas deserve to be heard ---------- */}
        <section className="lp-section lp-light" id="platform">
          <div className="lp-wrap lp-narrow">
            <h2 className="lp-h2">Your ideas deserve to be heard.</h2>
            <p className="lp-lead">
              You know those moments when you have something to say, but the
              words don't come out the way you want them to? When you have an
              idea but struggle to explain it, or when you want to contribute to
              a conversation but aren't quite sure how to put your thoughts
              together?
            </p>
            <p className="lp-lead">
              Loquiex gives you a place to work on that. A place to practise
              expressing yourself, learn from your attempts, have conversations
              with others and gradually become more confident using your voice.
            </p>
          </div>
        </section>

        {/* ---------- Your journey ---------- */}
        <section className="lp-section" id="how-it-works">
          <div className="lp-wrap">
            <div className="lp-head">
              <Eyebrow>Your journey with Loquiex</Eyebrow>
              <h2 className="lp-h2">So, what happens when you join Loquiex?</h2>
              <p className="lp-lead">
                You don't just sign up and get a collection of lessons to read.
                You get a place to practise, participate, learn and see your
                communication develop over time.
              </p>
            </div>
            <div className="lp-journey">
              {JOURNEY.map((step) => (
                <article
                  key={step.title}
                  className={`lp-card ${step.dark ? "lp-card-olive" : ""}`}
                >
                  {step.eyebrow && <p className="lp-card-eyebrow">{step.eyebrow}</p>}
                  <h3 className="lp-h3">{step.title}</h3>
                  <p className="lp-body">{step.body}</p>
                  {step.image && <Img name={step.image} className="lp-media-card" />}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 01 Solo practice ---------- */}
        <section className="lp-section lp-light">
          <div className="lp-wrap lp-split">
            <div>
              <Eyebrow>01 / Solo practice</Eyebrow>
              <h2 className="lp-h2">Make room for your thoughts.</h2>
              <p className="lp-lead">
                Sometimes, you know what you want to say, but putting it into
                words is the difficult part. Solo practice gives you the space
                to work through that, one speaking session at a time.
              </p>
              <Img name="solo" />
            </div>
            <div className="lp-stack">
              <div className="lp-card">
                <p className="lp-card-eyebrow">Here's what a session looks like</p>
                <h3 className="lp-h3">What makes someone a good listener?</h3>
                <p className="lp-body">
                  You choose a prompt and get a little time to prepare before
                  speaking.
                </p>
                <div className="lp-tiles lp-tiles-2">
                  <div className="lp-tile">
                    <strong>60s</strong>
                    <span>Preparation</span>
                  </div>
                  <div className="lp-tile">
                    <strong>60s</strong>
                    <span>Speaking</span>
                  </div>
                </div>
                <Link className="lp-btn lp-btn-block" to={startTo}>
                  Start a practice session
                </Link>
              </div>
              <div>
                <h3 className="lp-h4">What can you work on?</h3>
                <p className="lp-body">
                  Everyday conversations, opinions, explaining ideas, difficult
                  conversations, interviews, storytelling, public speaking and
                  business communication.
                </p>
              </div>
              <div className="lp-card">
                <h3 className="lp-h4">What changes with consistency?</h3>
                <p className="lp-body">
                  You become more comfortable speaking without a prepared
                  script, develop the ability to organise your thoughts and
                  learn to express your ideas more naturally.
                </p>
              </div>
              <MoreLink to={startTo}>Explore solo practice</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- 02 Group practice ---------- */}
        <section className="lp-section">
          <div className="lp-wrap lp-split lp-split-rev">
            <div>
              <Eyebrow>02 / Group practice</Eyebrow>
              <h2 className="lp-h2">Practise with other people.</h2>
              <p className="lp-lead">
                Being able to express yourself alone is one thing. Doing it
                around other people is another. Group practice gives you
                opportunities to take your communication beyond individual
                exercises.
              </p>
              <Img name="group" />
            </div>
            <div className="lp-stack">
              <div className="lp-card">
                <h3 className="lp-h3">Join a conversation or host one yourself.</h3>
                <p className="lp-body">
                  Find available audio-only group practice sessions, join a
                  session or create one for other members to join.
                </p>
              </div>
              <div>
                <h3 className="lp-h4">What happens in group practice?</h3>
                <ol className="lp-steps">
                  <li>Join or host an audio-only group session.</li>
                  <li>Take part in conversations and speaking activities.</li>
                  <li>Listen to other people's ideas and perspectives.</li>
                  <li>Practise contributing, responding and expressing your own thoughts.</li>
                </ol>
              </div>
              <div className="lp-card lp-card-olive">
                <h3 className="lp-h4">Real conversations. Real practice.</h3>
                <p className="lp-body">
                  The more opportunities you have to speak with others, the more
                  familiar communication in group settings can become.
                </p>
              </div>
              <MoreLink to={startTo}>Explore group practice</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- 03 AI speaking feedback ---------- */}
        <section className="lp-section lp-light">
          <div className="lp-wrap lp-split">
            <div>
              <Eyebrow>03 / AI speaking feedback</Eyebrow>
              <h2 className="lp-h2">
                Don't just practise. Understand how you're doing.
              </h2>
              <p className="lp-lead">
                Speaking repeatedly is useful, but knowing what to improve makes
                your practice more intentional. Loquiex's AI speaking feedback
                helps you understand how you communicate and what you can work
                on next.
              </p>
              <Img name="feedback" />
            </div>
            <div className="lp-stack">
              <div className="lp-card lp-review">
                <div className="lp-review-head">
                  <h3 className="lp-h4">Your speaking review</h3>
                  <span className="lp-pill lp-pill-sm">Sample review</span>
                </div>
                <div className="lp-review-score">
                  <strong>82</strong>
                  <div>
                    <span className="lp-review-label">Good progress</span>
                    <span className="lp-small">Sample overall score</span>
                  </div>
                </div>
                <div className="lp-review-rows">
                  <p className="lp-card-eyebrow">What went well</p>
                  <p className="lp-body">Clear expression of your main idea.</p>
                  <p className="lp-card-eyebrow">Your next focus</p>
                  <p className="lp-body">Reduce unnecessary filler words.</p>
                </div>
              </div>
              <div>
                <h3 className="lp-h4">What can the feedback help you notice?</h3>
                <p className="lp-body">
                  Your grammar, vocabulary, organisation, clarity, repetition,
                  filler words and delivery.
                </p>
              </div>
              <div className="lp-card">
                <h3 className="lp-h4">From recording to understanding</h3>
                <p className="lp-body">
                  Listen to your recording, follow your transcript, review
                  highlighted corrections and work through clear explanations of
                  what you could improve.
                </p>
              </div>
              <p className="lp-small">
                AI speaking feedback is available through paid memberships.
                Sample review content is illustrative.
              </p>
              <MoreLink to={startTo}>Discover AI feedback</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- 04 Learning resources ---------- */}
        <section className="lp-section">
          <div className="lp-wrap lp-split lp-split-rev">
            <div>
              <Eyebrow>04 / Learning resources</Eyebrow>
              <h2 className="lp-h2">Learn something. Put it into practice.</h2>
              <p className="lp-lead">
                Sometimes, you need more than a speaking prompt. You need to
                learn how to communicate better, understand a concept or develop
                a particular skill. That's where Loquiex's learning resources
                come in.
              </p>
              <Img name="learn" />
            </div>
            <div className="lp-stack">
              <div>
                <h3 className="lp-h3">Explore resources that help you grow.</h3>
                <p className="lp-body">
                  Access learning materials and practical resources designed to
                  help you develop your communication skills. Work through them
                  at your own pace, then apply what you've learnt in your
                  speaking practice.
                </p>
              </div>
              <div className="lp-card lp-card-olive">
                <h3 className="lp-h4">Learn it. Practise it. Use it.</h3>
                <p className="lp-body">
                  Your learning becomes more valuable when you put it into
                  practice.
                </p>
              </div>
              <MoreLink to={startTo}>Explore learning resources</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- 05 Share your wins ---------- */}
        <section className="lp-section lp-light">
          <div className="lp-wrap lp-split">
            <div>
              <Eyebrow>05 / Share your wins</Eyebrow>
              <h2 className="lp-h2">Your progress deserves to be celebrated.</h2>
              <p className="lp-lead">
                Not every achievement has to be a major milestone. Sometimes,
                completing a challenge, reaching a practice goal or making
                progress in an area you've been working on is worth celebrating.
              </p>
              <p className="lp-lead">
                You can share achievements from your profile, and those wins
                will appear on the Loquiex community wall for other members to
                see.
              </p>
            </div>
            <div className="lp-stack">
              <div className="lp-card lp-share-card">
                <p className="lp-card-eyebrow">Community wall</p>
                <h3 className="lp-h3">I completed my speaking milestone!</h3>
                <p className="lp-body">A little progress is still progress.</p>
                <p className="lp-share-foot">
                  <Users size={15} aria-hidden="true" /> Shared with the Loquiex
                  community
                </p>
              </div>
              <MoreLink to={startTo}>Explore community wins</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- 06 Share your practice session ---------- */}
        <section className="lp-section">
          <div className="lp-wrap lp-split lp-split-rev">
            <div>
              <Eyebrow>06 / Share your practice session</Eyebrow>
              <h2 className="lp-h2">You showed up. Let the world know.</h2>
              <p className="lp-lead">
                Every time you complete a practice session, you have the option
                to create a shareable card announcing that you've practised on
                Loquiex.
              </p>
              <p className="lp-lead">
                You can send the card to your friends or share it on your social
                media. It's a simple way to celebrate showing up for yourself
                and encourage others to start practising too.
              </p>
            </div>
            <div className="lp-stack">
              <div className="lp-card lp-share-card">
                <p className="lp-card-eyebrow">Your share card</p>
                <h3 className="lp-h3">I just finished a practice session on Loquiex!</h3>
                <p className="lp-body">Learn it. Practise it. Use it.</p>
                <p className="lp-share-foot">
                  <Share2 size={15} aria-hidden="true" /> Share with friends or
                  external social media
                </p>
              </div>
              <p className="lp-small">
                Practice session cards can be shared externally, while profile
                achievements appear on the Loquiex community wall.
              </p>
              <MoreLink to={startTo}>Share your practice session</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- 07 Your progress ---------- */}
        <section className="lp-section lp-light">
          <div className="lp-wrap lp-split">
            <div>
              <Eyebrow>07 / Your progress</Eyebrow>
              <h2 className="lp-h2">See how far you've come.</h2>
              <p className="lp-lead">
                When you're working towards becoming a better communicator, it's
                easy to overlook the progress you're making. Your activity and
                milestones give you a way to look back, recognise your
                consistency and see how much you've practised.
              </p>
            </div>
            <div className="lp-stack">
              <div className="lp-stat-grid">
                {[
                  [Mic, "24", "Practice sessions"],
                  [Clock3, "6h 20m", "Time practised"],
                  [CalendarDays, "8", "Practice days"],
                  [Flame, "5 days", "Current streak"],
                ].map(([Icon, value, label]) => (
                  <div className="lp-card lp-stat" key={label}>
                    <Icon size={20} aria-hidden="true" />
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <div className="lp-card">
                <h3 className="lp-h4">Your milestones</h3>
                <div className="lp-progress-row">
                  <span className="lp-body">Progress towards your next milestone</span>
                  <strong>80%</strong>
                </div>
                <div className="lp-progress" aria-hidden="true">
                  <span style={{ width: "80%" }} />
                </div>
                <p className="lp-small">Illustrative example: 24 of 30 practice sessions.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 08 Loquiex dashboard ---------- */}
        <section className="lp-section">
          <div className="lp-wrap lp-split lp-split-rev">
            <div>
              <Eyebrow>08 / Loquiex dashboard</Eyebrow>
              <h2 className="lp-h2">Your Loquiex space. Your progress at a glance.</h2>
              <p className="lp-lead">
                Your dashboard brings your Loquiex activity into one place. See
                your practice progress, keep track of your milestones and find
                out where you stand within the community.
              </p>
            </div>
            <div className="lp-stack">
              <div className="lp-board">
                <div className="lp-review-head">
                  <div>
                    <p className="lp-card-eyebrow">Your dashboard</p>
                    <h3 className="lp-h4">Welcome back!</h3>
                  </div>
                  <span className="lp-pill lp-pill-sm">Sample view</span>
                </div>
                <div className="lp-board-stats">
                  <div>
                    <span>Sessions</span>
                    <strong>24</strong>
                  </div>
                  <div>
                    <span>Practice time</span>
                    <strong>6h 20m</strong>
                  </div>
                </div>
                <h4 className="lp-h4">Community leaderboard</h4>
                <ol className="lp-board-list">
                  {[
                    ["01", "Member One", "1,250 pts"],
                    ["02", "Member Two", "980 pts"],
                    ["03", "Member Three", "850 pts"],
                  ].map(([n, name, pts]) => (
                    <li key={n}>
                      <span className="lp-board-num">{n}</span>
                      <span className="lp-board-name">{name}</span>
                      <span className="lp-board-pts">{pts}</span>
                    </li>
                  ))}
                </ol>
                <p className="lp-small">
                  Illustrative dashboard and leaderboard data. Final points and
                  ranking criteria to be confirmed.
                </p>
              </div>
              <div>
                <h3 className="lp-h4">A little friendly competition.</h3>
                <p className="lp-body">
                  See your position within the Loquiex community and let the
                  progress of other members encourage you to keep practising.
                </p>
              </div>
              <MoreLink to={startTo}>Explore your dashboard</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- Loquiex is for you if... ---------- */}
        <section className="lp-section lp-light">
          <div className="lp-wrap lp-narrow">
            <Eyebrow>Made for your progress</Eyebrow>
            <h2 className="lp-h2">Loquiex is for you if...</h2>
            <p className="lp-lead">
              Whether you're finding your voice in everyday conversations or
              developing your professional communication, there's room for you
              here.
            </p>
            <ul className="lp-bullets">
              {FOR_YOU.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- Member experiences ---------- */}
        <section className="lp-section">
          <div className="lp-wrap lp-narrow">
            <Eyebrow>Member experiences</Eyebrow>
            <h2 className="lp-h2">Progress worth talking about.</h2>
            <p className="lp-lead">
              Hear from people who are making communication practice part of
              their lives.
            </p>
            <figure className="lp-card lp-quote">
              <blockquote>“[Insert an authentic member testimonial here.]”</blockquote>
              <figcaption>Member name · Loquiex member</figcaption>
            </figure>
            <p className="lp-small">
              Replace the sample with a verified testimonial shared with
              permission.
            </p>
          </div>
        </section>

        {/* ---------- Membership ---------- */}
        <section className="lp-section" id="plans">
          <div className="lp-wrap">
            <div className="lp-head">
              <Eyebrow>Membership</Eyebrow>
              <h2 className="lp-h2">Find the membership that works for you.</h2>
              <p className="lp-lead">
                Start with free practice or get more access to AI feedback and
                group practice with a paid membership.
              </p>
            </div>
            <div className="lp-plans">
              {PLANS.map((p) => (
                <article
                  key={p.id}
                  className={`lp-plan ${p.featured ? "lp-plan-featured" : ""} ${p.dark ? "lp-plan-dark" : ""}`}
                >
                  {p.pill && <span className="lp-pill lp-pill-sm">{p.pill}</span>}
                  <h3 className="lp-h4">{p.name}</h3>
                  <p className="lp-price">
                    {p.price}
                    <span> {p.per}</span>
                  </p>
                  <p className="lp-small">{p.intro}</p>
                  <ul className="lp-plan-list lp-plan-bullets">
                    {p.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                  {p.note && <p className="lp-small">{p.note}</p>}
                  <Link className="lp-btn lp-btn-block" to={planTo}>
                    {p.cta}
                  </Link>
                </article>
              ))}
            </div>

            <h3 className="lp-h3 lp-compare-title">Compare your options</h3>
            <div className="lp-table-wrap">
              <table className="lp-table">
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    <th scope="col">Bloom</th>
                    <th scope="col">Flourish</th>
                    <th scope="col">Infinity</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map(([feature, ...values]) => (
                    <tr key={feature}>
                      <th scope="row">{feature}</th>
                      {values.map((v, i) => (
                        <td key={i}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="lp-small lp-table-note">
              Membership allowances and benefits are subject to published
              subscription terms. Infinity details are still to be confirmed.
            </p>
          </div>
        </section>

        {/* ---------- FAQs ---------- */}
        <section className="lp-section lp-light lp-faq-section" id="faqs">
          <div className="lp-wrap lp-narrow">
            <Eyebrow>Need to know more?</Eyebrow>
            <h2 className="lp-h2">Frequently asked questions.</h2>
            <div className="lp-faqs lp-faqs-open">
              {FAQS.map((f) => (
                <div key={f.q} className="lp-faq-item">
                  <h3 className="lp-h4">{f.q}</h3>
                  <p className="lp-body">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Final call to action ---------- */}
        <section className="lp-section lp-final">
          <div className="lp-wrap lp-narrow">
            <h2 className="lp-h2">Ready to give your voice room to grow?</h2>
            <p className="lp-lead">
              You have something to say. Start practising, find your words and
              become more confident expressing yourself.
            </p>
            <Link className="lp-btn lp-btn-block" to={startTo}>
              Create your free account
            </Link>
            <Link className="lp-more" to={signedIn ? "/app/home" : "/login"}>
              Already a member? Log in <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-top">
            <div>
              <a href="#top" className="lp-logo" aria-label="Loquiex home">
                <img src={brandLogo} alt="Loquiex" />
              </a>
              <p className="lp-small">Learn it. Practise it. Use it.</p>
            </div>
            <div className="lp-footer-cols">
              <div>
                <p className="lp-footer-title">Explore</p>
                <a href="#platform">The platform</a>
                <a href="#plans">Membership plans</a>
                <Link to={signedIn ? "/app/home" : "/login"}>Dashboard</Link>
              </div>
              <div>
                <p className="lp-footer-title">Support</p>
                {FOOTER_SUPPORT.map((l) => (
                  <a key={l.label} href={l.href}>
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <p className="lp-footer-copy">
            © {new Date().getFullYear()} Loquiex. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
