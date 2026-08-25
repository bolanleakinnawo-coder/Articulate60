import {
  MessageSquare,
  GraduationCap,
  Flag,
  BarChart3,
  Users,
  Trophy,
} from "lucide-react";

import "../../styles/Experience.css";
const ITEMS = [
  {
    icon: MessageSquare,
    title: "Daily Practice",
    desc: "Build the habit with guided impromptu speaking practice every day.",
  },
  {
    icon: GraduationCap,
    title: "Expert-Led Masterclasses",
    desc: "Learn from communication experts and apply what you learn.",
  },
  {
    icon: Flag,
    title: "Structured Challenges",
    desc: "Push yourself with focused challenges and build real momentum.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    desc: "Track your streaks, progress and areas of improvement.",
  },
  {
    icon: Users,
    title: "Supportive Community",
    desc: "Grow with people who are on the same journey.",
  },
  {
    icon: Trophy,
    title: "Certificates & Completion",
    desc: "Earn certificates and unlock completion sessions as you achieve.",
  },
];

const Experience = () => {
  return (
    <section className="exp">
      <div className="exp-container">
        <span className="exp-badge">THE ARTICULATE 60 EXPERIENCE</span>

        <h2 className="exp-heading">
          More than practice. <br />
          A complete system <br />
          to help you grow.
        </h2>

        <div className="exp-grid">
          {ITEMS.map(({ icon: Icon, title, desc }) => (
            <div className="exp-card" key={title}>
              <div className="exp-icon">
                <Icon size={22} strokeWidth={1.8} />
              </div>
              <div className="exp-text">
                <h3 className="exp-title">{title}</h3>
                <p className="exp-desc">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;
