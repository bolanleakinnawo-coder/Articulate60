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
  CalendarClock,
  ChevronRight,
  Clock,
  ClockAlert,
  Crown,
  Globe,
  Bell,
  BellRing,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Hand,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  MessagesSquare,
  Mic,
  MicOff,
  PencilLine,
  PhoneOff,
  Plus,
  PlusCircle,
  RefreshCw,
  Shuffle,
  Sprout,
  Target,
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
  lookupCode,
  normaliseCode,
  watchRooms,
} from "../lib/groupCall";
import { micHelp, micPermissionState, requestMic } from "../lib/microphone";
import {
  activeSession,
  callActions,
  cancelScheduled,
  clearEndedCall,
  fetchScheduled,
  leaveCall,
  roomMeta,
  roomTitle,
  schedulePractice,
  setReminder,
  startCall,
  useActiveCall,
} from "../lib/activeCall";
import "../styles/GroupCall.css";

// The Group Practice tab on Practice is the lobby (live public rooms).
const LOBBY = "/app/practice?tab=group";
const START = "/app/group-practice/start";
const CALL = "/app/group-practice/room";
const JOIN = "/app/group-practice/join";


function categoryOf(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

const SEAT_CHOICES = [2, 3, 4, 5, 6];

const IS_IOS =
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

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

// "Sat 8 Nov, 18:00" in the member's own time.
function formatWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  })}, ${time}`;
}

// Live room card (Example 1 / Example 2): the host's own topic, or the
// Loquiex prompt with its category underneath.
function RoomCard({ room, onJoin }) {
  const full = seatsLeft(room) === 0;
  return (
    <article className="gpt-room">
      <div className="gpt-room-top">
        <span className="gpt-badge">
          <span className="gpc-live-dot" aria-hidden="true" /> Live · Public
        </span>
        <span className="gpt-seats">
          {room.members.length}/{room.max} seats filled
        </span>
      </div>
      <h4 className="gpt-room-title">{roomTitle(room)}</h4>
      <p className="gpt-room-meta">{roomMeta(room)}</p>
      <div className="gpt-room-foot">
        <button
          type="button"
          className="gpt-room-join"
          disabled={full}
          onClick={() => onJoin(room)}
        >
          <Users size={16} aria-hidden="true" />
          {full
            ? "Full right now"
            : room.mode === "host"
              ? "Join this discussion"
              : "Join this practice"}
        </button>
        <span className="gpt-room-host">Host: {room.hostName || "Member"}</span>
      </div>
    </article>
  );
}

// A practice planned for later.
function PlannedCard({ item, onRemind, onStart, onCancel, busy }) {
  return (
    <article className="gpt-room gpt-planned">
      <div className="gpt-room-top">
        <span className="gpt-badge gpt-badge-soon">
          <CalendarDays size={13} aria-hidden="true" />
          {formatWhen(item.startsAt)}
        </span>
        <span className="gpt-seats">
          {item.private ? "Private" : "Public"} · {item.max} seats
        </span>
      </div>
      <h4 className="gpt-room-title">{roomTitle(item)}</h4>
      <p className="gpt-room-meta">
        {roomMeta(item)}
        {item.isHost ? "" : ` · Host: ${item.hostName || "Member"}`}
      </p>
      {item.isHost ? (
        <>
          <p className="gpt-planned-code">
            Invite code <strong>{spacedCode(item.code)}</strong>
            {item.reminderCount > 0 &&
              ` · ${item.reminderCount} ${item.reminderCount === 1 ? "person" : "people"} will be reminded`}
          </p>
          <div className="gpt-planned-actions">
            <button
              type="button"
              className="gpt-join"
              onClick={() => onStart(item)}
            >
              {item.liveRoomId ? "Return to call" : "Start now"}
            </button>
            {!item.liveRoomId && (
              <button
                type="button"
                className="gpt-text-button"
                disabled={busy}
                onClick={() => onCancel(item)}
              >
                Cancel
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="gpt-room-foot">
          <button
            type="button"
            className="gpt-room-join"
            aria-pressed={item.reminded}
            disabled={busy}
            onClick={() => onRemind(item)}
          >
            {item.reminded ? (
              <BellRing size={16} aria-hidden="true" />
            ) : (
              <Bell size={16} aria-hidden="true" />
            )}
            {item.reminded ? "Reminder set" : "Remind me"}
          </button>
        </div>
      )}
    </article>
  );
}

// Practice > Group Practice. Live public rooms from the server, practices
// planned for later, and the member's own planned practices. Joining needs
// Flourish or Infinity (others are shown the membership page).
export function GroupPracticeTab() {
  const navigate = useNavigate();
  const allowed = hasGroupPractice();
  const [rooms, setRooms] = useState([]);
  const [connection, setConnection] = useState("connecting");
  const [filter, setFilter] = useState("all");
  const [planned, setPlanned] = useState({ upcoming: [], mine: [] });
  const [busyId, setBusyId] = useState(null);

  useEffect(() => watchRooms(setRooms, setConnection), []);

  // Planned practices: on open, every minute, and when the live list
  // changes (a planned practice may just have started).
  const roomsKey = rooms.map((r) => r.id).join(",");
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchScheduled().then((data) => {
        if (alive && data) setPlanned(data);
      });
    const first = setTimeout(load, roomsKey ? 600 : 0);
    const timer = setInterval(load, 60 * 1000);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [roomsKey]);

  const shown = rooms.filter((room) =>
    filter === "open"
      ? seatsLeft(room) > 0
      : filter === "nearly-full"
        ? isNearlyFull(room)
        : true,
  );
  const upcoming = planned.upcoming.filter(
    (item) => !item.isHost && !item.liveRoomId,
  );

  const locked = () => navigate("/app/group-practice");
  const joinRoom = (room) =>
    allowed
      ? navigate(`${CALL}/${room.id}`, {
          state: {
            autoJoin: true,
            preview: {
              title: roomTitle(room),
              meta: roomMeta(room),
              hostName: room.hostName,
              private: room.private,
            },
          },
        })
      : locked();

  const remind = async (item) => {
    if (!allowed) return locked();
    setBusyId(item.id);
    const updated = await setReminder(item.id, !item.reminded);
    setBusyId(null);
    if (updated)
      setPlanned((p) => ({
        ...p,
        upcoming: p.upcoming.map((x) => (x.id === updated.id ? updated : x)),
      }));
  };

  const startPlanned = (item) =>
    navigate(item.liveRoomId ? `${CALL}/${item.liveRoomId}` : `${CALL}/new`, {
      state: item.liveRoomId
        ? { preview: { title: roomTitle(item), meta: roomMeta(item) } }
        : {
            create: { scheduledId: item.id },
            preview: {
              title: roomTitle(item),
              meta: roomMeta(item),
              private: item.private,
            },
          },
    });

  const cancelPlanned = async (item) => {
    if (!window.confirm("Cancel this planned practice?")) return;
    setBusyId(item.id);
    const ok = await cancelScheduled(item.id);
    setBusyId(null);
    if (ok)
      setPlanned((p) => ({
        upcoming: p.upcoming.filter((x) => x.id !== item.id),
        mine: p.mine.filter((x) => x.id !== item.id),
      }));
  };

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
            <span>Start now or schedule one for later.</span>
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

      {planned.mine.length > 0 && (
        <section aria-labelledby="gpt-mine-title">
          <hr className="gpt-divider" />
          <h3 className="gpt-section-title" id="gpt-mine-title">
            Your planned practices
          </h3>
          <p className="gpt-section-sub">
            We&apos;ll remind you 10 minutes before. Start whenever you&apos;re
            ready.
          </p>
          <div className="gpt-rooms">
            {planned.mine.map((item) => (
              <PlannedCard
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onStart={startPlanned}
                onCancel={cancelPlanned}
              />
            ))}
          </div>
        </section>
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
            {shown.map((room) => (
              <RoomCard key={room.id} room={room} onJoin={joinRoom} />
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="gpt-upcoming-title">
          <h3
            className="gpt-section-title gpt-section-spaced"
            id="gpt-upcoming-title"
          >
            Upcoming
          </h3>
          <p className="gpt-section-sub">
            Planned by other members. Tap Remind me and we&apos;ll let you know
            10 minutes before.
          </p>
          <div className="gpt-rooms">
            {upcoming.map((item) => (
              <PlannedCard
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onRemind={remind}
              />
            ))}
          </div>
        </section>
      )}

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

// "2026-11-08" for a date input, in local time.
function dateInputValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultPlanDate() {
  const d = new Date();
  if (d.getHours() >= 17) d.setDate(d.getDate() + 1);
  return dateInputValue(d);
}

const MAX_PLAN_DAYS = 30;

// Start a practice: host your own topic or practise with Loquiex, who can
// join, seats, and now or later.
export function GroupPracticeStart() {
  const navigate = useNavigate();
  const [usage] = useGroupUsage();
  const [mode, setMode] = useState("host"); // host | guided
  const [topic, setTopic] = useState("");
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [prompt, setPrompt] = useState(() => getRandomPrompt(CATEGORIES[0].id));
  const [ownPrompt, setOwnPrompt] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [seats, setSeats] = useState(4);
  const [when, setWhen] = useState("now"); // now | later
  const [planDate, setPlanDate] = useState(defaultPlanDate);
  const [planTime, setPlanTime] = useState("18:00");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [planned, setPlanned] = useState(null);

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

  const details = () => {
    const firstPrompt =
      mode === "host" ? topic.trim() : ownPrompt.trim() || prompt || "";
    return {
      mode,
      topic: mode === "host" ? topic.trim() : "",
      categoryId,
      categoryTitle: category?.title || "Open conversation",
      prompt: firstPrompt,
      private: isPrivate,
      max: seats,
    };
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (mode === "host" && !topic.trim()) {
      setError("Type the topic you'd like to discuss.");
      return;
    }
    const create = details();
    if (when === "now") {
      navigate(`${CALL}/new`, {
        state: {
          create,
          preview: {
            title: roomTitle(create),
            meta: roomMeta(create),
            private: isPrivate,
          },
        },
      });
      return;
    }
    const startsAt = new Date(`${planDate}T${planTime}`);
    if (!planDate || !planTime || Number.isNaN(startsAt.getTime())) {
      setError("Choose a date and a start time.");
      return;
    }
    if (startsAt.getTime() < Date.now() + 60 * 1000) {
      setError("Pick a time later than now.");
      return;
    }
    setBusy(true);
    const result = await schedulePractice({
      ...create,
      startsAt: startsAt.toISOString(),
    });
    setBusy(false);
    if (result.ok) setPlanned(result.scheduled);
    else setError(result.message);
  };

  if (planned) {
    return (
      <div className="page gpc-page">
        <div className="gpc-ended">
          <span className="gpc-ended-icon" aria-hidden="true">
            <CalendarCheck size={26} />
          </span>
          <h1 className="gpc-title">Your practice is planned</h1>
          <p className="gpc-sub">
            {formatWhen(planned.startsAt)}. We&apos;ll remind you 10 minutes
            before, and you can start it from Group Practice.
          </p>
          <div className="gpc-card gpc-planned-summary">
            <strong>{roomTitle(planned)}</strong>
            <span>{roomMeta(planned)}</span>
            <span>
              {planned.private
                ? "Private: only people with your code can join."
                : "Public: listed under Upcoming for other members."}
            </span>
            <span className="gpc-planned-code">
              Invite code <strong>{spacedCode(planned.code)}</strong>
            </span>
          </div>
          <button className="gpc-primary" onClick={() => navigate(LOBBY)}>
            Back to Group Practice
          </button>
        </div>
      </div>
    );
  }

  const today = new Date();
  const lastDay = new Date();
  lastDay.setDate(today.getDate() + MAX_PLAN_DAYS);

  return (
    <div className="page gpc-page">
      <button className="gpc-back" onClick={() => navigate(LOBBY)}>
        <ArrowLeft size={16} /> Group Practice
      </button>
      <h1 className="gpc-title">Start a practice</h1>
      <p className="gpc-sub">
        Audio only, and calls are never recorded.
      </p>

      <Allowance usage={usage} />

      <form className="gpc-card" onSubmit={submit} noValidate>
        <p className="gpc-field-label" id="gpc-how-label">
          How would you like to practise?
        </p>
        <div
          className="gpc-modes"
          role="radiogroup"
          aria-labelledby="gpc-how-label"
        >
          <div
            className="gpc-mode"
            data-selected={mode === "host" ? "true" : undefined}
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "host"}
              className="gpc-mode-head"
              onClick={() => setMode("host")}
            >
              <MessageSquareText size={26} aria-hidden="true" />
              <span>
                <strong>Host a discussion</strong>
                <span>
                  Bring your own topic and let others join the conversation.
                </span>
              </span>
              <span className="gpc-radio" aria-hidden="true" />
            </button>
            {mode === "host" && (
              <div className="gpc-mode-body">
                <label className="gpc-field-label" htmlFor="gpc-topic">
                  Discussion topic
                </label>
                <textarea
                  id="gpc-topic"
                  className="gpc-input gpc-topic-input"
                  rows={2}
                  value={topic}
                  maxLength={200}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Are we becoming too dependent on technology?"
                  aria-invalid={Boolean(error) && !topic.trim()}
                />
                <small className="gpc-input-hint">
                  Members see this as the title when they look for a practice.
                </small>
              </div>
            )}
          </div>

          <div
            className="gpc-mode"
            data-selected={mode === "guided" ? "true" : undefined}
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "guided"}
              className="gpc-mode-head"
              onClick={() => setMode("guided")}
            >
              <Target size={26} aria-hidden="true" />
              <span>
                <strong>Practise with Loquiex</strong>
                <span>
                  Let Loquiex get the conversation started with categories and
                  discussion prompts.
                </span>
              </span>
              <span className="gpc-radio" aria-hidden="true" />
            </button>
          </div>
        </div>

        {mode === "guided" && (
          <div className="gpc-guided">
            <p className="gpc-field-label">Choose a category</p>
            <div className="gpc-chips" role="group" aria-label="Category">
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

            <p className="gpc-field-label">First prompt</p>
            <div
              className="gpc-prompt-preview"
              aria-live="polite"
              data-muted={ownPrompt.trim() ? "true" : undefined}
            >
              {prompt}
            </div>
            <button
              type="button"
              className="gpc-link"
              style={{ margin: "0 0 14px" }}
              onClick={() => setPrompt(getRandomPrompt(categoryId))}
            >
              <RefreshCw size={14} /> Another prompt
            </button>
            <div className="gpc-own-prompt">
              <PencilLine size={20} aria-hidden="true" />
              <div>
                <label htmlFor="gpc-own-prompt">
                  <strong>Write your own prompt</strong>
                  <span>Have something specific you&apos;d like to discuss?</span>
                </label>
                <input
                  id="gpc-own-prompt"
                  className="gpc-input"
                  value={ownPrompt}
                  maxLength={300}
                  onChange={(e) => setOwnPrompt(e.target.value)}
                  placeholder="Enter your discussion prompt..."
                />
              </div>
            </div>
          </div>
        )}

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

        <p className="gpc-field-label" id="gpc-when-label">
          When do you want to practise?
        </p>
        <div
          className="gpc-when"
          role="radiogroup"
          aria-labelledby="gpc-when-label"
        >
          <button
            type="button"
            role="radio"
            aria-checked={when === "now"}
            className="gpc-when-option"
            onClick={() => setWhen("now")}
          >
            Start now
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={when === "later"}
            className="gpc-when-option"
            onClick={() => setWhen("later")}
          >
            Schedule for later
          </button>
        </div>

        {when === "later" && (
          <div className="gpc-schedule">
            <label className="gpc-schedule-field">
              <span className="gpc-field-label">Date</span>
              <span className="gpc-input-icon">
                <CalendarDays size={18} aria-hidden="true" />
                <input
                  type="date"
                  className="gpc-input"
                  value={planDate}
                  min={dateInputValue(today)}
                  max={dateInputValue(lastDay)}
                  onChange={(e) => setPlanDate(e.target.value)}
                />
              </span>
            </label>
            <label className="gpc-schedule-field">
              <span className="gpc-field-label">Start time</span>
              <span className="gpc-input-icon">
                <Clock size={18} aria-hidden="true" />
                <input
                  type="time"
                  className="gpc-input"
                  value={planTime}
                  onChange={(e) => setPlanTime(e.target.value)}
                />
              </span>
            </label>
          </div>
        )}

        {error && (
          <p className="gpc-form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="gpc-primary" disabled={busy}>
          {busy ? (
            <LoaderCircle size={18} className="gpc-spin" />
          ) : when === "later" ? (
            <CalendarDays size={18} />
          ) : (
            <Plus size={18} />
          )}
          {when === "later"
            ? "Schedule practice"
            : isPrivate
              ? "Start a private practice"
              : "Start a public practice"}
        </button>
      </form>
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

// A live call. Reached from Find a practice, Start a practice, a code, or
// the call bar (when the member comes back from another tab). The call
// itself lives in lib/activeCall.js, so leaving this page doesn't end it.
export function GroupPracticeCall() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  const active = useActiveCall();
  // What to join, from the screen that opened this one (kept after the URL
  // changes to the real room id).
  const [entry] = useState(() => ({
    create: location.state?.create || null,
    code: location.state?.code || null,
    preview: location.state?.preview || null,
  }));
  // Coming back to the call we're already in (call bar, Back, or refresh
  // of the room address in the same tab)?
  const [resuming] = useState(() => {
    const snap = activeSession()?.snapshot();
    if (!snap || snap.status === "ended") return false;
    if (entry.create || entry.code) return false;
    return snap.room?.id === roomId || snap.status === "joining";
  });
  const pendingStream = useRef(null);
  // checking | ask | asking | blocked | ready | joined
  const [micStep, setMicStep] = useState(resuming ? "joined" : "checking");
  const [micError, setMicError] = useState(null);
  const [dismissed, setDismissed] = useState(null);

  const allowed = hasGroupPractice();
  const missingRoom = roomId === "new" && !entry.create && !resuming;

  const join = (stream) => {
    setMicStep("joined");
    startCall(
      entry.create
        ? { create: entry.create }
        : entry.code
          ? { code: entry.code }
          : { roomId },
      stream,
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
    if (!allowed || missingRoom || resuming) return undefined;
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
  }, [allowed, missingRoom, resuming]);

  // Mic was already allowed: join once it's ready.
  useEffect(() => {
    if (micStep === "ready" && pendingStream.current) {
      const stream = pendingStream.current;
      pendingStream.current = null;
      join(stream);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micStep]);

  // Only a microphone we asked for but never used is stopped here. The
  // call itself keeps going on other tabs.
  useEffect(
    () => () => {
      pendingStream.current?.getTracks().forEach((t) => t.stop());
      pendingStream.current = null;
    },
    [],
  );

  // Keep the URL on the real room id (shareable, and survives refresh).
  const liveRoomId = active?.room?.id;
  useEffect(() => {
    if (micStep === "joined" && liveRoomId && liveRoomId !== roomId) {
      navigate(`${CALL}/${liveRoomId}`, { replace: true, state: {} });
    }
  }, [micStep, liveRoomId, roomId, navigate]);

  const leave = () => {
    leaveCall();
    navigate(LOBBY);
  };
  const backToLobby = () => {
    clearEndedCall();
    navigate(LOBBY);
  };

  if (!allowed) return <Navigate to="/app/group-practice" replace />;
  if (missingRoom) return <Navigate to={START} replace />;

  if (micStep !== "joined") {
    const preview = entry.preview;
    return (
      <div className="page gpc-page">
        <button className="gpc-back" onClick={() => navigate(LOBBY)}>
          <ArrowLeft size={16} /> Group Practice
        </button>
        <h1 className="gpc-title gpc-title-call">
          {preview?.title || "Group practice"}
        </h1>
        <p className="gpc-sub">
          {preview
            ? `${preview.private ? "Private" : "Public"} · ${preview.meta || "Audio-only group"}${preview.hostName ? ` · Host: ${preview.hostName}` : ""}`
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
            title={preview?.title}
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

  // Left from somewhere else (e.g. the call bar) while this page was open.
  if (!active) return <Navigate to={LOBBY} replace />;

  if (active.status === "ended") {
    const code = active.endReason?.code;
    if (code === "time-up") return <TimeUp onBack={backToLobby} />;
    if (code === "no-plan") {
      clearEndedCall();
      return <Navigate to="/app/group-practice" replace />;
    }
    return (
      <div className="page gpc-page">
        <div className="gpc-ended">
          <span className="gpc-ended-icon" aria-hidden="true">
            <PhoneOff size={26} />
          </span>
          <h1 className="gpc-title">{END_COPY[code] || END_COPY.error}</h1>
          <p className="gpc-sub">
            {active.endReason?.message &&
            END_COPY[code] !== active.endReason.message
              ? active.endReason.message
              : "Pick another practice or start your own."}
          </p>
          <button className="gpc-primary" onClick={backToLobby}>
            Back to Group Practice
          </button>
        </div>
      </div>
    );
  }

  if (active.status !== "live") {
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
      call={active}
      session={callActions}
      dismissed={dismissed}
      onDismiss={setDismissed}
      onBack={() => navigate(LOBBY)}
      onLeave={leave}
    />
  );
}

function seatStatus(m) {
  if (m.away) return "Reconnecting…";
  if (!m.isSelf && m.connection !== "connected")
    return m.connection === "failed" ? "Can't connect" : "Connecting…";
  if (m.speaking) return "Speaking";
  if (m.hand) return "Hand raised";
  if (m.isSelf) return m.muted ? "Muted" : "Mic on";
  if (m.muted) return "Muted";
  return "Listening";
}

// The small invite code at the top of the call. Tapping it copies the code.
function CodePill({ code, isPrivate }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      className="gpc-code-pill"
      onClick={async () => setCopied(await copyText(code))}
      aria-label={`Invite code ${code.split("").join(" ")}. Tap to copy.`}
    >
      {isPrivate && <LockKeyhole size={12} aria-hidden="true" />}
      <span>{copied ? "Copied" : "Invite code"}</span>
      <strong>{spacedCode(code)}</strong>
    </button>
  );
}

// Minutes box at the top of the call.
function CallLimit({ usage, joinedAt, warning }) {
  const unlimited = !usage || usage.total === null;
  const pct = unlimited
    ? 0
    : Math.max(0, Math.min(100, (usage.left / Math.max(1, usage.total)) * 100));
  return (
    <div className={`gpc-limit ${warning ? "gpc-limit-warn" : ""}`}>
      <div className="gpc-limit-row">
        <Clock size={16} aria-hidden="true" />
        <span className="gpc-limit-label">Call time</span>
        <strong>
          {unlimited ? "Unlimited" : `${formatMinutes(usage.left)} left`}
        </strong>
        <span className="gpc-limit-timer">
          <span className="gpc-live-dot" aria-hidden="true" />
          <Elapsed since={joinedAt} />
        </span>
      </div>
      {!unlimited && (
        <span className="gpc-bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </span>
      )}
      <small>
        {formatMinutes(usage?.usedToday || 0)} used today
        {unlimited
          ? " · unlimited on your plan"
          : ` · ${formatMinutes(usage.usedThisMonth || 0)} of ${formatMinutes(usage.total)} this month`}
        . Minutes count only while someone else is in the call.
      </small>
    </div>
  );
}

// Host-only category switch: a native dropdown laid over the label.
function CategorySwitch({ value, onChange, children, className = "" }) {
  return (
    <label className={`gpc-cat-switch ${className}`}>
      {children}
      <ChevronDown size={18} aria-hidden="true" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Switch category"
      >
        {!categoryOf(value) && <option value={value}>Choose a category</option>}
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
    </label>
  );
}

function LiveCall({ call, session, dismissed, onDismiss, onBack, onLeave }) {
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
  // Host on the first row on their own, then everyone else two by two.
  const sorted = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.userId === room.hostId) return -1;
        if (b.userId === room.hostId) return 1;
        if (a.isSelf) return -1;
        if (b.isSelf) return 1;
        return a.joinedAt - b.joinedAt;
      }),
    [members, room.hostId],
  );
  const noMic = !call.hasMic;
  const micBlocked =
    noMic && call.micError && call.micError !== "listen-only";
  const hostLed = room.mode === "host";
  const category = categoryOf(room.categoryId);

  const switchCategory = (id) => {
    const next = categoryOf(id);
    const p = getRandomPrompt(id);
    if (next && p) session?.setPrompt(p, next);
  };

  const newPrompt = () => {
    const next = getRandomPrompt(room.categoryId || CATEGORIES[0].id);
    if (next) session?.setPrompt(next, category || CATEGORIES[0]);
  };

  const savePrompt = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    session?.setPrompt(text);
    setDraft("");
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

  const title = hostLed ? room.topic || room.categoryTitle : room.categoryTitle;

  return (
    <div className="page gpc-page gpc-call">
      <div className="gpc-call-top">
        <button className="gpc-back" onClick={onBack}>
          <ArrowLeft size={16} /> Group Practice
        </button>
        {room.code && <CodePill code={room.code} isPrivate={room.private} />}
      </div>

      <CallLimit usage={usage} joinedAt={call.joinedAt} warning={warning} />

      <div className="gpc-call-head">
        {!hostLed && call.isHost ? (
          <CategorySwitch value={room.categoryId} onChange={switchCategory}>
            <h1 className="gpc-title gpc-title-call">{title}</h1>
          </CategorySwitch>
        ) : (
          <h1 className="gpc-title gpc-title-call">{title}</h1>
        )}
        <p className="gpc-call-meta">
          {room.private ? "Private" : "Public"} ·{" "}
          {hostLed ? "Host-led discussion" : "Loquiex-guided"} ·{" "}
          {members.length}/{room.max} in call
        </p>
        {hostLed && call.isHost && (
          <CategorySwitch
            value={room.categoryId}
            onChange={switchCategory}
            className="gpc-cat-pill"
          >
            <span>
              Prompt ideas: <strong>{category?.title || "Choose"}</strong>
            </span>
          </CategorySwitch>
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
          <span>
            Tap Unmute when you want to speak. We&apos;ll ask for your
            microphone then.
          </span>
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

      <section className="gpc-people" aria-label="People in the call">
        {sorted.map((m) => {
          const waiting = !m.isSelf && m.connection !== "connected";
          const isHost = room.hostId === m.userId;
          return (
            <div
              key={m.userId}
              className={`gpc-person ${isHost ? "gpc-person-host" : ""} ${m.speaking ? "gpc-speaking" : ""} ${waiting || m.away ? "gpc-waiting" : ""}`}
            >
              <span className="gpc-member-icons">
                {m.hand && (
                  <Hand size={14} className="gpc-hand" aria-label="Hand raised" />
                )}
                {m.muted && <MicOff size={14} aria-label="Muted" />}
              </span>
              <Avatar member={m} self={m.isSelf} />
              <span className="gpc-member-name">
                {m.isSelf ? "You" : m.name}
              </span>
              <span className="gpc-member-tag">
                {isHost && (
                  <span className="gpc-host-tag">
                    <Crown size={12} aria-hidden="true" /> Host
                  </span>
                )}
                {m.isSelf && noMic ? "No microphone" : seatStatus(m)}
              </span>
            </div>
          );
        })}
      </section>

      <section className="gpc-discuss" aria-labelledby="gpc-discuss-title">
        <div className="gpc-discuss-head">
          <h2 id="gpc-discuss-title">Discussion prompt</h2>
          {call.isHost && !editing && (
            <div className="gpc-discuss-actions">
              <button type="button" onClick={newPrompt}>
                <Shuffle size={15} aria-hidden="true" /> Next prompt
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  setEditing(true);
                }}
              >
                <PencilLine size={15} aria-hidden="true" /> Write
              </button>
            </div>
          )}
        </div>
        {editing ? (
          <form onSubmit={savePrompt} className="gpc-discuss-form">
            <input
              className="gpc-input"
              value={draft}
              maxLength={300}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write the next prompt..."
              aria-label="Your prompt"
            />
            <div className="gpc-discuss-form-buttons">
              <button
                type="button"
                className="gpc-text-button"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="gpt-join"
                disabled={!draft.trim()}
              >
                Use prompt
              </button>
            </div>
          </form>
        ) : (
          <div className="gpc-discuss-box">
            <p>
              {room.prompt ||
                (hostLed ? room.topic : "Talk about anything on your mind today.")}
            </p>
            <span>
              {call.isHost
                ? "Share your opinion and explain why."
                : "Share your opinion and explain why. Raise your hand to speak next."}
            </span>
          </div>
        )}
      </section>

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
      {IS_IOS && (
        <p className="gpc-note gpc-ios-note">
          On iPhone, keep Loquiex open during the call. iPhone pauses apps in
          the background, so others can&apos;t hear you while you&apos;re away.
          Come back within 2 minutes and you&apos;ll rejoin automatically.
        </p>
      )}
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
      else if (reply?.error === "not-started" && reply.scheduled)
        setResult({ visit, status: "scheduled", planned: reply.scheduled });
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
          <h3>{roomTitle(room)}</h3>
          <p>{roomMeta(room)}</p>
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

      {lookup.status === "scheduled" && (
        <PlannedInvite planned={lookup.planned} allowed={allowed} />
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
                  title: roomTitle(room),
                  meta: roomMeta(room),
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

// A code for a practice planned for later: when it starts, and Remind me.
function PlannedInvite({ planned, allowed }) {
  const navigate = useNavigate();
  const [item, setItem] = useState(planned);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (!allowed)
      return navigate("/app/membership", { state: { reason: "group" } });
    setBusy(true);
    const updated = await setReminder(item.id, !item.reminded);
    setBusy(false);
    if (updated) setItem(updated);
  };
  return (
    <>
      <div className="gpc-card gpc-join-preview">
        <div className="gpc-card-heading">
          <span>Starts {formatWhen(item.startsAt)}</span>
          {item.private && (
            <span className="gpc-invite-tag">
              <LockKeyhole size={12} aria-hidden="true" /> Private
            </span>
          )}
        </div>
        <h3>{roomTitle(item)}</h3>
        <p>
          {roomMeta(item)} · Hosted by {item.hostName || "a member"} ·{" "}
          {item.max} seats
        </p>
      </div>
      {item.isHost ? (
        <button className="gpc-primary" onClick={() => navigate(LOBBY)}>
          Go to your planned practices
        </button>
      ) : (
        <button className="gpc-primary" onClick={toggle} disabled={busy}>
          {item.reminded ? <BellRing size={18} /> : <Bell size={18} />}
          {!allowed
            ? "Explore membership to join"
            : item.reminded
              ? "Reminder set · tap to remove"
              : "Remind me 10 minutes before"}
        </button>
      )}
      <p className="gpc-note">
        This practice hasn&apos;t started yet. Come back to this code when it
        starts.
      </p>
    </>
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
