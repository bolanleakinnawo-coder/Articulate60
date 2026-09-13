import {
  Trophy,
  User,
  Ban,
  Pause,
  Target,
  ShieldCheck,
  Brain,
  Lock,
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

        <button className="challenges-profile-btn" aria-label="Profile">
          <User size={20} strokeWidth={1.8} />
        </button>
      </div>

      <div className="challenges-hero-card">
        <h2 className="challenges-hero-title">
          You're not just taking on <span>challenges</span>
        </h2>

        <div className="challenges-hero-benefits">
          <div className="challenges-hero-benefit">
            <p className="challenges-benefit-label">LIVE MASTERCLASS</p>
            <p className="challenges-benefit-copy">
              Join a live session before each challenge begins.
            </p>
          </div>

          <div className="challenges-hero-benefit">
            <p className="challenges-benefit-label">CERTIFICATION</p>
            <p className="challenges-benefit-copy">
              Earn proof of certification.
            </p>
          </div>

          <div className="challenges-hero-benefit">
            <p className="challenges-benefit-label">COMPLETION BONUS</p>
            <p className="challenges-benefit-copy">
              Finish the challenge and unlock your reward.
            </p>
          </div>
        </div>
      </div>

      <section className="challenges-list-section">
        <p className="eyebrow challenges-eyebrow">FEATURED CHALLENGES</p>
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
