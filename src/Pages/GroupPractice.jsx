import { useEffect, useMemo, useRef, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  ClockAlert,
  Copy,
  Crown,
  Globe,
  Hand,
  KeyRound,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  Mic,
  MicOff,
  PencilLine,
  PhoneOff,
  Plus,
  PlusCircle,
  Presentation,
  RefreshCw,
  Scale,
  Share2,
  Shuffle,
  Sprout,
  User,
  Users,
  Volume2,
  WifiOff,
} from "lucide-react";
import {
  fetchGroupUsage,
  getUsage,
  groupPracticePlanNames,
  hasGroupPractice,
  refreshPlanFromServer,
} from "../data/plans";
import { CATEGORIES, getRandomPrompt } from "../data/prompts";
import {
  CODE_LENGTH,
  GroupCall,
  inviteLink,
  lookupCode,
  normaliseCode,
  watchRooms,
} from "../lib/groupCall";
import { micHelp, micPermissionState, requestMic } from "../lib/microphone";
import "../styles/GroupCall.css";

// The Group Practice tab on Practice is the lobby (live public rooms).
const LOBBY = "/app/practice?tab=group";
const START = "/app/group-practice/start";
const CALL = "/app/group-practice/room";
const JOIN = "/app/group-practice/join";

const CATEGORY_ICONS = {
  "everyday-conversations": MessagesSquare,
  "word-play": Lightbulb,
  "opinions-and-debates": Scale,
  "workplace-and-interview": BriefcaseBusiness,
  "the-speaking-stage": Mic,
  storytelling: BookOpen,
  "business-ideas-and-pitches": Presentation,
};

function categoryOf(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

const SEAT_CHOICES = [2, 3, 4, 5, 6];

// Shows a code as "K7M 2QF" so it's easy to read out.
function spacedCode(code = "") {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / non-secure pages.
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// The 6-character code box + Join button. Used on the rooms page and the
// join page.
function CodeForm({ initial = "", busy = false, error = "", onSubmit }) {
  const [value, setValue] = useState(normaliseCode(initial));
  const complete = value.length === CODE_LENGTH;
  return (
    <form
      className="gpc-code-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (complete && !busy) onSubmit(value);
      }}
    >
      <label className="gpc-code-label" htmlFor="gpc-code-input">
        Call code
      </label>
      <div className="gpc-code-row">
        <input
          id="gpc-code-input"
          className="gpc-code-input"
          value={value}
          onChange={(e) => setValue(normaliseCode(e.target.value))}
          placeholder="K7M2QF"
          maxLength={CODE_LENGTH + 2}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "gpc-code-error" : undefined}
        />
        <button
          type="submit"
          className="gpc-secondary gpc-code-submit"
          disabled={!complete || busy}
        >
          {busy ? <LoaderCircle size={16} className="gpc-spin" /> : null}
          Join
        </button>
      </div>
      {error && (
        <p className="gpc-code-error" id="gpc-code-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function Avatar({ member, self = false }) {
  return (
    <span className={`gpc-avatar ${self ? "gpc-avatar-self" : ""}`}>
      {member.avatar ? (
        <img src={member.avatar} alt="" loading="lazy" />
      ) : (
        initials(member.name)
      )}
    </span>
  );
}

function formatMinutes(n) {
  return `${Number(n).toLocaleString()} min`;
}

// Usage from the server, falling back to this device's copy.
function useGroupUsage() {
  const [usage, setUsage] = useState(() => {
    const local = getUsage([]).groupMinutes;
    return { ...local, loaded: false };
  });
  useEffect(() => {
    let alive = true;
    refreshPlanFromServer()
      .then(fetchGroupUsage)
      .then((data) => {
        if (!alive) return;
        if (data) setUsage({ ...data, loaded: true });
        else setUsage((u) => ({ ...u, loaded: true }));
      });
    return () => {
      alive = false;
    };
  }, []);
  return [usage, setUsage];
}

// What members without group practice (Free, Bloom) see.
export function GroupPracticeIntro() {
  const navigate = useNavigate();

  useEffect(() => {
    if (hasGroupPractice()) navigate(LOBBY, { replace: true });
  }, [navigate]);

  const planNames = groupPracticePlanNames()
    .map((name) => `Loquiex ${name}`)
    .join(" or ");

  return (
    <div className="page gpc-page">
      <button
        className="gpc-back"
        onClick={() => navigate("/app/practice?tab=group")}
      >
        <ArrowLeft size={16} /> Back to Practice
      </button>

      <p className="gpc-eyebrow">Group practice</p>
      <h1 className="gpc-title">Your voice belongs in the room.</h1>
      <p className="gpc-sub">
        Get comfortable expressing yourself in real conversations.
      </p>

      <div className="gpc-card">
        <div className="gpc-hero">
          <span className="gpc-hero-icon" aria-hidden="true">
            <Users size={22} />
          </span>
          <span>
            <strong>Live group practice</strong>
            <span>Speak · Listen · Grow</span>
          </span>
          <LockKeyhole size={18} className="gpc-lock" aria-label="Locked" />
        </div>

        <ul className="gpc-list">
          <li>
            <MessagesSquare size={22} aria-hidden="true" />
            <span>
              <strong>Join live practice sessions</strong>
              <span>
                Meet other learners and practise expressing your thoughts in
                real conversations.
              </span>
            </span>
          </li>
          <li>
            <AudioLines size={22} aria-hidden="true" />
            <span>
              <strong>Build confidence speaking aloud</strong>
              <span>
                Get more comfortable sharing ideas, responding to others and
                thinking on your feet.
              </span>
            </span>
          </li>
          <li>
            <CalendarClock size={22} aria-hidden="true" />
            <span>
              <strong>Practise on your schedule</strong>
              <span>
                Join a public practice or start your own when you&apos;re ready.
              </span>
            </span>
          </li>
        </ul>
      </div>

      <p className="gpc-sub" style={{ marginTop: 8 }}>
        <Sprout
          size={16}
          aria-hidden="true"
          style={{ verticalAlign: "-3px", marginRight: 6 }}
        />
        Group practice comes with {planNames}.
      </p>

      <button
        className="gpc-primary"
        onClick={() =>
          navigate("/app/membership", { state: { reason: "group" } })
        }
      >
        Explore membership
      </button>
      <button
        className="gpc-link gpc-center"
        onClick={() => navigate("/app/practice")}
      >
        I&apos;ll keep practising on my own for now
      </button>
    </div>
  );
}

function TimeUp({ onBack }) {
  return (
    <div className="page gpc-page">
      <div className="gpc-ended">
        <span className="gpc-ended-icon" aria-hidden="true">
          <ClockAlert size={28} />
        </span>
        <h1 className="gpc-title">Your practice time is up</h1>
        <p className="gpc-sub">
          You&apos;ve used all your group practice minutes for this month.
        </p>
        <div className="gpc-card">
          <p>
            <RefreshCw size={18} aria-hidden="true" /> Your minutes reset on the
            1st
          </p>
          <span>Come back next month to join another group practice.</span>
        </div>
        <button className="gpc-primary" onClick={onBack}>
          Back to Practice
        </button>
      </div>
    </div>
  );
}

function Allowance({ usage }) {
  const unlimited = usage.total === null;
  return (
    <div className="gpc-card gpc-allowance">
      <div className="gpc-allowance-row">
        <Clock size={18} aria-hidden="true" />
        <span>This month</span>
        <strong>
          {unlimited ? "Unlimited" : `${formatMinutes(usage.left)} left`}
        </strong>
      </div>
      {!unlimited && usage.total > 0 && (
        <span className="gpc-bar" aria-hidden="true">
          <span
            style={{
              width: `${Math.max(0, Math.min(100, (usage.left / usage.total) * 100))}%`,
            }}
          />
        </span>
      )}
      <small>
        {unlimited
          ? `Your plan has unlimited group practice. ${formatMinutes(usage.usedThisMonth || 0)} used this month.`
          : `${formatMinutes(usage.usedThisMonth || 0)} of ${formatMinutes(usage.total)} used · resets on the 1st. Minutes count only while someone else is in the call.`}
      </small>
    </div>
  );
}

function Elapsed({ since }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - since) / 1000));
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, "0");
  return (
    <>
      {m}:{s}
    </>
  );
}

