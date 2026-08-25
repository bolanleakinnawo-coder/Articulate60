import {
  FileText,
  Timer,
  Mic,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: FileText,
    title: "GET A TOPIC",
    desc: "We give you a topic to speak on.",
  },
  {
    number: "02",
    icon: Timer,
    title: "PREPARE",
    desc: "You get 60 seconds to think.",
  },
  {
    number: "03",
    icon: Mic,
    title: "SPEAK",
    desc: "Speak for 1-3 minutes (based on your level).",
  },
  {
    number: "04",
    icon: RotateCcw,
    title: "REFLECT",
    desc: "Review your speaking and improve.",
  },
  {
    number: "05",
    icon: CheckCircle2,
    title: "COMPLETE",
    desc: "Track your streak and keep improving daily.",
  },
];

const HowItWorks = () => {
  return (
    <section className="hiw" id="how-it-works">
      <div className="hiw-container">
        <h2 className="hiw-heading">HOW ARTICULATE 60 WORKS</h2>

        <div className="hiw-steps">
          {STEPS.map((step, index) => (
            <div className="hiw-step-wrapper" key={step.title}>
              <div className="hiw-step">
                <div className="hiw-icon">
                  <step.icon size={24} strokeWidth={1.8} />
                  <span className="hiw-number">{step.number}</span>
                </div>
                <h3 className="hiw-title">{step.title}</h3>
                <p className="hiw-desc">{step.desc}</p>
              </div>

              {index < STEPS.length - 1 && (
                <div className="hiw-arrow">
                  <ArrowRight size={20} strokeWidth={1.8} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
