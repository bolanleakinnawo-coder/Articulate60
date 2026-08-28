import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, LayoutGrid, MessageCircle } from "lucide-react";
import jarImg from "../assets/jar.png";


const LEVELS = [
  { id: 1, title: "Find Your Voice" },
  { id: 2, title: "Think Faster" },
  { id: 3, title: "Speak Under Pressure" },
];

export default function Practice() {
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState(1);

  const handleModeClick = (path) => {
    navigate(path, { state: { level: selectedLevel } });
  };

  return (
    <div className="page practice-page">
      <p className="eyebrow practice-eyebrow">CHOOSE YOUR LEVEL</p>

      <div className="level-tabs">
        {LEVELS.map((level) => {
          const isSelected = selectedLevel === level.id;

          return (
            <button
              key={level.id}
              className={`level-tab ${isSelected ? "selected" : ""}`}
              onClick={() => setSelectedLevel(level.id)}
            >
              <span className="level-tab-number">LEVEL {level.id}</span>
              <span className="level-tab-title">{level.title}</span>
            </button>
          );
        })}
      </div>

      <div className="jar-wrapper">
        <img src={jarImg} alt="Jar with speaking topics" className="jar-image" />
      </div>

      <button className="spin-jar-btn" onClick={() => handleModeClick("spin")}>
        <Sparkles size={18} strokeWidth={2} />
        Spin the Jar
      </button>

      <div className="or-divider">
        <span className="or-line" />
        <span className="or-text">OR</span>
        <span className="or-line" />
      </div>

      <div className="mode-cards">
        <button className="mode-card" onClick={() => handleModeClick("category")}>
          <div className="mode-card-icon">
            <LayoutGrid size={20} strokeWidth={1.8} />
          </div>
          <h3 className="mode-card-title">Choose a category</h3>
          <p className="mode-card-desc">Pick a category and get a tailored topic.</p>
        </button>

        <button className="mode-card" onClick={() => handleModeClick("yap")}>
          <div className="mode-card-icon">
            <MessageCircle size={20} strokeWidth={1.8} />
          </div>
          <h3 className="mode-card-title">Yap Mode</h3>
          <p className="mode-card-desc">No topic. Just you talking.</p>
        </button>
      </div>
    </div>
  );
}