const END_COPY = {
  full: "This room is full.",
  gone: "This room has closed.",
  "bad-code": "That code doesn't look right.",
  "no-code": "No live call has that code.",
  "slow-down": "Too many wrong codes.",
  "joined-elsewhere": "You joined group practice on another device or tab.",
  "signed-out": "Please sign in again to join group practice.",
  timeout: "We couldn't reach the server.",
  error: "Something went wrong.",
};

// "Nearly full": one seat left, or three quarters of the seats taken.
function seatsLeft(room) {
  return Math.max(0, room.max - room.members.length);
}
function isNearlyFull(room) {
  const left = seatsLeft(room);
  return left > 0 && (left === 1 || room.members.length / room.max >= 0.75);
}

const ROOM_FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open seats" },
  { id: "nearly-full", label: "Nearly full" },
];

// Practice > Group Practice. Live public rooms from the server; joining
// needs Flourish or Infinity (others are shown the membership page).
export function GroupPracticeTab() {
  const navigate = useNavigate();
  const allowed = hasGroupPractice();
  const [rooms, setRooms] = useState([]);
  const [connection, setConnection] = useState("connecting");
  const [filter, setFilter] = useState("all");

  useEffect(() => watchRooms(setRooms, setConnection), []);

  const shown = rooms.filter((room) =>
    filter === "open"
      ? seatsLeft(room) > 0
      : filter === "nearly-full"
        ? isNearlyFull(room)
        : true,
  );

  const locked = () => navigate("/app/group-practice");
  const joinRoom = (room) =>
    allowed
      ? navigate(`${CALL}/${room.id}`, {
          state: {
            autoJoin: true,
            preview: {
              categoryTitle: room.categoryTitle,
              hostName: room.hostName,
              private: room.private,
            },
          },
        })
      : locked();

  return (
    <div className="gpt">
      <div className="practice-panel-intro gpt-intro">
        <h2 className="practice-panel-title">Practise together.</h2>
        <p className="practice-panel-sub">
          Find a group, start your own, and get comfortable expressing
          yourself.
        </p>
      </div>

      <div className="gpt-actions">
        <button
          type="button"
          className="gpt-action gpt-action-primary"
          onClick={() => (allowed ? navigate(START) : locked())}
        >
          <PlusCircle size={22} strokeWidth={1.8} aria-hidden="true" />
          <span className="gpt-action-text">
            <strong>Start a practice</strong>
            <span>Create a public or private group.</span>
          </span>
          {allowed ? (
            <ArrowUpRight size={18} aria-hidden="true" />
          ) : (
            <LockKeyhole size={16} aria-label="Members only" />
          )}
        </button>
        <button
          type="button"
          className="gpt-action"
          onClick={() => navigate(JOIN)}
        >
          <KeyRound size={22} strokeWidth={1.8} aria-hidden="true" />
          <span className="gpt-action-text">
            <strong>Join with a code</strong>
            <span>Enter a code for a private group.</span>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      {!allowed && (
        <p className="gpt-plan-note">
          <Sprout size={15} aria-hidden="true" />
          Group practice comes with{" "}
          {groupPracticePlanNames()
            .map((n) => `Loquiex ${n}`)
            .join(" or ")}
          .
        </p>
      )}

      <hr className="gpt-divider" />

      <section aria-labelledby="gpt-find-title">
        <h3 className="gpt-section-title" id="gpt-find-title">
          Find a practice
        </h3>
        <p className="gpt-section-sub">
          Explore public groups and join a conversation.
        </p>

        <div className="gpt-filters" role="group" aria-label="Filter practices">
          {ROOM_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="gpt-filter"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {connection !== "connected" ? (
          <div className="gpc-empty">
            <span className="gpc-status">
              {connection === "signed-out" ? (
                <>
                  <WifiOff size={16} /> Please sign in again to see live
                  practices.
                </>
              ) : (
                <>
                  <LoaderCircle size={16} className="gpc-spin" /> Finding live
                  practices. This can take up to a minute the first time.
                </>
              )}
            </span>
          </div>
        ) : shown.length === 0 ? (
          <div className="gpc-empty">
            {rooms.length === 0
              ? "No public practices are live right now. Start one and others can join you."
              : filter === "open"
                ? "Every public practice is full right now. Start your own, or check back in a moment."
                : "No practices are nearly full right now."}
          </div>
        ) : (
          <div className="gpt-rooms">
            {shown.map((room) => {
              const Icon = CATEGORY_ICONS[room.categoryId] || MessagesSquare;
              const full = seatsLeft(room) === 0;
              const description =
                categoryOf(room.categoryId)?.description || room.prompt;
              return (
                <article className="gpt-room" key={room.id}>
                  <div className="gpt-room-top">
                    <span className="gpt-room-icon" aria-hidden="true">
                      <Icon size={20} strokeWidth={1.8} />
                    </span>
                    <div className="gpt-room-info">
                      <h4>{room.categoryTitle}</h4>
                      {description && <p>{description}</p>}
                      <span className="gpt-room-meta">
                        {room.members.length}/{room.max} participants · Public
                      </span>
                    </div>
                  </div>
                  <div className="gpt-room-foot">
                    <span className="gpt-room-host">
                      Host: {room.hostName || "Member"}
                    </span>
                    <button
                      type="button"
                      className="gpt-join"
                      disabled={full}
                      onClick={() => joinRoom(room)}
                    >
                      {full ? "Full" : "Join"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="gpt-invite">
        <p className="gpt-invite-title">
          <LockKeyhole size={18} aria-hidden="true" /> Have a private
          invitation?
        </p>
        <p className="gpt-invite-text">
          Use your Practice Code to access your group.
        </p>
        <button
          type="button"
          className="gpt-invite-button"
          onClick={() => navigate(JOIN)}
        >
          Enter Practice Code
        </button>
      </div>
    </div>
  );
}

// Old lobby address: the lobby now lives on the Practice tab.
export function GroupPracticeRoom() {
  return <Navigate to={LOBBY} replace />;
}

// Start a practice: public or private, topic, seats, first prompt.
export function GroupPracticeStart() {
  const navigate = useNavigate();
  const [usage] = useGroupUsage();
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [prompt, setPrompt] = useState(() => getRandomPrompt(CATEGORIES[0].id));
  const [isPrivate, setIsPrivate] = useState(false);
  const [seats, setSeats] = useState(4);

  useEffect(() => {
    if (!hasGroupPractice()) navigate("/app/group-practice", { replace: true });
  }, [navigate]);

  const category = categoryOf(categoryId);
  const pickCategory = (id) => {
    setCategoryId(id);
    setPrompt(getRandomPrompt(id));
  };

  if (usage.loaded && usage.total === 0) {
    return <Navigate to="/app/group-practice" replace />;
  }
  if (usage.loaded && usage.left !== null && usage.left <= 0) {
    return <TimeUp onBack={() => navigate(LOBBY)} />;
  }

  const startRoom = () =>
    navigate(`${CALL}/new`, {
      state: {
        create: {
          categoryId,
          categoryTitle: category?.title || "Open conversation",
          prompt,
          private: isPrivate,
          max: seats,
        },
        preview: {
          categoryTitle: category?.title || "Open conversation",
          private: isPrivate,
        },
      },
    });

  return (
    <div className="page gpc-page">
      <button className="gpc-back" onClick={() => navigate(LOBBY)}>
        <ArrowLeft size={16} /> Group Practice
      </button>
      <h1 className="gpc-title">Start a practice</h1>
      <p className="gpc-sub">
        Pick a topic and who can join. Audio only, and calls are never
        recorded.
      </p>

      <Allowance usage={usage} />

      <div className="gpc-card">
        <p className="gpc-field-label" id="gpc-who-label">
          Who can join
        </p>
        <div
          className="gpc-visibility"
          role="radiogroup"
          aria-labelledby="gpc-who-label"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!isPrivate}
            className="gpc-visibility-option"
            onClick={() => setIsPrivate(false)}
          >
            <Globe size={18} aria-hidden="true" />
            <span>
              <strong>Public</strong>
              <span>Listed under Find a practice for any member.</span>
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isPrivate}
            className="gpc-visibility-option"
            onClick={() => setIsPrivate(true)}
          >
            <LockKeyhole size={18} aria-hidden="true" />
            <span>
              <strong>Private</strong>
              <span>Hidden. Only people with your code can join.</span>
            </span>
          </button>
        </div>

        <p className="gpc-field-label">Topic</p>
        <div className="gpc-chips" role="group" aria-label="Topic">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="gpc-chip"
              aria-pressed={c.id === categoryId}
              onClick={() => pickCategory(c.id)}
            >
              {c.title}
            </button>
          ))}
        </div>

        <p className="gpc-field-label">Seats</p>
        <div className="gpc-chips" role="group" aria-label="Seats">
          {SEAT_CHOICES.map((n) => (
            <button
              key={n}
              type="button"
              className="gpc-chip gpc-chip-seat"
              aria-pressed={n === seats}
              onClick={() => setSeats(n)}
            >
              {n} people
            </button>
          ))}
        </div>

        {prompt && (
          <div className="gpc-prompt-preview">
            <span>First prompt</span>
            {prompt}
          </div>
        )}
        <button
          type="button"
          className="gpc-link"
          style={{ margin: "0 0 16px" }}
          onClick={() => setPrompt(getRandomPrompt(categoryId))}
        >
          <Shuffle size={14} /> Another prompt
        </button>
        <button type="button" className="gpc-primary" onClick={startRoom}>
          <Plus size={18} />
          {isPrivate ? "Start a private practice" : "Start a public practice"}
        </button>
      </div>
      <p className="gpc-note">
        Group practice uses your microphone. We&apos;ll ask for it when you
        join. Use headphones if you can, so others don&apos;t hear an echo.
      </p>
    </div>
  );
}

// Steps for turning a blocked microphone back on, with Try again.
function MicHelp({ error, busy, onRetry, onListen, compact = false }) {
  const help = micHelp(error);
  return (
    <div className={`gpc-mic-help ${compact ? "gpc-mic-help-compact" : ""}`}>
      <p className="gpc-mic-help-title">
        <MicOff size={18} aria-hidden="true" /> {help.title}
      </p>
      <p className="gpc-mic-help-text">{help.text}</p>
      {help.steps.length > 0 && (
        <ol className="gpc-mic-steps">
          {help.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      <div className="gpc-mic-actions">
        <button
          type="button"
          className="gpc-primary"
          onClick={onRetry}
          disabled={busy}
        >
          {busy ? (
            <LoaderCircle size={18} className="gpc-spin" />
          ) : (
            <RefreshCw size={18} />
          )}
          Try again
        </button>
        {onListen && (
          <button type="button" className="gpc-secondary" onClick={onListen}>
            <Volume2 size={16} /> Join and listen only
          </button>
        )}
      </div>
    </div>
  );
}

// Asks for the microphone before joining, like Zoom does.
function MicPrompt({ title, step, error, onAllow, onDeny, onBack }) {
  const asking = step === "asking";
  return (
    <div
      className="gpc-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gpc-mic-title"
    >
      <div className="gpc-modal">
        {step === "blocked" ? (
          <>
            <h2 className="gpc-modal-title" id="gpc-mic-title">
              Turn on your microphone
            </h2>
            <MicHelp
              error={error}
              onRetry={onAllow}
              onListen={onDeny}
              busy={false}
            />
          </>
        ) : (
          <>
            <span className="gpc-modal-icon" aria-hidden="true">
              <Mic size={28} />
            </span>
            <h2 className="gpc-modal-title" id="gpc-mic-title">
              Allow microphone?
            </h2>
            <p className="gpc-modal-text">
              {title ? (
                <>
                  You&apos;re joining <strong>{title}</strong>.{" "}
                </>
              ) : null}
              Loquiex needs your microphone so others in the practice can hear
              you. You can mute and unmute any time.
            </p>
            {asking && (
              <p className="gpc-modal-hint">
                <LoaderCircle size={14} className="gpc-spin" /> Choose{" "}
                <strong>Allow</strong> in the box your phone or browser shows.
              </p>
            )}
            <div className="gpc-modal-actions">
              <button
                type="button"
                className="gpc-primary"
                onClick={onAllow}
                disabled={asking}
              >
                <Mic size={18} /> Allow microphone
              </button>
              <button
                type="button"
                className="gpc-secondary"
                onClick={onDeny}
                disabled={asking}
              >
                Don&apos;t allow, just listen
              </button>
            </div>
          </>
        )}
        <button type="button" className="gpc-link gpc-center" onClick={onBack}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// A live call. Reached from Find a practice, Start a practice, or a code.
export function GroupPracticeCall() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  // What to join, from the screen that opened this one (kept after the URL
  // changes to the real room id).
  const [entry] = useState(() => ({
    create: location.state?.create || null,
    code: location.state?.code || null,
    preview: location.state?.preview || null,
  }));
  const callRef = useRef(null);
  const pendingStream = useRef(null);
  const [call, setCall] = useState(null);
  const [dismissed, setDismissed] = useState(null);
  // checking | ask | asking | blocked | joined
  const [micStep, setMicStep] = useState("checking");
  const [micError, setMicError] = useState(null);

  const allowed = hasGroupPractice();
  const missingRoom = roomId === "new" && !entry.create;

  const join = (stream) => {
    if (callRef.current) return;
    const session = new GroupCall((snap) => setCall(snap));
    callRef.current = session;
    setMicStep("joined");
    session.join(
      entry.create
        ? { create: entry.create }
        : entry.code
          ? { code: entry.code }
          : { roomId },
      { stream },
    );
  };

  // Ask the browser for the microphone (shows its Allow / Block box).
  const askMic = async () => {
    setMicStep("asking");
    const result = await requestMic();
    if (result.stream) {
      join(result.stream);
      return;
    }
    setMicError(result.error);
    setMicStep("blocked");
  };

  // Already allowed before? Join straight away. Blocked? Show how to fix it.
  useEffect(() => {
    if (!allowed || missingRoom) return undefined;
    let cancelled = false;
    micPermissionState().then(async (state) => {
      if (cancelled) return;
      if (state === "granted") {
        const result = await requestMic();
        if (cancelled) {
          result.stream?.getTracks().forEach((t) => t.stop());
          return;
        }
        if (result.stream) {
          pendingStream.current = result.stream;
          setMicStep("ready");
        } else {
          setMicError(result.error);
          setMicStep("blocked");
        }
      } else if (state === "denied") {
        setMicError("blocked");
        setMicStep("blocked");
      } else {
        setMicStep("ask");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [allowed, missingRoom]);

  // Mic was already allowed: join once it's ready.
  useEffect(() => {
    if (micStep === "ready" && pendingStream.current) {
      const stream = pendingStream.current;
      pendingStream.current = null;
      join(stream);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micStep]);

  // Leave the call when this page closes.
  useEffect(
    () => () => {
      callRef.current?.leave();
      callRef.current = null;
      pendingStream.current?.getTracks().forEach((t) => t.stop());
      pendingStream.current = null;
    },
    [],
  );

  // Keep the URL on the real room id (shareable, and survives refresh).
  const liveRoomId = call?.room?.id;
  useEffect(() => {
    if (liveRoomId && liveRoomId !== roomId) {
      navigate(`${CALL}/${liveRoomId}`, { replace: true, state: {} });
    }
  }, [liveRoomId, roomId, navigate]);

  const leave = () => {
    callRef.current?.leave();
    callRef.current = null;
    navigate(LOBBY);
  };

  // Call controls (they read the live session when tapped).
  const actions = useMemo(
    () => ({
      setMuted: (v) => callRef.current?.setMuted(v),
      enableMic: () =>
        callRef.current?.enableMic() || Promise.resolve({ error: "ended" }),
      setHand: (v) => callRef.current?.setHand(v),
      setPrompt: (p, c) => callRef.current?.setPrompt(p, c),
      resumeAudio: () => callRef.current?.resumeAudio(),
    }),
    [],
  );

  if (!allowed) return <Navigate to="/app/group-practice" replace />;
  if (missingRoom) return <Navigate to={START} replace />;

  if (micStep !== "joined") {
    const preview = entry.preview;
    return (
      <div className="page gpc-page">
        <button className="gpc-back" onClick={() => navigate(LOBBY)}>
          <ArrowLeft size={16} /> Group Practice
        </button>
        <h1 className="gpc-title">
          {preview?.categoryTitle || "Group practice"}
        </h1>
        <p className="gpc-sub">
          {preview
            ? `${preview.private ? "Private" : "Public"} practice · Audio-only group${preview.hostName ? ` · Host: ${preview.hostName}` : ""}`
            : "Audio-only group"}
        </p>
        {micStep === "checking" || micStep === "ready" ? (
          <div className="gpc-empty">
            <span className="gpc-status">
              <LoaderCircle size={16} className="gpc-spin" /> Getting your
              microphone ready…
            </span>
          </div>
        ) : (
          <MicPrompt
            title={preview?.categoryTitle}
            step={micStep}
            error={micError}
            onAllow={askMic}
            onDeny={() => join(null)}
            onBack={() => navigate(LOBBY)}
          />
        )}
      </div>
    );
  }

  if (call?.status === "ended") {
    const code = call.endReason?.code;
    if (code === "time-up") return <TimeUp onBack={() => navigate(LOBBY)} />;
    if (code === "no-plan")
      return <Navigate to="/app/group-practice" replace />;
    return (
      <div className="page gpc-page">
        <div className="gpc-ended">
          <span className="gpc-ended-icon" aria-hidden="true">
            <PhoneOff size={26} />
          </span>
          <h1 className="gpc-title">{END_COPY[code] || END_COPY.error}</h1>
          <p className="gpc-sub">
            {call.endReason?.message &&
            END_COPY[code] !== call.endReason.message
              ? call.endReason.message
              : "Pick another practice or start your own."}
          </p>
          <button className="gpc-primary" onClick={() => navigate(LOBBY)}>
            Back to Group Practice
          </button>
        </div>
      </div>
    );
  }

  if (!call || call.status !== "live") {
    return (
      <div className="page gpc-page">
        <button className="gpc-back" onClick={leave}>
          <ArrowLeft size={16} /> Group Practice
        </button>
        <div className="gpc-empty">
          <span className="gpc-status">
            <LoaderCircle size={16} className="gpc-spin" /> Joining the
            practice… The first call of the day can take up to a minute.
          </span>
        </div>
      </div>
    );
  }

  return (
    <LiveCall
      call={call}
      session={actions}
      joinedAt={call.joinedAt}
      dismissed={dismissed}
      onDismiss={setDismissed}
      onLeave={leave}
    />
  );
}

function seatStatus(m, room) {
  if (!m.isSelf && m.connection !== "connected")
    return m.connection === "failed" ? "Can't connect" : "Connecting…";
  if (m.speaking) return "Speaking";
  if (m.hand) return "Hand raised";
  if (m.isSelf) return m.muted ? "Muted" : "Mic on";
  if (m.muted) return room.hostId === m.userId ? "Host · Muted" : "Muted";
  return room.hostId === m.userId ? "Host" : "Listening";
}

function LiveCall({ call, session, joinedAt, dismissed, onDismiss, onLeave }) {
  const { room, members, usage } = call;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [micBusy, setMicBusy] = useState(false);
  const unlimited = !usage || usage.total === null;
  const left = unlimited ? null : usage.left;
  const warning = unlimited
    ? null
    : left <= 1
      ? "final"
      : left <= 5
        ? "low"
        : null;
  const alone = members.length < 2;
  const sorted = useMemo(
    () =>
      [...members].sort((a, b) =>
        a.isSelf ? -1 : b.isSelf ? 1 : a.joinedAt - b.joinedAt,
      ),
    [members],
  );
  const openSeats = Math.max(0, room.max - members.length);
  const host = members.find((m) => m.userId === room.hostId);
  const noMic = !call.hasMic;
  const micBlocked =
    noMic && call.micError && call.micError !== "listen-only";

  const newPrompt = () => {
    const next = getRandomPrompt(room.categoryId);
    if (next) session?.setPrompt(next, categoryOf(room.categoryId));
  };

  const savePrompt = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    session?.setPrompt(text);
    setEditing(false);
  };

  // Unmute asks for the microphone if the member joined without it.
  const toggleMic = async () => {
    if (!call.muted) {
      session?.setMuted(true);
      return;
    }
    if (call.hasMic) {
      session?.setMuted(false);
      return;
    }
    setMicBusy(true);
    await session?.enableMic();
    setMicBusy(false);
  };

  return (
    <div className="page gpc-page gpc-call">
      <button className="gpc-back gpc-leave-link" onClick={onLeave}>
        <ArrowLeft size={16} /> Leave room
      </button>

      <div className="gpc-call-head">
        <div>
          <h1 className="gpc-title">{room.categoryTitle}</h1>
          <p className="gpc-sub">
            {room.private ? "Private" : "Public"} practice · Audio-only group
          </p>
        </div>
        {warning ? (
          <span className="gpc-pill gpc-pill-warn">{left} min left</span>
        ) : (
          <span className="gpc-pill">
            <span className="gpc-live-dot" /> In room{" "}
            <Elapsed since={joinedAt} />
          </span>
        )}
      </div>

      {warning && dismissed !== warning && (
        <div className="gpc-alert gpc-alert-warn" role="alert">
          <p>
            <Clock size={18} aria-hidden="true" />
            {warning === "final"
              ? "One minute left."
              : "Your practice time is running low."}
          </p>
          <span>
            {warning === "final"
              ? "You'll leave the call when your time runs out. The others can keep going."
              : `You have ${left} minutes of group practice left this month.`}
          </span>
          <button className="gpc-link" onClick={() => onDismiss(warning)}>
            Got it
          </button>
        </div>
      )}

      {micBlocked ? (
        <div className="gpc-alert" role="alert">
          <MicHelp
            compact
            error={call.micError}
            busy={micBusy}
            onRetry={toggleMic}
          />
        </div>
      ) : noMic ? (
        <div className="gpc-alert">
          <p>
            <MicOff size={18} aria-hidden="true" /> You&apos;re listening only
          </p>
          <span>Tap Unmute when you want to speak. We&apos;ll ask for your microphone then.</span>
        </div>
      ) : null}

      {call.audioBlocked && (
        <div className="gpc-alert" role="alert">
          <p>
            <Volume2 size={18} aria-hidden="true" /> Sound is paused
          </p>
          <span>Your browser needs a tap before it plays the room.</span>
          <button className="gpc-link" onClick={() => session?.resumeAudio()}>
            Tap to hear the room
          </button>
        </div>
      )}

      <section className="gpc-card gpc-room-card" aria-label="People in the room">
        <span className="gpc-room-card-icon" aria-hidden="true">
          <Users size={26} strokeWidth={1.8} />
        </span>
        <h2 className="gpc-room-card-title">Group practice room</h2>
        <p className="gpc-room-card-text">
          {alone
            ? room.private
              ? "Waiting for others. Share your code below so friends can join. Minutes only count once someone else is here."
              : "Waiting for others. Your practice is listed under Find a practice. Minutes only count once someone else is here."
            : `${members.length} of ${room.max} seats taken${host ? ` · Host: ${host.isSelf ? "You" : host.name}` : ""}`}
        </p>
        <div className="gpc-seats">
          {sorted.map((m) => {
            const waiting = !m.isSelf && m.connection !== "connected";
            return (
              <div
                key={m.userId}
                className={`gpc-seat ${m.speaking ? "gpc-speaking" : ""} ${waiting ? "gpc-waiting" : ""}`}
              >
                <span className="gpc-member-icons">
                  {m.hand && (
                    <Hand size={14} className="gpc-hand" aria-label="Hand raised" />
                  )}
                  {m.muted && <MicOff size={14} aria-label="Muted" />}
                  {room.hostId === m.userId && (
                    <Crown size={14} aria-label="Host" />
                  )}
                </span>
                <Avatar member={m} self={m.isSelf} />
                <span className="gpc-member-name">
                  {m.isSelf ? "You" : m.name}
                </span>
                <span className="gpc-member-tag">
                  {m.isSelf && noMic ? "No microphone" : seatStatus(m, room)}
                </span>
              </div>
            );
          })}
          {Array.from({ length: openSeats }, (_, i) => (
            <div className="gpc-seat gpc-seat-open" key={`open-${i}`}>
              <span className="gpc-avatar gpc-avatar-open" aria-hidden="true">
                <User size={22} strokeWidth={1.8} />
              </span>
              <span className="gpc-member-name">Open seat</span>
              <span className="gpc-member-tag">Available</span>
            </div>
          ))}
        </div>
      </section>

      <section className="gpc-card gpc-prompt-card">
        <p className="gpc-prompt-label">
          <MessageCircle size={18} aria-hidden="true" /> Speaking prompt
        </p>
        {editing ? (
          <form onSubmit={savePrompt} className="gpc-prompt-form">
            <label className="gpc-field-label" htmlFor="gpc-prompt-input">
              Your prompt
            </label>
            <textarea
              id="gpc-prompt-input"
              className="gpc-prompt-input"
              value={draft}
              maxLength={300}
              rows={3}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What should everyone talk about?"
            />
            <div className="gpc-prompt-buttons">
              <button
                type="button"
                className="gpc-outline"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="gpc-outline gpc-outline-strong"
                disabled={!draft.trim()}
              >
                Use this prompt
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="gpc-prompt-text">
              {room.prompt || "Talk about anything on your mind today."}
            </p>
            {call.isHost ? (
              <div className="gpc-prompt-buttons">
                <button
                  type="button"
                  className="gpc-outline"
                  onClick={newPrompt}
                  disabled={!categoryOf(room.categoryId)}
                >
                  <Shuffle size={15} /> Next prompt
                </button>
                <button
                  type="button"
                  className="gpc-outline"
                  onClick={() => {
                    setDraft("");
                    setEditing(true);
                  }}
                >
                  <PencilLine size={15} /> Write your prompt
                </button>
              </div>
            ) : (
              <small className="gpc-prompt-note">
                The host chooses the prompt. Raise your hand to speak next.
              </small>
            )}
          </>
        )}
      </section>

      {room.code && (
        <InviteCard
          code={room.code}
          isPrivate={room.private}
          topic={room.categoryTitle}
          full={members.length >= room.max}
        />
      )}

      <div className="gpc-controls">
        <button
          type="button"
          className="gpc-control"
          onClick={toggleMic}
          aria-pressed={call.muted}
          disabled={micBusy}
        >
          {micBusy ? (
            <LoaderCircle size={22} className="gpc-spin" />
          ) : call.muted ? (
            <MicOff size={22} />
          ) : (
            <Mic size={22} />
          )}
          <span>{call.muted ? "Unmute" : "Mute"}</span>
        </button>
        <button
          type="button"
          className="gpc-control"
          onClick={() => session?.setHand(!call.hand)}
          aria-pressed={call.hand}
        >
          <Hand size={22} />
          <span>{call.hand ? "Lower hand" : "Raise hand"}</span>
        </button>
        <button
          type="button"
          className="gpc-control gpc-leave"
          onClick={onLeave}
        >
          <PhoneOff size={22} />
          <span>Leave</span>
        </button>
      </div>

      <p className="gpc-allowance-inline">
        {unlimited
          ? "Unlimited group practice on your plan."
          : `${formatMinutes(left)} of group practice left this month.`}
      </p>
    </div>
  );
}

// The call's code with Copy and Share. Shown to everyone in the call.
function InviteCard({ code, isPrivate, topic, full }) {
  const [copied, setCopied] = useState(null); // "code" | "link" | null
  const canShare = typeof navigator !== "undefined" && Boolean(navigator.share);
  const link = inviteLink(code);
  const message = `Join my Loquiex group practice call on "${topic}". Code: ${code}`;

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async (what) => {
    const ok = await copyText(what === "code" ? code : `${message}\n${link}`);
    if (ok) setCopied(what);
  };

  const share = async () => {
    try {
      await navigator.share({
        title: "Loquiex group practice",
        text: message,
        url: link,
      });
    } catch (err) {
      // Cancelled by the member, or sharing isn't allowed: copy instead.
      if (err?.name !== "AbortError") copy("link");
    }
  };

  return (
    <div className="gpc-card gpc-invite">
      <div className="gpc-card-heading">
        <span>{isPrivate ? "Private call code" : "Invite code"}</span>
        {isPrivate && (
          <span className="gpc-invite-tag">
            <LockKeyhole size={12} aria-hidden="true" /> Private
          </span>
        )}
      </div>
      <div className="gpc-invite-row">
        <strong
          className="gpc-invite-code"
          aria-label={`Code ${code.split("").join(" ")}`}
        >
          {spacedCode(code)}
        </strong>
        <div className="gpc-invite-actions">
          <button
            type="button"
            className="gpc-secondary"
            onClick={() => copy("code")}
          >
            {copied === "code" ? <Check size={16} /> : <Copy size={16} />}
            {copied === "code" ? "Copied" : "Copy code"}
          </button>
          <button
            type="button"
            className="gpc-secondary"
            onClick={canShare ? share : () => copy("link")}
          >
            {copied === "link" ? <Check size={16} /> : <Share2 size={16} />}
            {copied === "link"
              ? "Invite copied"
              : canShare
                ? "Share"
                : "Copy invite"}
          </button>
        </div>
      </div>
      <small>
        {full
          ? "The call is full right now. Others can join with this code when a seat opens."
          : "Friends tap Join with a code under Group Practice, or open the link you share. They need Loquiex Flourish or Infinity to join."}
      </small>
    </div>
  );
}

const CODE_ERRORS = {
  "bad-code": "Codes have 6 letters and numbers. Check the code and try again.",
  "no-code":
    "No live call has that code. It may have ended, or the code has a typo.",
  "slow-down": "Too many wrong codes. Please wait a few minutes and try again.",
  "signed-out": "Please sign in again to join group practice.",
  timeout: "We couldn't reach the server. Check your connection and try again.",
};

// Join a call with a code: /app/group-practice/join and /join/:code (the
// link members share). Shows the call before joining.
export function GroupPracticeJoin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code: codeParam } = useParams();
  const code = normaliseCode(codeParam);
  const allowed = hasGroupPractice();
  const [usage] = useGroupUsage();
  // Result of the latest lookup, tagged with the code + visit it belongs to.
  const visit = `${code}:${location.key}`;
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!code) return undefined;
    let alive = true;
    lookupCode(code).then((reply) => {
      if (!alive) return;
      if (reply?.ok) setResult({ visit, status: "found", room: reply.room });
      else
        setResult({
          visit,
          status: "error",
          error:
            CODE_ERRORS[reply?.error] ||
            reply?.message ||
            "Something went wrong. Please try again.",
        });
    });
    return () => {
      alive = false;
    };
    // location.key (in visit): look up again when the same code is entered twice.
  }, [code, visit]);

  const lookup = !code
    ? { status: "idle" }
    : result?.visit === visit
      ? result
      : { status: "loading" };

  const submit = (value) =>
    navigate(`${JOIN}/${value}`, { replace: Boolean(code) });
  const room = lookup.room;
  const full = room && room.members.length >= room.max;
  const timeUp =
    allowed && usage.loaded && usage.left !== null && usage.left <= 0;

  const planNames = groupPracticePlanNames()
    .map((name) => `Loquiex ${name}`)
    .join(" or ");

  return (
    <div className="page gpc-page">
      <button
        className="gpc-back"
        onClick={() => navigate(LOBBY)}
      >
        <ArrowLeft size={16} /> Group Practice
      </button>
      <p className="gpc-eyebrow">Group practice</p>
      <h1 className="gpc-title">
        {room ? "You're invited to a call" : "Join with a code"}
      </h1>
      <p className="gpc-sub">
        {room
          ? "Check the details, then join. We'll ask for your microphone first, and you can mute any time."
          : "Enter the 6-character code your friend shared with you."}
      </p>

      {lookup.status === "loading" && (
        <div className="gpc-empty">
          <span className="gpc-status">
            <LoaderCircle size={16} className="gpc-spin" /> Finding the call…
            The first call of the day can take up to a minute.
          </span>
        </div>
      )}

      {room && (
        <div className="gpc-card gpc-join-preview">
          <div className="gpc-card-heading">
            <span>Call {spacedCode(room.code)}</span>
            {room.private && (
              <span className="gpc-invite-tag">
                <LockKeyhole size={12} aria-hidden="true" /> Private
              </span>
            )}
          </div>
          <h3>{room.categoryTitle}</h3>
          {room.prompt && <p>{room.prompt}</p>}
          <div className="gpc-room-meta">
            <span className="gpc-faces" aria-hidden="true">
              {room.members.slice(0, 4).map((m) => (
                <Avatar member={m} key={m.userId} />
              ))}
            </span>
            <span>
              {room.hostName ? `Hosted by ${room.hostName} · ` : ""}
              {room.members.length} of {room.max} in the call
            </span>
          </div>
        </div>
      )}

      {room && !allowed && (
        <>
          <div className="gpc-alert">
            <p>
              <Sprout size={18} aria-hidden="true" /> Group practice is part of{" "}
              {planNames}
            </p>
            <span>
              Upgrade to join this call and practise live with others.
            </span>
          </div>
          <button
            className="gpc-primary"
            onClick={() =>
              navigate("/app/membership", { state: { reason: "group" } })
            }
          >
            Explore membership
          </button>
        </>
      )}

      {room && allowed && timeUp && <TimeUpNote />}

      {room && allowed && !timeUp && (
        <button
          className="gpc-primary"
          disabled={full}
          onClick={() =>
            navigate(`${CALL}/${room.id}`, {
              state: {
                autoJoin: true,
                code: room.code,
                preview: {
                  categoryTitle: room.categoryTitle,
                  hostName: room.hostName,
                  private: room.private,
                },
              },
            })
          }
        >
          <Mic size={18} /> {full ? "This call is full" : "Join the call"}
        </button>
      )}

      {(lookup.status === "idle" || lookup.status === "error") && (
        <div className="gpc-card">
          <CodeForm
            key={code}
            initial={code}
            error={lookup.status === "error" ? lookup.error : ""}
            onSubmit={submit}
          />
        </div>
      )}

      {room && (
        <button className="gpc-link gpc-center" onClick={() => navigate(JOIN)}>
          Use a different code
        </button>
      )}
    </div>
  );
}

function TimeUpNote() {
  return (
    <div className="gpc-alert gpc-alert-warn" role="alert">
      <p>
        <ClockAlert size={18} aria-hidden="true" /> Your practice time is up
      </p>
      <span>
        You&apos;ve used all your group practice minutes for this month. They
        reset on the 1st.
      </span>
    </div>
  );
}
