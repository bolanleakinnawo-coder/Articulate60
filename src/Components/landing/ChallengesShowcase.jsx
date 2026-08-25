import { Calendar, Target, Award, ChevronRight, Clock } from "lucide-react";

import "../../styles/ChallengesShowcase.css";

const MORE_CHALLENGES = [
  {
    icon: Calendar,
    days: "7 DAYS",
    title: "Speak Without Fillers",
  },
  {
    icon: Clock,
    days: "14 DAYS",
    title: "Think Before You Speak",
  },
  {
    icon: Calendar,
    days: "30 DAYS",
    title: "The Articulation Challenge",
  },
];

const ChallengesShowcase = () => {
  return (
    <section className="chs" id="challenges">
      <div className="chs-container">
        {/* LEFT: main featured challenge */}
        <div className="chs-main">
          <span className="chs-badge">HAPPENING NOW</span>

          <h2 className="chs-title">14-Day Impromptu Speaking Challenge</h2>

          <p className="chs-desc">
            Speak without a script. Think faster. Organise your thoughts and
            express yourself clearly.
          </p>

          <div className="chs-card">
            <div className="chs-stats">
              <div className="chs-stat">
                <Calendar size={20} strokeWidth={1.8} />
                <span>14 DAYS</span>
              </div>
              <div className="chs-stat">
                <Target size={20} strokeWidth={1.8} />
                <span>DAILY PRACTICE</span>
              </div>
              <div className="chs-stat">
                <Award size={20} strokeWidth={1.8} />
                <span>COMPLETION REWARD</span>
              </div>
            </div>

            <p className="chs-price">₦3,900</p>
            <p className="chs-price-note">Founding price</p>

            <button className="chs-btn">
              VIEW CHALLENGE <span className="arrow">→</span>
            </button>

            <p className="chs-availability">
              Available to Articulate60 members.
            </p>
          </div>
        </div>

        {/* RIGHT: more challenges list */}
        <div className="chs-side">
          <h3 className="chs-side-heading">More challenges</h3>

          <div className="chs-list">
            {MORE_CHALLENGES.map((c) => (
              <button className="chs-list-item" key={c.title}>
                <span className="chs-list-icon">
                  <c.icon size={20} strokeWidth={1.8} />
                </span>
                <span className="chs-list-text">
                  <span className="chs-list-days">{c.days}</span>
                  <span className="chs-list-title">{c.title}</span>
                </span>
                <ChevronRight
                  size={18}
                  strokeWidth={2}
                  className="chs-list-arrow"
                />
              </button>
            ))}
          </div>

          <button className="chs-see-all">
            SEE ALL CHALLENGES <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ChallengesShowcase;
