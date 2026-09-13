import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Sparkles,
  LayoutGrid,
  MessageCircle,
  X,
  RotateCw,
  ArrowLeft,
  Clock,
  Volume2,
  ChevronDown,
  Check,
} from "lucide-react";
import jarImg from "../assets/jar.png";
import spinningJar from "../assets/Jar2.PNG";
import resultJar from "../assets/jar3.PNG";
import spinSound from "../assets/spin.mp3";
import {
  CATEGORIES,
  LEVEL_META,
  getRandomPrompt,
  getRandomCategoryPrompt,
  YAP_HELP,
  YAP_QUOTE,
} from "../data/prompts";

export default function Practice() {
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [view, setView] = useState("select"); // select | spinning | result | yap
  const [activeCategory, setActiveCategory] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const spinAudio = useRef(null);

  const levelInfo = LEVEL_META.find((l) => l.id === selectedLevel);

  if (!spinAudio.current) {
    spinAudio.current = new Audio(spinSound);
    spinAudio.current.preload = "auto";
    spinAudio.current.loop = true;
    spinAudio.current.volume = 0.35;
  }

  const runSpin = async (categoryId, categoryTitle, prompt) => {
    setActiveCategory({ id: categoryId, title: categoryTitle });
    setCurrentPrompt(prompt);
    setView("spinning");

    // Start spinning sound
    try {
      spinAudio.current.currentTime = 0;
      await spinAudio.current.play();
    } catch (error) {
      console.log("Spin sound blocked:", error);
    }

    setTimeout(() => {
      // Stop sound when spinning ends
      spinAudio.current.pause();
      spinAudio.current.currentTime = 0;

      setView("result");
    }, 1600);
  };

  const handleSpinTheJar = () => {
    if (!selectedLevel) {
      setIsLevelOpen(true);
      return;
    }

    const { categoryId, categoryTitle, prompt } =
      getRandomCategoryPrompt(selectedLevel);
    runSpin(categoryId, categoryTitle, prompt);
  };

  const handleChooseCategory = (categoryId, categoryTitle) => {
    if (!selectedLevel) {
      setShowCategoryModal(false);
      setIsLevelOpen(true);
      return;
    }

    setShowCategoryModal(false);
    const prompt = getRandomPrompt(categoryId, selectedLevel);
    runSpin(categoryId, categoryTitle, prompt);
  };

  const handleChangeTopic = () => {
    if (!activeCategory) return;
    const prompt = getRandomPrompt(activeCategory.id, selectedLevel);
    setCurrentPrompt(prompt);
    setView("spinning");
    setTimeout(() => setView("result"), 1200);
  };

  const handleStartPreparing = () => {
    navigate("prepare", {
      state: {
        level: selectedLevel,
        category: activeCategory,
        prompt: currentPrompt,
      },
    });
  };

  const handleExitResult = () => {
    setView("select");
    setCurrentPrompt(null);
    setActiveCategory(null);
  };

  const handleYapMode = () => {
    if (!selectedLevel) {
      setIsLevelOpen(true);
      return;
    }

    setView("yap");
  };

  const handleStartYapping = () => {
    navigate("yap-session", { state: { level: selectedLevel } });
  };

  const handleSelectLevel = (levelId) => {
    setSelectedLevel(levelId);
    setIsLevelOpen(false);
  };

  // ---------- YAP MODE VIEW ----------
  if (view === "yap") {
    return (
      <div className="page practice-page yap-page">
        <button
          className="yap-back"
          onClick={() => setView("select")}
          aria-label="Back"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>

        <p className="eyebrow practice-eyebrow">YAP MODE</p>
        <h1 className="yap-title">No prompt. Just talk.</h1>
        <p className="yap-subtitle">
          Pick something on your mind and start. No topic, no structure — just
          you, thinking out loud.
        </p>

        <div className="yap-help-card">
          <p className="yap-help-label">A LITTLE HELP</p>
          <ul className="yap-help-list">
            {YAP_HELP.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>

        <p className="yap-quote">"{YAP_QUOTE}"</p>

        <button
          className="spin-jar-btn yap-start-btn"
          onClick={handleStartYapping}
        >
          <MessageCircle size={18} strokeWidth={2} />
          Start Yapping
        </button>
      </div>
    );
  }

  // ---------- SPINNING VIEW ----------
  if (view === "spinning") {
    return (
      <div className="page practice-page">
        <h1 className="spin-status-title">SPINNING...</h1>
        <p className="spin-status-subtitle">Getting your topic ready</p>

        <div className="jar-wrapper spin-jar-shake">
          <img src={spinningJar} alt="Jar" className="jar-image" />
        </div>

        <div className="spin-loader" />
        <p className="spin-status-footer">Good things take a spin.</p>
      </div>
    );
  }

  // ---------- RESULT VIEW ----------
  if (view === "result") {
    return (
      <div className="page practice-page">
        <h1 className="spin-status-title">YOUR TOPIC IS HERE!</h1>
        <p className="spin-status-subtitle">Read your topic below.</p>

        <div className="jar-wrapper result-jar-wrapper">
          <img src={resultJar} alt="Jar" className="jar-image" />

          <div className="topic-note">
            <div className="topic-note-header">
              <span className="topic-note-level">LEVEL {selectedLevel}</span>
              <span className="topic-note-timer">
                <Clock size={11} strokeWidth={2.5} />
                {levelInfo?.prepare} PREP
              </span>
            </div>
            <p className="topic-note-text">{currentPrompt}</p>
          </div>
        </div>

        <button
          className="spin-jar-btn result-cta"
          onClick={handleStartPreparing}
        >
          START PREPARING
          <span className="arrow">→</span>
        </button>

        <button className="change-topic-btn" onClick={handleChangeTopic}>
          <RotateCw size={14} strokeWidth={2} />
          Change topic
        </button>

        <button className="exit-result-btn" onClick={handleExitResult}>
          Back to practice
        </button>
      </div>
    );
  }

  // ---------- SELECT VIEW (default) ----------
  return (
    <div className="page practice-page">
      <p className="eyebrow practice-eyebrow">CHOOSE YOUR LEVEL</p>

      <div className="level-dropdown">
        <button
          className={`level-dropdown-trigger ${isLevelOpen ? "open" : ""}`}
          onClick={() => setIsLevelOpen((prev) => !prev)}
        >
          <span className="level-dropdown-trigger-text">
            <span className="level-dropdown-label">
              {levelInfo ? `LEVEL ${levelInfo.id}` : "LEVEL"}
            </span>
            <span className="level-dropdown-title">
              {levelInfo?.title || "Choose your level"}
            </span>
          </span>
          <ChevronDown
            size={20}
            strokeWidth={2}
            className={`level-dropdown-chevron ${isLevelOpen ? "open" : ""}`}
          />
        </button>

        {isLevelOpen && (
          <div className="level-dropdown-list">
            {LEVEL_META.map((level) => {
              const isSelected = selectedLevel === level.id;
              return (
                <button
                  key={level.id}
                  className={`level-dropdown-item ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => handleSelectLevel(level.id)}
                >
                  <span className="level-dropdown-item-number">
                    {String(level.id).padStart(2, "0")}
                  </span>

                  <span className="level-dropdown-item-text">
                    <span className="level-dropdown-item-title">
                      {level.title}
                    </span>
                    {level.description && (
                      <span className="level-dropdown-item-desc">
                        {level.description}
                      </span>
                    )}
                  </span>

                  <span className="level-dropdown-item-meta">
                    <span className="level-dropdown-item-stat">
                      <Clock size={13} strokeWidth={2.2} />
                      {level.prepare}
                    </span>
                    <span className="level-dropdown-item-stat">
                      <Volume2 size={13} strokeWidth={2.2} />
                      {level.speak}
                    </span>
                  </span>

                  {isSelected && (
                    <Check
                      size={16}
                      strokeWidth={2.5}
                      className="level-dropdown-item-check"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="jar-wrapper">
        <img
          src={jarImg}
          alt="Jar with speaking topics"
          className="jar-image"
        />
      </div>

      <button className="spin-jar-btn" onClick={handleSpinTheJar}>
        <Sparkles size={18} strokeWidth={2} />
        Spin the Jar
      </button>

      <div className="mode-cards">
        <button
          className="mode-card"
          onClick={() => setShowCategoryModal(true)}
        >
          <div className="mode-card-heading">
            <div className="mode-card-icon">
              <LayoutGrid size={18} strokeWidth={1.8} />
            </div>
            <h3 className="mode-card-title">Choose a category</h3>
          </div>
          <p className="mode-card-desc">
            Pick a category and get a tailored topic.
          </p>
        </button>

        <button className="mode-card" onClick={handleYapMode}>
          <div className="mode-card-heading">
            <div className="mode-card-icon">
              <MessageCircle size={18} strokeWidth={1.8} />
            </div>
            <h3 className="mode-card-title">Yap Mode</h3>
          </div>
          <p className="mode-card-desc">No topic. Just you talking.</p>
        </button>
      </div>

      {showCategoryModal && (
        <div
          className="category-modal-backdrop"
          onClick={() => setShowCategoryModal(false)}
        >
          <div className="category-modal" onClick={(e) => e.stopPropagation()}>
            <div className="category-modal-header">
              <h2>Choose Your Category</h2>
              <button
                className="category-modal-close"
                onClick={() => setShowCategoryModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="category-modal-list">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  className="category-modal-item"
                  onClick={() =>
                    handleChooseCategory(category.id, category.title)
                  }
                >
                  {category.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
