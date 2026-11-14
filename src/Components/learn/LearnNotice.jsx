// In-app notice for Learn: "<item> is here" (after tapping Notify me) and
// "Your book is ready". Sent by the server over the live connection; the
// same message also goes to the member's phone when notifications are on.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, X } from "lucide-react";
import { getSocket } from "../../lib/realtime";
import "../../styles/GroupCall.css";

export default function LearnNotice() {
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = getSocket();
    const onNotice = (n) => setNotice(n);
    socket?.on("learn:notice", onNotice);
    return () => socket?.off("learn:notice", onNotice);
  }, []);

  if (!notice) return null;
  const open = () => {
    setNotice(null);
    navigate(notice.url || "/app/learn");
  };
  return (
    <div className="callbar" role="status">
      <BellRing size={16} aria-hidden="true" />
      <button type="button" className="callbar-text" onClick={open}>
        <strong>{notice.title}</strong>
        <span>{notice.body}</span>
      </button>
      <button type="button" className="callbar-return" onClick={open}>
        {notice.action || "Open"}
      </button>
      <button
        type="button"
        className="callbar-icon"
        onClick={() => setNotice(null)}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
