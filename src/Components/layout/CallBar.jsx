// Shown at the top of every app page while the member is in a group call
// and not on the call screen, so moving to Home, Profile... never ends the
// call. Also shows "starting soon" reminders for planned practices.
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarClock, Mic, MicOff, PhoneOff, X } from "lucide-react";
import {
  callActions,
  clearEndedCall,
  leaveCall,
  roomTitle,
  useActiveCall,
} from "../../lib/activeCall";
import { getSocket } from "../../lib/realtime";
import "../../styles/GroupCall.css";

const CALL_PATH = "/app/group-practice/room/";

function Elapsed({ since }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - (since || now)) / 1000));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

export default function CallBar() {
  const call = useActiveCall();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [reminder, setReminder] = useState(null);

  // "Your practice starts in 10 min" while the app is open.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onReminder = (r) => setReminder(r);
    socket.on("group:reminder", onReminder);
    return () => socket.off("group:reminder", onReminder);
  }, []);

  const onCallPage = pathname.startsWith(CALL_PATH);

  if (call && !onCallPage) {
    const roomId = call.room?.id;
    const back = () => navigate(roomId ? `${CALL_PATH}${roomId}` : CALL_PATH + "new");
    if (call.status === "ended") {
      return (
        <div className="callbar callbar-ended" role="status">
          <PhoneOff size={16} aria-hidden="true" />
          <span className="callbar-text">
            <strong>Your group call ended</strong>
            <span>
              {call.endReason?.code === "time-up"
                ? "Your group minutes for this month are used up."
                : "You can start or join another practice."}
            </span>
          </span>
          <button
            type="button"
            className="callbar-icon"
            onClick={clearEndedCall}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      );
    }
    const title = roomTitle(call.room) || "Group practice";
    return (
      <div className="callbar" role="status">
        <span className="gpc-live-dot" aria-hidden="true" />
        <button type="button" className="callbar-text" onClick={back}>
          <strong>
            {call.status === "live" ? "You're on a call" : "Joining call…"}
            {call.status === "live" && (
              <>
                {" · "}
                <Elapsed since={call.joinedAt} />
              </>
            )}
          </strong>
          <span>{title}</span>
        </button>
        {call.status === "live" && (
          <button
            type="button"
            className="callbar-icon"
            onClick={() =>
              call.muted
                ? call.hasMic
                  ? callActions.setMuted(false)
                  : callActions.enableMic()
                : callActions.setMuted(true)
            }
            aria-label={call.muted ? "Unmute" : "Mute"}
            aria-pressed={call.muted}
          >
            {call.muted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
        <button type="button" className="callbar-return" onClick={back}>
          Return
        </button>
        <button
          type="button"
          className="callbar-icon callbar-leave"
          onClick={leaveCall}
          aria-label="Leave call"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    );
  }

  if (reminder && !call) {
    return (
      <div className="callbar" role="status">
        <CalendarClock size={16} aria-hidden="true" />
        <button
          type="button"
          className="callbar-text"
          onClick={() => {
            setReminder(null);
            navigate("/app/practice?tab=group");
          }}
        >
          <strong>
            {reminder.isHost
              ? "Your group practice starts soon"
              : "A group practice starts soon"}
          </strong>
          <span>{reminder.title}</span>
        </button>
        <button
          type="button"
          className="callbar-return"
          onClick={() => {
            setReminder(null);
            navigate("/app/practice?tab=group");
          }}
        >
          Open
        </button>
        <button
          type="button"
          className="callbar-icon"
          onClick={() => setReminder(null)}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    );
  }
  return null;
}
