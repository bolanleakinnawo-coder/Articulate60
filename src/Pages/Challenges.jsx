import {
  Ban,
  Bell,
  Flag,
  Lock,
  Mountain,
  ShieldCheck,
  Target,
} from "lucide-react";

const CHALLENGES = [
  {
    id: "no-fillers",
    icon: Ban,
    title: "No Fillers",
    description: "Speak without saying um, uh, like, you know...",
    locked: true,
  },

  {
    id: "get-to-the-point",
    icon: Target,
    title: "Get to the Point",
    description: "Explain your idea without rambling.",
    locked: true,
  },
  {
    id: "speak-with-confidence",
    icon: ShieldCheck,
    title: "Speak with Confidence",
    description: "Say what you mean without constantly qualifying yourself.",
    locked: true,
  },
];

function ComingSoonCard() {
  return (
    <div className="challenge-card">
      <div className="challenge-card-orb challenge-card-orb-top-left" />
      <div className="challenge-card-orb challenge-card-orb-bottom-right" />
      <div className="challenge-card-orb challenge-card-orb-center" />

      <div className="challenge-card-content">
        <svg
          className="challenge-card-icon"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M32 10 L32 4"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path d="M32 4 L44 8 L32 12 Z" fill="currentColor" />
          <path
            d="M8 52 L26 20 L33 32 L38 25 L56 52 Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M20 40 L28 40 L31 35 L34 38 L38 32"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <p className="challenge-card-eyebrow">CHALLENGES</p>
        <h2 className="challenge-card-heading">Coming Soon</h2>
        <p className="challenge-card-copy">
          Exciting challenges are on the way to help you improve, grow and
          become a better communicator.
        </p>

        <button className="challenge-card-cta" type="button">
          <Bell size={16} strokeWidth={2} />
          Stay Tuned
        </button>
      </div>
    </div>
  );
}
export default function Challenges() {
  const handleChallengeClick = (challenge) => {
    if (challenge.locked) return;
    // navigate(`/challenges/${challenge.id}`) once challenges unlock
  };

  return (
    <div className="page challenges-page">
      <div className="challenges-header">
        <div className="challenges-header-text">
          <div className="challenges-title-row">
            <h1 className="challenges-title">Challenges</h1>
          </div>
          <p className="challenges-subtitle">
            Build better habits. Become a clearer, more confident speaker.
          </p>
        </div>
      </div>

      <ComingSoonCard />

      <section className="challenges-list-section">
        <p className="challenges-list-subtitle">
          A sneak peek of what's coming. Get ready to level up your speaking
          skills.
        </p>

        <div className="challenge-list">
          {CHALLENGES.map((challenge) => {
            const Icon = challenge.icon;
            return (
              <button
                key={challenge.id}
                className={`challenge-item ${challenge.locked ? "locked" : ""}`}
                onClick={() => handleChallengeClick(challenge)}
                disabled={challenge.locked}
              >
                <span className="challenge-item-icon">
                  <Icon size={20} strokeWidth={1.8} />
                </span>

                <span className="challenge-item-text">
                  <span className="challenge-item-title">
                    {challenge.title}
                  </span>
                  <span className="challenge-item-desc">
                    {challenge.description}
                  </span>
                </span>

                <span className="challenge-item-trailing">
                  {challenge.locked ? (
                    <span className="challenge-lock">
                      <Lock size={14} strokeWidth={2} />
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
