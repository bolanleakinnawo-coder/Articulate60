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

const CHALLENGES_HERO_COPY =
  "Take on focused speaking challenges designed to help you break bad habits, build better ones, and sound more confident — one step at a time.";

const CHALLENGES = [
  {
    id: "no-fillers",
    icon: Ban,
    title: "No Fillers",
    description: "Speak without saying um, uh, like, you know...",
    locked: true,
  },
  {
    id: "no-pauses",
    icon: Pause,
    title: "No Pauses",
    description: "Keep your thought moving without awkward silence.",
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
  {
    id: "think-on-your-feet",
    icon: Brain,
    title: "Think on Your Feet",
    description: "Answer an unexpected question immediately.",
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
            <Trophy size={28} strokeWidth={1.8} className="challenges-icon" />
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
        <p className="challenges-hero-eyebrow">THE ARTICULATE60 CHALLENGES</p>
        <p className="challenges-hero-copy">{CHALLENGES_HERO_COPY}</p>
        <button className="challenges-coming-soon-btn" disabled>
          <Lock size={14} strokeWidth={2} />
          CHALLENGES COMING SOON
        </button>
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
