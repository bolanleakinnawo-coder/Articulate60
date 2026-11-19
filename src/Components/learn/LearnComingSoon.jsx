// Learn tab before launch: a countdown to LEARN_LAUNCH_AT. When it reaches
// zero, onLaunch() swaps in the shop without a reload.
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { LEARN_LAUNCH_AT } from "../../data/learn";
import { getStoredUser } from "../../data/plans";
import { splitTimeLeft } from "../../lib/learn";

const LAUNCH_MS = new Date(LEARN_LAUNCH_AT).getTime();
const pad = (n) => String(n).padStart(2, "0");

export default function LearnComingSoon({ onLaunch }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = LAUNCH_MS - now;
  useEffect(() => {
    if (left <= 0) onLaunch();
  }, [left, onLaunch]);

  // Their username as they typed it, always starting with a capital letter.
  const typed = (getStoredUser()?.username || "").trim();
  const username = typed ? typed.charAt(0).toUpperCase() + typed.slice(1) : "";
  const t = splitTimeLeft(left);
  const launchDay = new Date(LAUNCH_MS).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });

  return (
    <div className="learn-content lx-page">
      <header className="learn-header">
        <h1 className="learn-title">Learn</h1>
        <p className="learn-subtitle lx-cs-subtitle">
          Build the skills to communicate better.
        </p>
      </header>

      {/* Round 11 (Sheriff's pick, option 2): one soft card, centred in the
          space under the heading, with seconds on the timer. */}
      <div className="lx-cs-stage">
      <section className="lx-cs lx-cs-card" aria-labelledby="lx-cs-title">
        <span className="lx-cs-icon" aria-hidden="true">
          <BookOpen size={26} />
        </span>
        <span className="lx-cs-pill">Coming soon</span>
        <h2 id="lx-cs-title" className="lx-cs-title">
          There&apos;s a lot to learn about communication
          {username ? `, ${username}` : ""}.
        </h2>
        <p className="lx-cs-text">
          And we&apos;re bringing some of it right here. Get ready for practical
          resources you can learn from and put into practice.
        </p>

        <hr className="lx-cs-divider" />
        <p className="lx-cs-label">Launching in</p>
        <div className="lx-cs-timer" role="timer" aria-label={`Launching on ${launchDay}`}>
          {[
            [t.days, "Days"],
            [t.hours, "Hours"],
            [t.minutes, "Mins"],
            [t.seconds, "Secs"],
          ].map(([value, label]) => (
            <div className="lx-cs-box" key={label}>
              <strong>{pad(value)}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}
