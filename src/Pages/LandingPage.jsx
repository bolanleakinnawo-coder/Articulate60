// Public landing page. Route "/" for visitors (signed-in members go straight
// to the app, see Routes/AppRoutes.jsx). "/landingpage" always shows it.
//
// Everything here describes what the app really does. Plan prices and
// allowances come from src/data/plans.js, practice levels and speaking times
// from src/data/prompts.js, and community wins from the public
// GET /api/testimonials (wins the admin approved). Pictures are placeholders,
// swapped in one place: src/data/landingImages.js.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Flame,
  Mic,
  Share2,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";

import api from "../api/axios";
import brandLogo from "../assets/landing/loquiex-logo.png";
import { LANDING_IMAGES } from "../data/landingImages";
import {
  AI_TRIAL,
  BILLING_PERIODS,
  PLANS,
  formatNaira,
} from "../data/plans";
import {
  CATEGORIES,
  LEVEL_META,
  SPEAK_DURATIONS,
} from "../data/prompts";
import "../styles/PublicLanding.css";

const NAV_LINKS = [
  { label: "The platform", href: "#platform" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Plans", href: "#plans" },
  { label: "FAQs", href: "#faqs" },
];

const plan = (id) => PLANS.find((p) => p.id === id);
const shortName = (p) => p.name.replace(/^Loquiex\s+/, "");
const maxSaving = Math.max(...BILLING_PERIODS.map((p) => p.discount));

function minutesLabel(minutes) {
  if (minutes === null) return "Unlimited";
  if (!minutes) return "Not included";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} hr` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}

function countLabel(value) {
  if (value === null) return "Unlimited";
  if (!value) return "Not included";
  return value.toLocaleString("en-NG");
}

// What each plan includes, written from its real allowances.
function planPoints(p) {
  const l = p.limits;
  if (p.id === "free") {
    return [
      "Unlimited solo speaking practice",
      `${AI_TRIAL.days}-day AI feedback trial (up to ${AI_TRIAL.perDay} a day)`,
      "Your recordings, streaks and milestones",
      "Share your practice and your wins",
    ];
  }
  const points = [];
  if (l.aiFeedbackPerDay === null) points.push("Unlimited AI feedback");
  else
    points.push(
      `${countLabel(l.aiFeedbackPerMonth)} AI feedback sessions a month`,
      `Up to ${l.aiFeedbackPerDay} AI feedback sessions a day`,
    );
  if (l.groupMinutesPerMonth === 0) points.push("Group practice not included");
  else if (l.groupMinutesPerDay === null)
    points.push("Unlimited group practice", "Host larger group calls");
  else
    points.push(
      `${minutesLabel(l.groupMinutesPerDay)} of group practice every day`,
      "Join or host audio-only group calls",
    );
  points.push("Unlimited solo speaking practice");
  return points;
}

const JOURNEY = [
  {
    eyebrow: "First, you find your starting point.",
    title: "Pick a level that suits you.",
    body: "Create your account and step into your practice space. Choose a practice level, then spin the jar for a speaking topic or pick the kind of situation you want to work on.",
  },
  {
    eyebrow: "Then, you start speaking.",
    title: "Practise putting your thoughts into words.",
    body: "Take your preparation time and record yourself speaking. No script to lean on, just you organising your ideas and saying them out loud: everyday conversations, opinions, interviews, storytelling and more.",
    dark: true,
  },
  {
    eyebrow: "You begin to understand how you communicate.",
    title: "See what went well and what to work on.",
    body: "Listen back to your recording and read your transcript. With AI speaking feedback, you see your strengths, the areas that need attention and how to improve your next attempt.",
  },
  {
    eyebrow: "Beyond practising alone.",
    title: "You get to practise with other people, too.",
    body: "Join or host audio-only group practice sessions. Discuss ideas, respond to questions, listen to other perspectives and get comfortable expressing yourself around people.",
    dark: true,
  },
  {
    eyebrow: "And you see yourself making progress.",
    title: "Your streaks, stats and milestones.",
    body: "Track your practice activity, keep your streak going, unlock milestones and share your wins. The more consistently you practise, the more room you give yourself to grow.",
  },
  {
    eyebrow: "The goal is bigger than one session.",
    title: "Speak with confidence in real life.",
    body: "It's to become someone who can organise their thoughts, communicate their ideas and express themselves with confidence in real-life situations.",
    dark: true,
  },
];

const FEEDBACK_AREAS = [
  ["Clarity", "How clearly your main point comes across."],
  ["Delivery", "Your pace and how your speech flows."],
  ["Fillers", "The ums, ahs and likes that creep in."],
  ["Repetition", "Words and phrases you lean on too often."],
  ["Grammar", "Slips, with a clear correction for each."],
  ["Vocabulary", "Stronger words you could have used."],
];

const MILESTONES = [
  [Target, "10, 50 and 100 practices"],
  [Flame, "7, 30 and 100-day streaks"],
  [BookOpen, "100 and 250 words used"],
];

const FOR_YOU = [
  "You have ideas but sometimes struggle to put them into words.",
  "You want to contribute more confidently at work.",
  "You want to become a better public speaker.",
  "You want to express yourself more clearly in everyday conversations.",
  "You want to make communication practice part of your routine.",
];

const bloom = plan("bloom");
const flourish = plan("flourish");
const infinity = plan("infinity");
const groupPlans = PLANS.filter((p) => p.limits.groupMinutesPerMonth !== 0)
  .map(shortName)
  .join(" and ");

const FAQS = [
  {
    q: "What is Loquiex?",
    a: "Loquiex is a communication practice platform that helps you organise your thoughts, express yourself clearly and build confidence through regular speaking practice.",
  },
  {
    q: "Can I use Loquiex for free?",
    a: `Yes. Solo speaking practice is free and unlimited. New members also get a ${AI_TRIAL.days}-day AI feedback trial, with up to ${AI_TRIAL.perDay} feedback sessions a day.`,
  },
  {
    q: "Do I need AI feedback to practise?",
    a: "No. You can practise speaking, listen back and track your progress on your own. AI feedback is an extra that comes with Bloom, Flourish and Infinity.",
  },
  {
    q: "How does AI feedback work?",
    a: "After a practice session, choose Get my feedback. AI reviews your recording and transcript and shows you what went well and what to work on, across clarity, delivery, fillers, repetition, grammar and vocabulary. Each review uses one of your feedback sessions.",
  },
  {
    q: "What is group practice?",
    a: `Audio-only calls where members practise speaking together. You can join a session, host your own or join with a code from a friend. Group practice comes with ${groupPlans}. Flourish includes ${minutesLabel(flourish.limits.groupMinutesPerDay)} a day and Infinity has no limit.`,
  },
  {
    q: "What is the difference between sharing a practice and sharing a win?",
    a: "A practice card is an image you can send to friends or post on social media after a session. A win is something you share from your profile. Once it's approved, it appears on the Loquiex community wall.",
  },
  {
    q: "Can I track my progress?",
    a: "Yes. Your profile shows your practice sessions, speaking time, days practised, current streak and the milestones you've unlocked.",
  },
  {
    q: "Do plans renew automatically?",
    a: `No. You pay upfront for 1, 3, 6 or 12 months (longer periods save up to ${maxSaving}%), and nothing is charged again unless you choose to pay. If you cancel, you keep your plan until the end of the period you paid for.`,
  },
  {
    q: "Can I change my membership plan?",
    a: "Yes. You can choose a different plan from Manage membership in your profile at any time.",
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

// Approved community wins (real data). Hidden when there are none.
function useCommunityWins() {
  const [wins, setWins] = useState([]);
  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/testimonials")
      .then(({ data }) => {
        if (!cancelled && Array.isArray(data)) setWins(data.slice(0, 3));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return wins;
}

export default function LandingPage() {
  const wins = useCommunityWins();
  const signedIn = hasToken();
  const startTo = signedIn ? "/app/home" : "/register";
  const startLabel = signedIn ? "Go to my practice" : "Start practising";

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
                  {startLabel}
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

        {/* ---------- Problem ---------- */}
        <section className="lp-section lp-light" id="platform">
          <div className="lp-wrap lp-narrow">
            <h2 className="lp-h2">Your ideas deserve to be heard.</h2>
            <p className="lp-lead">
              You know those moments when you have something to say, but the
              words don't come out the way you want them to? When you have an
              idea but struggle to explain it, or you want to contribute to a
              conversation but aren't quite sure how to put your thoughts
              together?
            </p>
            <p className="lp-lead">
              Loquiex gives you a place to work on that. A place to practise
              expressing yourself, learn from your attempts, have conversations
              with others and gradually become more confident using your voice.
            </p>
          </div>
        </section>

        {/* ---------- Journey ---------- */}
        <section className="lp-section" id="how-it-works">
          <div className="lp-wrap">
            <div className="lp-head">
              <Eyebrow>Your journey with Loquiex</Eyebrow>
              <h2 className="lp-h2">So, what happens when you join Loquiex?</h2>
              <p className="lp-lead">
                You don't just sign up and get a collection of lessons to read.
                You get a place to practise, take part, learn and see your
                communication develop over time.
              </p>
            </div>
            <div className="lp-journey">
              {JOURNEY.map((step, i) => (
                <article
                  key={step.title}
                  className={`lp-card ${step.dark ? "lp-card-olive" : ""}`}
                >
                  <span className="lp-step-num">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="lp-card-eyebrow">{step.eyebrow}</p>
                  <h3 className="lp-h3">{step.title}</h3>
                  <p className="lp-body">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 01 Solo ---------- */}
        <section className="lp-section lp-light">
          <div className="lp-wrap lp-split">
            <div>
              <Eyebrow>01 / Solo practice</Eyebrow>
              <h2 className="lp-h2">Make room for your thoughts.</h2>
              <p className="lp-lead">
                Sometimes you know what you want to say, but putting it into
                words is the difficult part. Solo practice gives you the space
                to work through that, one speaking session at a time.
              </p>
              <Img name="solo" />
            </div>
            <div className="lp-stack">
              <div className="lp-card">
                <p className="lp-card-eyebrow">Here's what a session looks like</p>
                <h3 className="lp-h3">Get a topic. Prepare. Speak.</h3>
                <p className="lp-body">
                  Spin the jar for a speaking prompt, take your preparation
                  time, then speak and record.
                </p>
                <div className="lp-tiles">
                  {LEVEL_META.map((level) => (
                    <div className="lp-tile" key={level.id}>
                      <strong>
                        {level.prepareSeconds
                          ? `${level.prepareSeconds}s`
                          : "0s"}
                      </strong>
                      <span>{level.title}</span>
                      <small>{level.description}</small>
                    </div>
                  ))}
                </div>
                <p className="lp-small">
                  Then speak for{" "}
                  {SPEAK_DURATIONS.map((d) => d.label).join(", ").replace(
                    /, ([^,]*)$/,
                    " or $1",
                  )}
                  . Or try Yap mode and Research mode for something different.
                </p>
                <Link className="lp-btn lp-btn-block" to={startTo}>
                  Start a practice session
                </Link>
              </div>
              <div className="lp-card">
                <h3 className="lp-h4">What can you work on?</h3>
                <ul className="lp-chips">
                  {CATEGORIES.map((c) => (
                    <li key={c.id || c.title}>{c.title}</li>
                  ))}
                </ul>
              </div>
              <div className="lp-card">
                <h3 className="lp-h4">What changes with consistency?</h3>
                <p className="lp-body">
                  You become more comfortable speaking without a prepared
                  script, get better at organising your thoughts and learn to
                  express your ideas more naturally.
                </p>
              </div>
              <MoreLink to={startTo}>Explore solo practice</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- 02 Group ---------- */}
        <section className="lp-section">
          <div className="lp-wrap lp-split lp-split-rev">
            <div>
              <Eyebrow>02 / Group practice</Eyebrow>
              <h2 className="lp-h2">Practise with other people.</h2>
              <p className="lp-lead">
                Being able to express yourself alone is one thing. Doing it
                around other people is another. Group practice takes your
                communication beyond individual exercises.
              </p>
              <Img name="group" />
            </div>
            <div className="lp-stack">
              <div className="lp-card">
                <h3 className="lp-h3">Join a conversation or host one yourself.</h3>
                <p className="lp-body">
                  Find live audio-only practice sessions, join one with a code
                  from a friend, or start your own with a topic and invite
                  others in.
                </p>
              </div>
              <div className="lp-card">
                <h3 className="lp-h4">What happens in group practice?</h3>
                <ol className="lp-steps">
                  <li>Join or host an audio-only group session.</li>
                  <li>Take part in conversations and speaking activities.</li>
                  <li>Listen to other people's ideas and perspectives.</li>
                  <li>Practise contributing, responding and sharing your own thoughts.</li>
                </ol>
              </div>
              <div className="lp-card lp-card-olive">
                <h3 className="lp-h4">Real conversations. Real practice.</h3>
                <p className="lp-body">
                  The more chances you get to speak with others, the more
                  familiar communicating in a group becomes.
                </p>
              </div>
              <p className="lp-small">
                <Users size={14} aria-hidden="true" /> Included with{" "}
                {shortName(flourish)} (
                {minutesLabel(flourish.limits.groupMinutesPerDay)} a day) and{" "}
                {shortName(infinity)} (unlimited).
              </p>
              <MoreLink to="#plans">See plans with group practice</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- 03 AI feedback ---------- */}
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
                helps you understand how you communicate and what to work on
                next.
              </p>
              <Img name="feedback" />
            </div>
            <div className="lp-stack">
              <div className="lp-card">
                <h3 className="lp-h4">What can the feedback help you notice?</h3>
                <div className="lp-feedback-grid">
                  {FEEDBACK_AREAS.map(([title, text]) => (
                    <div key={title}>
                      <strong>{title}</strong>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lp-card">
                <h3 className="lp-h4">From recording to understanding.</h3>
                <p className="lp-body">
                  Listen to your recording, follow your transcript, review
                  highlighted corrections and work through clear explanations of
                  what you could improve.
                </p>
              </div>
              <p className="lp-small">
                <Sparkles size={14} aria-hidden="true" /> Free for your first{" "}
                {AI_TRIAL.days} days (up to {AI_TRIAL.perDay} a day), then
                included with {shortName(bloom)}, {shortName(flourish)} and{" "}
                {shortName(infinity)}.
              </p>
              <MoreLink to={startTo}>Try AI feedback</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- 04 Learn ---------- */}
        <section className="lp-section">
          <div className="lp-wrap lp-split lp-split-rev">
            <div>
              <Eyebrow>04 / Learning resources</Eyebrow>
              <h2 className="lp-h2">Learn something. Put it into practice.</h2>
              <p className="lp-lead">
                Sometimes you need more than a speaking prompt. You need to
                learn how to communicate better, understand a concept or develop
                a particular skill. That's where Loquiex's learning resources
                come in.
              </p>
              <Img name="learn" />
            </div>
            <div className="lp-stack">
              <div className="lp-card">
                <h3 className="lp-h3">Explore resources that help you grow.</h3>
                <p className="lp-body">
                  Books and playbooks on speaking, words and grammar, read right
                  inside the app. Work through them at your own pace and pick up
                  where you stopped on any device.
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

        {/* ---------- 05 Share wins ---------- */}
        <section className="lp-section lp-light">
          <div className="lp-wrap lp-split">
            <div>
              <Eyebrow>05 / Share your wins</Eyebrow>
              <h2 className="lp-h2">Your progress deserves to be celebrated.</h2>
              <p className="lp-lead">
                Not every achievement has to be a major milestone. Speaking up
                in a meeting, finishing a challenge or getting through a tough
                conversation is worth celebrating.
              </p>
              <p className="lp-lead">
                Share a win from your profile. Once it's approved, it appears on
                the Loquiex community wall for other members to see.
              </p>
            </div>
            <div className="lp-stack">
              {wins.length > 0 ? (
                <div className="lp-card">
                  <p className="lp-card-eyebrow">From the community wall</p>
                  <div className="lp-wins">
                    {wins.map((w) => (
                      <figure key={w._id || w.quote} className="lp-win">
                        <blockquote>{w.quote}</blockquote>
                        <figcaption>{w.displayName}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="lp-card">
                  <Trophy size={22} className="lp-card-icon" aria-hidden="true" />
                  <h3 className="lp-h4">The community wall</h3>
                  <p className="lp-body">
                    Every win is reviewed before it goes up, so the wall stays
                    real and encouraging.
                  </p>
                </div>
              )}
              <MoreLink to={startTo}>Share your first win</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- 06 Share practice ---------- */}
        <section className="lp-section">
          <div className="lp-wrap lp-split lp-split-rev">
            <div>
              <Eyebrow>06 / Share your practice session</Eyebrow>
              <h2 className="lp-h2">You showed up. Let the world know.</h2>
              <p className="lp-lead">
                Every time you finish a practice session, you can create a
                shareable card announcing that you practised on Loquiex.
              </p>
              <p className="lp-lead">
                Send it to friends or post it on social media. It's a simple way
                to celebrate showing up for yourself and encourage others to
                start practising too.
              </p>
            </div>
            <div className="lp-stack">
              <div className="lp-card lp-share-card">
                <p className="lp-card-eyebrow">Your share card</p>
                <h3 className="lp-h3">I just finished a practice session on Loquiex!</h3>
                <p className="lp-body">Learn it. Practise it. Use it.</p>
                <p className="lp-share-foot">
                  <Share2 size={15} aria-hidden="true" /> Share with friends or
                  on social media
                </p>
              </div>
              <MoreLink to={startTo}>Share your practice session</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- 07 Progress ---------- */}
        <section className="lp-section lp-light">
          <div className="lp-wrap lp-split">
            <div>
              <Eyebrow>07 / Your progress</Eyebrow>
              <h2 className="lp-h2">See how far you've come.</h2>
              <p className="lp-lead">
                When you're working towards becoming a better communicator, it's
                easy to overlook the progress you're making. Your stats and
                milestones give you a way to look back, recognise your
                consistency and see how much you've practised.
              </p>
              <Img name="progress" />
            </div>
            <div className="lp-stack">
              <div className="lp-stat-grid">
                {[
                  [Mic, "Practice sessions", "Every session you complete"],
                  [Clock3, "Speaking time", "How long you've spoken in total"],
                  [CalendarDays, "Days practised", "The days you showed up"],
                  [Flame, "Current streak", "Days in a row, kept alive daily"],
                ].map(([Icon, title, text]) => (
                  <div className="lp-card lp-stat" key={title}>
                    <Icon size={20} aria-hidden="true" />
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <div className="lp-card">
                <h3 className="lp-h4">Milestones to unlock</h3>
                <ul className="lp-list-icons">
                  {MILESTONES.map(([Icon, text]) => (
                    <li key={text}>
                      <Icon size={17} aria-hidden="true" /> {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 08 Dashboard ---------- */}
        <section className="lp-section">
          <div className="lp-wrap lp-split lp-split-rev">
            <div>
              <Eyebrow>08 / Your Loquiex home</Eyebrow>
              <h2 className="lp-h2">Your Loquiex space. Your progress at a glance.</h2>
              <p className="lp-lead">
                Home brings your Loquiex activity into one place: today's
                practice, your streak, the word of the day, your recent
                practices and where you stand in the community.
              </p>
              <Img name="dashboard" />
            </div>
            <div className="lp-stack">
              <div className="lp-card">
                <Award size={22} className="lp-card-icon" aria-hidden="true" />
                <h3 className="lp-h3">A little friendly competition.</h3>
                <p className="lp-body">
                  The Loquiex leaderboard ranks members by their streak and
                  speaking time. Seeing others keep going is a nudge to keep
                  practising too.
                </p>
              </div>
              <MoreLink to={startTo}>Explore your home</MoreLink>
            </div>
          </div>
        </section>

        {/* ---------- For you ---------- */}
        <section className="lp-section lp-light">
          <div className="lp-wrap lp-narrow">
            <Eyebrow>Made for your progress</Eyebrow>
            <h2 className="lp-h2">Loquiex is for you if...</h2>
            <p className="lp-lead">
              Whether you're finding your voice in everyday conversations or
              developing your professional communication, there's room for you
              here.
            </p>
            <ul className="lp-checks">
              {FOR_YOU.map((t) => (
                <li key={t}>
                  <Check size={18} aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- Plans ---------- */}
        <section className="lp-section" id="plans">
          <div className="lp-wrap">
            <div className="lp-head">
              <Eyebrow>Membership</Eyebrow>
              <h2 className="lp-h2">Find the membership that works for you.</h2>
              <p className="lp-lead">
                Start with free practice, or get more AI feedback and group
                practice with a paid membership. Pay for 1, 3, 6 or 12 months and
                save up to {maxSaving}%. Plans never renew on their own.
              </p>
            </div>
            <div className="lp-plans">
              {PLANS.map((p) => (
                <article
                  key={p.id}
                  className={`lp-plan ${p.id === "flourish" ? "lp-plan-featured" : ""}`}
                >
                  {p.id === "flourish" && (
                    <span className="lp-pill lp-pill-sm">Most complete</span>
                  )}
                  <h3 className="lp-h4">{shortName(p)}</h3>
                  <p className="lp-price">
                    {formatNaira(p.priceNaira)}
                    <span>{p.priceNaira ? " / month" : " forever"}</span>
                  </p>
                  <p className="lp-small">{p.tagline}</p>
                  <ul className="lp-plan-list">
                    {planPoints(p).map((pt) => (
                      <li
                        key={pt}
                        className={pt.includes("not included") ? "is-off" : ""}
                      >
                        <Check size={15} aria-hidden="true" /> {pt}
                      </li>
                    ))}
                  </ul>
                  <Link
                    className={`lp-btn lp-btn-block ${p.id === "flourish" ? "" : "lp-btn-ghost"}`}
                    to={signedIn ? "/app/membership" : "/register"}
                  >
                    {p.id === "free"
                      ? "Get started for free"
                      : `Choose ${shortName(p)}`}
                  </Link>
                </article>
              ))}
            </div>

            <h3 className="lp-h3 lp-compare-title">Compare your options</h3>
            <p className="lp-small lp-swipe-hint">Swipe the table to see every plan.</p>
            <div className="lp-table-wrap">
              <table className="lp-table">
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    {PLANS.map((p) => (
                      <th scope="col" key={p.id}>
                        {shortName(p)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Price a month</th>
                    {PLANS.map((p) => (
                      <td key={p.id}>{formatNaira(p.priceNaira)}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Solo practice</th>
                    {PLANS.map((p) => (
                      <td key={p.id}>Unlimited</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">AI feedback a month</th>
                    {PLANS.map((p) => (
                      <td key={p.id}>
                        {p.id === "free"
                          ? `${AI_TRIAL.days}-day trial`
                          : countLabel(p.limits.aiFeedbackPerMonth)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">AI feedback a day</th>
                    {PLANS.map((p) => (
                      <td key={p.id}>
                        {p.id === "free"
                          ? `${AI_TRIAL.perDay} during trial`
                          : countLabel(p.limits.aiFeedbackPerDay)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Group practice a day</th>
                    {PLANS.map((p) => (
                      <td key={p.id}>
                        {p.limits.groupMinutesPerMonth === 0
                          ? "Not included"
                          : minutesLabel(p.limits.groupMinutesPerDay ?? null)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---------- FAQs ---------- */}
        <section className="lp-section lp-light" id="faqs">
          <div className="lp-wrap lp-narrow">
            <Eyebrow>Need to know more?</Eyebrow>
            <h2 className="lp-h2">Frequently asked questions.</h2>
            <div className="lp-faqs">
              {FAQS.map((f) => (
                <details key={f.q} className="lp-faq">
                  <summary>{f.q}</summary>
                  <p className="lp-body">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Final CTA ---------- */}
        <section className="lp-section lp-final">
          <div className="lp-wrap lp-narrow lp-center">
            <h2 className="lp-h2">Ready to give your voice room to grow?</h2>
            <p className="lp-lead">
              You have something to say. Start practising, find your words and
              become more confident expressing yourself.
            </p>
            <Link className="lp-btn" to={startTo}>
              {signedIn ? "Go to my practice" : "Create your free account"}
            </Link>
            {!signedIn && (
              <Link className="lp-more lp-more-center" to="/login">
                Already a member? Log in{" "}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
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
                <a href="#how-it-works">How it works</a>
                <a href="#plans">Membership plans</a>
                <a href="#faqs">FAQs</a>
              </div>
              <div>
                <p className="lp-footer-title">Account</p>
                <Link to="/register">Create an account</Link>
                <Link to="/login">Log in</Link>
                <Link to="/forgot-password">Forgot password</Link>
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
