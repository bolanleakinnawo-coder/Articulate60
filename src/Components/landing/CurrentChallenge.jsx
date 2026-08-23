import { BookOpen, Calendar, Gift } from "lucide-react";


const CurrentChallenge = () => {
  return (
    <section className="challenge">
      <div className="challenge-container">
        <div className="challenge-card">
          {/* LEFT: info */}
          <div className="challenge-info">
            <span className="challenge-badge">CURRENT CHALLENGE</span>
            <h3 className="challenge-title">
              14-Day Impromptu Speaking Challenge
            </h3>

            <div className="challenge-meta">
              <span className="meta-item">
                <BookOpen size={15} strokeWidth={1.8} /> Masterclass
              </span>
              <span className="meta-divider">·</span>
              <span className="meta-item">
                <Calendar size={15} strokeWidth={1.8} /> 14 Days Practice
              </span>
              <span className="meta-divider">·</span>
              <span className="meta-item">
                <Gift size={15} strokeWidth={1.8} /> Completion Reward
              </span>
            </div>

            <p className="challenge-desc">
              Learn a skill. Practice it daily. Unlock your reward.
            </p>
          </div>

          {/* RIGHT: single white card holding price, gift, and button */}
          <div className="offer-card">
            <div className="offer-top">
              <div className="offer-text">
                <span className="offer-label">CHALLENGE 01</span>
                <p className="offer-price">₦3,900</p>
                <span className="offer-note">Founding Price</span>
              </div>

              <div className="gift-box-wrapper">
                <svg viewBox="0 0 160 160" className="gift-box-svg">
                  <defs>
                    <linearGradient id="lidGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--sage)" />
                      <stop offset="100%" stopColor="var(--olive-deep)" />
                    </linearGradient>
                    <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--olive-deep)" />
                      <stop offset="100%" stopColor="var(--olive-deeper)" />
                    </linearGradient>
                    <linearGradient id="ribbonGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#e8b84b" />
                      <stop offset="50%" stopColor="#f6d27a" />
                      <stop offset="100%" stopColor="#d9a53a" />
                    </linearGradient>
                    <radialGradient id="bowGrad" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#f6d27a" />
                      <stop offset="100%" stopColor="#d9a53a" />
                    </radialGradient>
                  </defs>

                  <ellipse
                    cx="80"
                    cy="150"
                    rx="48"
                    ry="7"
                    fill="var(--olive-deeper)"
                    opacity="0.15"
                  />

                  <rect
                    x="32"
                    y="86"
                    width="96"
                    height="58"
                    rx="5"
                    fill="url(#bodyGrad)"
                  />
                  <rect
                    x="32"
                    y="86"
                    width="96"
                    height="6"
                    fill="var(--white)"
                    opacity="0.12"
                  />

                  <rect
                    x="24"
                    y="60"
                    width="112"
                    height="28"
                    rx="6"
                    fill="url(#lidGrad)"
                  />
                  <rect
                    x="24"
                    y="60"
                    width="112"
                    height="6"
                    rx="3"
                    fill="var(--white)"
                    opacity="0.2"
                  />

                  <rect
                    x="71"
                    y="60"
                    width="18"
                    height="84"
                    fill="url(#ribbonGrad)"
                  />
                  <rect
                    x="24"
                    y="68"
                    width="112"
                    height="12"
                    fill="url(#ribbonGrad)"
                  />

                  <path
                    d="M80 60 C58 46, 40 46, 40 28 C40 14, 58 12, 66 24 C73 33, 78 48, 80 60 Z"
                    fill="url(#bowGrad)"
                  />
                  <path
                    d="M80 60 C102 46, 120 46, 120 28 C120 14, 102 12, 94 24 C87 33, 82 48, 80 60 Z"
                    fill="url(#bowGrad)"
                  />
                  <path
                    d="M80 60 C58 46, 40 46, 40 28 C40 14, 58 12, 66 24 C73 33, 78 48, 80 60 Z"
                    fill="var(--white)"
                    opacity="0.15"
                  />
                  <circle cx="80" cy="58" r="10" fill="#e0aa3f" />
                  <circle
                    cx="80"
                    cy="58"
                    r="10"
                    fill="url(#bowGrad)"
                    opacity="0.9"
                  />
                </svg>
              </div>
            </div>

            <button className="challenge-btn">
              View Challenge <span className="arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CurrentChallenge;
