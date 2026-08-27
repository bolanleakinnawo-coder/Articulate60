import { useNavigate } from "react-router-dom";
import { Sparkles, LayoutGrid, MessageCircle } from "lucide-react";
import jarImg from "../assets/jar 1.png"; // swap path/filename to match your actual image

const MODES = [
  {
    id: "spin",
    icon: Sparkles,
    title: "Spin the Jar",
    desc: "Get a random topic. Speak without a script.",
    path: "spin",
  },
  {
    id: "category",
    icon: LayoutGrid,
    title: "Choose a Category",
    desc: "Pick a topic area that fits what you want to practise.",
    path: "category",
  },
  {
    id: "yap",
    icon: MessageCircle,
    title: "Yap Mode",
    desc: "Just talk. No topic, no structure — free flow practice.",
    path: "yap",
  },
];

export default function Practice() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="practice-hero">
        <p className="eyebrow">SPIN THE JAR</p>
        <h1 className="practice-hero-title">Get a topic.</h1>
        <p className="practice-hero-subtitle">Speak without a script.</p>

        <div className="jar-wrapper">
          <img
            src={jarImg}
            alt="Jar with speaking topics"
            className="jar-image"
          />
        </div>
      </div>

      <div className="mode-grid">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            className="mode-card"
            onClick={() => navigate(mode.path)}
          >
            <div className="mode-icon">
              <mode.icon size={22} strokeWidth={1.8} />
            </div>
            <h3 className="mode-title">{mode.title}</h3>
            <p className="mode-desc">{mode.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
