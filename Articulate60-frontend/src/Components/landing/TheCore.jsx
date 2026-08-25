import { MessageSquare, Clock, Mic, PenLine, CheckCircle2 } from "lucide-react";
import "../../styles/Thecore.css";

const STEPS = [
  {
    number: 1,
    icon: MessageSquare,
    title: "GET A TOPIC",
    desc: "Spin for a random topic based on your level.",
  },
  {
    number: 2,
    icon: Clock,
    title: "PREPARE",
    desc: "You get a short time to think and organise.",
  },
  {
    number: 3,
    icon: Mic,
    title: "SPEAK",
    desc: "Record yourself speaking your response.",
  },
  {
    number: 4,
    icon: PenLine,
    title: "REFLECT",
    desc: "Listen back and reflect on what went well and what you can improve.",
  },
  {
    number: 5,
    icon: CheckCircle2,
    title: "COMPLETE",
    desc: "Mark it done, and keep your streak alive.",
  },
];

const TheCore = () => {
  return (
    <section className="core">
      <div className="core-container">
        <span className="core-badge">THE CORE</span>

        <h2 className="core-heading">
          Practice speaking. <br />
          Not just learning <br />
          about it.
        </h2>

        <p className="core-subtext">
          A simple daily flow that builds real speaking skills.
        </p>

        {/* MOBILE: vertical timeline (icon + text per row) */}
        <div className="core-timeline core-timeline--mobile">
          {STEPS.map((step, index) => (
            <div className="core-step" key={step.number}>
              <div className="core-step-left">
                <div className="core-icon">
                  <step.icon size={22} strokeWidth={1.8} />
                </div>
                {index < STEPS.length - 1 && (
                  <div className="core-line core-line--vertical" />
                )}
              </div>
              <div className="core-step-right">
                <div className="core-step-header">
                  <span className="core-number">{step.number}</span>
                  <h3 className="core-title">{step.title}</h3>
                </div>
                <p className="core-desc">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP: icons+lines in one row, text row below */}
        <div className="core-timeline core-timeline--desktop">
          <div className="core-icon-row">
            {STEPS.map((step, index) => (
              <div className="core-icon-node" key={step.number}>
                <div className="core-icon">
                  <step.icon size={22} strokeWidth={1.8} />
                </div>
                {index < STEPS.length - 1 && (
                  <div className="core-line core-line--horizontal" />
                )}
              </div>
            ))}
          </div>

          <div className="core-text-row">
            {STEPS.map((step) => (
              <div className="core-text-col" key={step.number}>
                <div className="core-step-header">
                  <span className="core-number">{step.number}</span>
                  <h3 className="core-title">{step.title}</h3>
                </div>
                <p className="core-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TheCore;
