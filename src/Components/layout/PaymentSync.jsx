// Makes payments land on their own. When the app opens (and when it comes
// back to the front), the server checks this account's unconfirmed Paystack
// payments and applies any that went through. A live message from the server
// does the same the moment a webhook lands. Either way a short notice says
// what was added.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Sparkles, X } from "lucide-react";
import { getPlan, getStoredUser, refreshPlanFromServer, syncPendingPayments } from "../../data/plans";
import { PRODUCTS } from "../../data/learn";
import { getSocket } from "../../lib/realtime";
import "../../styles/GroupCall.css";

const MIN_GAP_MS = 60 * 1000;

function noticeFor(applied) {
  const book = applied.find((p) => p.kind === "book");
  const plan = applied.find((p) => p.kind !== "book");
  if (plan) {
    const name = getPlan(getStoredUser()).name;
    return {
      icon: Sparkles,
      title: "Payment received",
      body: `${name} is now active on your account.`,
      action: "View plan",
      url: "/app/membership",
    };
  }
  if (book) {
    return {
      icon: BookOpen,
      title: "Payment received",
      body: `${PRODUCTS[book.productId]?.title || "Your book"} is in your library.`,
      action: "Open library",
      url: "/app/learn?tab=library",
    };
  }
  return null;
}

export default function PaymentSync() {
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let last = 0;
    const run = () => {
      if (Date.now() - last < MIN_GAP_MS) return;
      last = Date.now();
      syncPendingPayments();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    const onApplied = (e) => {
      const n = noticeFor(e.detail || []);
      if (n) setNotice(n);
    };
    const onLive = async (p) => {
      if (p?.kind !== "book") await refreshPlanFromServer();
      // Membership and Learn show their own confirmation after the pop-up.
      if (/^\/app\/(membership|learn)/.test(window.location.pathname)) return;
      const n = noticeFor([p || {}]);
      if (n) setNotice(n);
    };
    run();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("loquiex:payments-applied", onApplied);
    const socket = getSocket();
    socket?.on("payment:applied", onLive);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("loquiex:payments-applied", onApplied);
      socket?.off("payment:applied", onLive);
    };
  }, []);

  if (!notice) return null;
  const Icon = notice.icon;
  const open = () => {
    setNotice(null);
    navigate(notice.url);
  };
  return (
    <div className="callbar" role="status">
      <Icon size={16} aria-hidden="true" />
      <button type="button" className="callbar-text" onClick={open}>
        <strong>{notice.title}</strong>
        <span>{notice.body}</span>
      </button>
      <button type="button" className="callbar-return" onClick={open}>
        {notice.action}
      </button>
      <button type="button" className="callbar-icon" onClick={() => setNotice(null)} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
