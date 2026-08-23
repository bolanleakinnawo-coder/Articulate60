import { Mic, GraduationCap, TrendingUp, Trophy, BookOpen } from "lucide-react";

const FEATURES = [
  {
    icon: Mic,
    title: "Daily Speaking Practice",
    desc: "Get a new topic every day and practice speaking on the spot.",
  },
  {
    icon: GraduationCap,
    title: "Expert-Led Masterclasses",
    desc: "Learn the skills behind confident, clear and powerful communication.",
  },
  {
    icon: TrendingUp,
    title: "Track Your Progress",
    desc: "Monitor your streaks, growth and consistency over time.",
  },
  {
    icon: Trophy,
    title: "Join Challenges",
    desc: "Join 14-day challenges that help you learn, practice and level up.",
  },
  {
    icon: BookOpen,
    title: "The Articulate Library",
    desc: "Access premium handbooks and resources to go deeper.",
  },
];

const WhatYouCanDo = () => {
  return (
    <section className="wycd">
      <div className="wycd-container">
        <h2 className="wycd-heading">WHAT YOU CAN DO ON ARTICULATE 60</h2>

        <div className="wycd-grid">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="wycd-card">
              <div className="wycd-icon">
                <Icon size={26} strokeWidth={1.8} />
              </div>
              <h3 className="wycd-title">{title}</h3>
              <p className="wycd-desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatYouCanDo;
