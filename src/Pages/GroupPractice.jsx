import { useEffect, useMemo, useRef, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  AudioLines,
  CalendarClock,
  Check,
  Clock,
  ClockAlert,
  Copy,
  Crown,
  Globe,
  Hand,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MessagesSquare,
  Mic,
  MicOff,
  PhoneOff,
  Plus,
  RefreshCw,
  Share2,
  Shuffle,
  Sprout,
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
import "../styles/GroupCall.css";

const LOBBY = "/app/group-practice/room";
const JOIN = "/app/group-practice/join";

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
                Join an open room or start your own when you&apos;re ready.
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

// Open rooms + start a room. Flourish and Infinity members only.
export function GroupPracticeRoom() {
  const navigate = useNavigate();
  const [usage] = useGroupUsage();
  const [rooms, setRooms] = useState([]);
  const [connection, setConnection] = useState("connecting");
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [prompt, setPrompt] = useState(() => getRandomPrompt(CATEGORIES[0].id));
  const [isPrivate, setIsPrivate] = useState(true);

  useEffect(() => {
    if (!hasGroupPractice()) navigate("/app/group-practice", { replace: true });
  }, [navigate]);

  useEffect(() => watchRooms(setRooms, setConnection), []);

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const pickCategory = (id) => {
    setCategoryId(id);
    setPrompt(getRandomPrompt(id));
  };

  if (usage.loaded && usage.total === 0) {
    return <Navigate to="/app/group-practice" replace />;
  }
  if (usage.loaded && usage.left !== null && usage.left <= 0) {
    return <TimeUp onBack={() => navigate("/app/practice")} />;
  }

  const startRoom = () =>
    navigate(`${LOBBY}/new`, {
      state: {
        create: {
          categoryId,
          categoryTitle: category?.title || "Open conversation",
          prompt,
          private: isPrivate,
        },
      },
    });

  const offline = connection !== "connected";

  return (
    <div className="page gpc-page">
      <button
        className="gpc-back"
        onClick={() => navigate("/app/practice?tab=group")}
      >
        <ArrowLeft size={16} /> Back to Practice
      </button>
      <p className="gpc-eyebrow">Group practice</p>
      <h1 className="gpc-title">Speak with others, live.</h1>
      <p className="gpc-sub">
        Audio-only rooms of up to six members. Join an open room, start one on a
        topic you like, or start a private call and invite friends with a code.
      </p>

      <Allowance usage={usage} />

      <h2 className="gpc-section-title">Have a code?</h2>
      <div className="gpc-card">
        <p className="gpc-card-text">
          <KeyRound size={18} aria-hidden="true" />
          Enter the code a friend shared to join their call.
        </p>
        <CodeForm
          onSubmit={(code) => navigate(`${JOIN}/${code}`)}
          busy={false}
        />
      </div>

      <h2 className="gpc-section-title">Open rooms</h2>
      {offline ? (
        <div className="gpc-empty">
          <span className="gpc-status">
            {connection === "signed-out" ? (
              <>
                <WifiOff size={16} /> Please sign in again to join group
                practice.
              </>
            ) : (
              <>
                <LoaderCircle size={16} className="gpc-spin" /> Connecting to
                group practice. This can take up to a minute the first time.
              </>
            )}
          </span>
        </div>
      ) : rooms.length === 0 ? (
        <div className="gpc-empty">
          No rooms are open right now. Start one below and others can join you.
        </div>
      ) : (
        <div className="gpc-rooms">
          {rooms.map((room) => {
            const full = room.members.length >= room.max;
            return (
              <article className="gpc-room" key={room.id}>
                <div className="gpc-room-body">
                  <h3>{room.categoryTitle}</h3>
                  {room.prompt && <p>{room.prompt}</p>}
                  <div className="gpc-room-meta">
                    <span className="gpc-faces" aria-hidden="true">
                      {room.members.slice(0, 4).map((m) => (
                        <Avatar member={m} key={m.userId} />
                      ))}
                    </span>
                    <span>
                      {room.members.length} of {room.max} speaking
                    </span>
                  </div>
                </div>
                <button
                  className="gpc-secondary"
                  disabled={full}
                  onClick={() =>
                    navigate(`${LOBBY}/${room.id}`, {
                      state: { autoJoin: true },
                    })
                  }
                >
                  {full ? "Full" : "Join"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <h2 className="gpc-section-title">Start a room</h2>
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
            aria-checked={isPrivate}
            className="gpc-visibility-option"
            onClick={() => setIsPrivate(true)}
          >
            <LockKeyhole size={18} aria-hidden="true" />
            <span>
              <strong>Private call</strong>
              <span>Only people with your code can join.</span>
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!isPrivate}
            className="gpc-visibility-option"
            onClick={() => setIsPrivate(false)}
          >
            <Globe size={18} aria-hidden="true" />
            <span>
              <strong>Open room</strong>
              <span>Listed under Open rooms for any member.</span>
            </span>
          </button>
        </div>
        <p className="gpc-field-label">Topic</p>
        <div className="gpc-chips" role="group" aria-label="Topic">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className="gpc-chip"
              aria-pressed={c.id === categoryId}
              onClick={() => pickCategory(c.id)}
            >
              {c.title}
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
          className="gpc-link"
          style={{ margin: "0 0 16px" }}
          onClick={() => setPrompt(getRandomPrompt(categoryId))}
        >
          <Shuffle size={14} /> Another prompt
        </button>
        <button className="gpc-primary" disabled={offline} onClick={startRoom}>
          <Plus size={18} />{" "}
          {isPrivate ? "Start a private call" : "Start an open room"}
        </button>
      </div>
      <p className="gpc-note">
        Group practice uses your microphone. Calls are not recorded. Use
        headphones if you can, so others don&apos;t hear an echo.
      </p>
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

// A live call. Reached from the rooms list (join) or "Start a room".
export function GroupPracticeCall() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  const createRef = useRef(location.state?.create || null);
  const codeRef = useRef(location.state?.code || null);
  const callRef = useRef(null);
  const [call, setCall] = useState(null);
  const [dismissed, setDismissed] = useState(null);
  const [ready, setReady] = useState(
    Boolean(location.state?.autoJoin || location.state?.create),
  );

  useEffect(() => {
    if (!hasGroupPractice()) navigate("/app/group-practice", { replace: true });
  }, [navigate]);

  // Start (or join) the call once the member has tapped to join.
  useEffect(() => {
    if (!ready) return undefined;
    if (roomId === "new" && !createRef.current) {
      navigate(LOBBY, { replace: true });
      return undefined;
    }
    const session = new GroupCall((snap) => setCall(snap));
    callRef.current = session;
    session.join(
      createRef.current
        ? { create: createRef.current }
        : codeRef.current
          ? { code: codeRef.current }
          : { roomId },
    );
    return () => {
      session.leave();
      callRef.current = null;
    };
    // Join once per tap; the URL is updated below without rejoining.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Keep the URL on the real room id (shareable, and survives refresh).
  const liveRoomId = call?.room?.id;
  useEffect(() => {
    if (liveRoomId && liveRoomId !== roomId) {
      createRef.current = null;
      codeRef.current = null;
      navigate(`${LOBBY}/${liveRoomId}`, { replace: true, state: {} });
    }
  }, [liveRoomId, roomId, navigate]);

  const leave = () => {
    callRef.current?.leave();
    navigate(LOBBY);
  };

  // Call controls (they read the live session when tapped).
  const actions = useMemo(
    () => ({
      setMuted: (v) => callRef.current?.setMuted(v),
      setHand: (v) => callRef.current?.setHand(v),
      setPrompt: (p, c) => callRef.current?.setPrompt(p, c),
      resumeAudio: () => callRef.current?.resumeAudio(),
    }),
    [],
  );

  // Not joined yet (opened from a link or after a refresh).
  if (!ready) {
    return (
      <div className="page gpc-page">
        <button className="gpc-back" onClick={() => navigate(LOBBY)}>
          <ArrowLeft size={16} /> All rooms
        </button>
        <p className="gpc-eyebrow">Group practice</p>
        <h1 className="gpc-title">Ready to join?</h1>
        <p className="gpc-sub">
          You&apos;ll join with your microphone on. You can mute any time.
        </p>
        <button className="gpc-primary" onClick={() => setReady(true)}>
          <Mic size={18} /> Join the room
        </button>
      </div>
    );
  }

  if (call?.status === "ended") {
    const code = call.endReason?.code;
    if (code === "time-up")
      return <TimeUp onBack={() => navigate("/app/practice")} />;
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
              : "Pick another room or start your own."}
          </p>
          <button className="gpc-primary" onClick={() => navigate(LOBBY)}>
            Back to rooms
          </button>
        </div>
      </div>
    );
  }

  if (!call || call.status !== "live") {
    return (
      <div className="page gpc-page">
        <button className="gpc-back" onClick={leave}>
          <ArrowLeft size={16} /> All rooms
        </button>
        <div className="gpc-empty">
          <span className="gpc-status">
            <LoaderCircle size={16} className="gpc-spin" /> Joining the room…
            The first call of the day can take up to a minute.
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

function LiveCall({ call, session, joinedAt, dismissed, onDismiss, onLeave }) {
  const { room, members, usage } = call;
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

  const newPrompt = () => {
    const next = getRandomPrompt(room.categoryId);
    if (next) {
      const category = CATEGORIES.find((c) => c.id === room.categoryId);
      session?.setPrompt(next, category);
    }
  };

  return (
    <div className="page gpc-page">
      <div className="gpc-call-head">
        <div>
          <p className="gpc-eyebrow">Group practice</p>
          <h1 className="gpc-title">{room.categoryTitle}</h1>
          <p className="gpc-sub">
            {members.length} of {room.max} in the room
          </p>
        </div>
        {warning ? (
          <span className="gpc-pill gpc-pill-warn">{left} min left</span>
        ) : (
          <span className="gpc-pill">
            <span className="gpc-live-dot" /> LIVE <Elapsed since={joinedAt} />
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

      {call.micError && (
        <div className="gpc-alert" role="alert">
          <p>
            <MicOff size={18} aria-hidden="true" /> Others can&apos;t hear you
          </p>
          <span>{call.micError}</span>
        </div>
      )}

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

      {alone && (
        <div className="gpc-alert">
          <p>
            <Users size={18} aria-hidden="true" /> Waiting for others to join
          </p>
          <span>
            {room.private
              ? "Share your call code below so friends can join. Minutes only count once someone else is here."
              : "Your room is listed under Open rooms. Minutes only count once someone else is here."}
          </span>
        </div>
      )}

      {room.code && (
        <InviteCard
          code={room.code}
          isPrivate={room.private}
          topic={room.categoryTitle}
          full={members.length >= room.max}
        />
      )}

      <div className="gpc-members">
        {sorted.map((m) => {
          const waiting = !m.isSelf && m.connection !== "connected";
          return (
            <div
              key={m.userId}
              className={`gpc-member ${m.speaking ? "gpc-speaking" : ""} ${waiting ? "gpc-waiting" : ""}`}
            >
              <span className="gpc-member-icons">
                {m.hand && (
                  <Hand
                    size={16}
                    className="gpc-hand"
                    aria-label="Hand raised"
                  />
                )}
                {m.muted && <MicOff size={16} aria-label="Muted" />}
                {room.hostId === m.userId && (
                  <Crown size={16} aria-label="Host" />
                )}
              </span>
              <Avatar member={m} self={m.isSelf} />
              <span className="gpc-member-name">
                {m.isSelf ? "You" : m.name}
              </span>
              <span className="gpc-member-tag">
                {waiting
                  ? m.connection === "failed"
                    ? "Can't connect"
                    : "Connecting…"
                  : m.speaking
                    ? "Speaking"
                    : m.hand
                      ? "Hand raised"
                      : room.hostId === m.userId
                        ? "Host"
                        : "Listening"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="gpc-card gpc-prompt-card">
        <div className="gpc-card-heading">
          <span>Prompt</span>
          {call.isHost && room.categoryId && (
            <button className="gpc-link" onClick={newPrompt}>
              <Shuffle size={14} /> New prompt
            </button>
          )}
        </div>
        <p>{room.prompt || "Talk about anything on your mind today."}</p>
      </div>

      <div className="gpc-controls">
        <button
          onClick={() => session?.setMuted(!call.muted)}
          aria-label={call.muted ? "Unmute" : "Mute"}
          aria-pressed={call.muted}
          disabled={Boolean(call.micError)}
        >
          {call.muted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <button
          onClick={() => session?.setHand(!call.hand)}
          aria-label={call.hand ? "Lower hand" : "Raise hand"}
          aria-pressed={call.hand}
        >
          <Hand size={22} />
        </button>
        <button className="gpc-leave" onClick={onLeave} aria-label="Leave call">
          <PhoneOff size={22} />
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
          : "Friends enter this code under Group practice, or open the link you share. They need Loquiex Flourish or Infinity to join."}
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
        onClick={() => navigate(allowed ? LOBBY : "/app/practice?tab=group")}
      >
        <ArrowLeft size={16} /> {allowed ? "All rooms" : "Back to Practice"}
      </button>
      <p className="gpc-eyebrow">Group practice</p>
      <h1 className="gpc-title">
        {room ? "You're invited to a call" : "Join with a code"}
      </h1>
      <p className="gpc-sub">
        {room
          ? "Check the details, then join with your microphone on. You can mute any time."
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
            navigate(`${LOBBY}/${room.id}`, {
              state: { autoJoin: true, code: room.code },
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
