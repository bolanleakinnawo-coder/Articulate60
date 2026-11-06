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
  Clock,
  ClockAlert,
  Crown,
  Hand,
  LoaderCircle,
  LockKeyhole,
  MessagesSquare,
  Mic,
  MicOff,
  PhoneOff,
  Plus,
  RefreshCw,
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
import { GroupCall, watchRooms } from "../lib/groupCall";
import "../styles/GroupCall.css";

const LOBBY = "/app/group-practice/room";

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
        Audio-only rooms of up to six members. Join an open room or start one on
        a topic you like.
      </p>

      <Allowance usage={usage} />

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
          <Plus size={18} /> Start a room
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
      createRef.current ? { create: createRef.current } : { roomId },
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
            Your room is listed under Open rooms. Minutes only count once
            someone else is here.
          </span>
        </div>
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
