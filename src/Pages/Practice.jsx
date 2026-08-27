import { useNavigate } from "react-router-dom";
import { Sparkles, LayoutGrid, MessageCircle } from "lucide-react";
import jarImg from "../assets/jar.png";

const MODES = [
  {
    id: "spin",
    icon: Sparkles,
    title: "Spin the Jar",
    path: "spin",
  },
  {
    id: "category",
    icon: LayoutGrid,
    title: "Choose a Category",
    path: "category",
  },
  {
    id: "yap",
    icon: MessageCircle,
    title: "Yap Mode",
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
        <h1 className="practice-hero-title">Speak without a script.</h1>

        <div className="jar-wrapper">
          <img
            src={jarImg}
            alt="Jar with speaking topics"
            className="jar-image"
          />
        </div>
      </div>

      <div className="mode-list">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            className="mode-row"
            onClick={() => navigate(mode.path)}
          >
            <mode.icon size={18} strokeWidth={1.8} />
            <span>{mode.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
