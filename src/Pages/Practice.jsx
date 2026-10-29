import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HELP_LAYER_1 } from "../data/help";
import { getUsage, isPaidPlan } from "../data/plans";
import api from "../api/axios";
import DurationPicker from "../Components/practice/DurationPicker";
import "../styles/PracticeExtras.css";

import {
  HelpCircle,
  Sparkles,
  LayoutGrid,
  MessageCircle,
  X,
  RotateCw,
  ArrowLeft,
  Clock,
  LockKeyhole,
  Volume2,
  ChevronDown,
  Check,
  MessagesSquare,
  Lightbulb,
  Scale,
  BriefcaseBusiness,
  Mic,
  BookOpen,
  Presentation,
  Users,
  ChevronRight,
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
  DEFAULT_SPEAK_SECONDS,
} from "../data/prompts";

const CATEGORY_ICONS = {
  "everyday-conversations": MessagesSquare,
  "word-play": Lightbulb,
  "opinions-and-debates": Scale,
  "workplace-and-interview": BriefcaseBusiness,
  "the-speaking-stage": Mic,
  storytelling: BookOpen,
  "business-ideas-and-pitches": Presentation,
};

export default function Practice() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);
  const wordOfTheDay = location.state?.wordOfTheDay;
  const wordOfTheDayPrompt = wordOfTheDay
    ? `What does “${wordOfTheDay.word}” mean? Use it naturally in a short response.`
    : null;
  const [selectedLevel, setSelectedLevel] = useState(wordOfTheDay ? 1 : null);
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [view, setView] = useState(wordOfTheDay ? "result" : "select"); // select | spinning | result | yap
  const [activeCategory, setActiveCategory] = useState(
    wordOfTheDay ? { id: "word-of-the-day", title: "Word of the Day" } : null,
  );
  const [currentPrompt, setCurrentPrompt] = useState(wordOfTheDayPrompt);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [promptError, setPromptError] = useState("");
  const [speakSeconds, setSpeakSeconds] = useState(DEFAULT_SPEAK_SECONDS);
  const [usage, setUsage] = useState(() => getUsage([]));
  const spinAudio = useRef(null);

  const levelInfo = LEVEL_META.find((l) => l.id === selectedLevel);
  const hasPrep = (levelInfo?.prepareSeconds ?? 0) > 0;

  useEffect(() => {
    api
      .get("/api/practice/recordings")
      .then((response) => setUsage(getUsage(response.data)))
      .catch(() => {});
  }, []);

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

    const randomTopic = getRandomCategoryPrompt();
    if (!randomTopic) {
      setPromptError("No practice topics are available right now.");
      return;
    }

    setPromptError("");
    runSpin(
      randomTopic.categoryId,
      randomTopic.categoryTitle,
      randomTopic.prompt,
    );
  };

  const handleChooseCategory = (categoryId, categoryTitle) => {
    if (!selectedLevel) {
      setShowCategoryModal(false);
      setIsLevelOpen(true);
      return;
    }

    setShowCategoryModal(false);
    const prompt = getRandomPrompt(categoryId);
    if (!prompt) {
      setPromptError(`${categoryTitle} doesn't have any topics available yet.`);
      return;
    }

    setPromptError("");
    runSpin(categoryId, categoryTitle, prompt);
  };

  const handleChangeTopic = () => {
    if (!activeCategory) return;
    const randomTopic = getRandomCategoryPrompt(activeCategory.id);
    if (!randomTopic) {
      setPromptError("No topics are available in other categories right now.");
      return;
    }

    setPromptError("");
    runSpin(
      randomTopic.categoryId,
      randomTopic.categoryTitle,
      randomTopic.prompt,
    );
  };

  const handleStartPreparing = () => {
    navigate("prepare", {
      state: {
        level: selectedLevel,
        category: activeCategory,
        prompt: currentPrompt,
        isWordOfTheDay: activeCategory?.id === "word-of-the-day",
        // With prep time, the duration is picked on the preparation screen.
        speakSeconds: hasPrep ? undefined : speakSeconds,
      },
    });
  };

  const handleExitResult = () => {
    setView("select");
    setCurrentPrompt(null);
    setActiveCategory(null);
    setPromptError("");
  };

  // Yap Mode has no level: no prompt, no preparation, straight to speaking.
  const handleYapMode = () => {
    setView("yap");
  };

  const handleStartYapping = () => {
    navigate("yap-session", {
      state: {
        level: 3,
        isYap: true,
        speakSeconds,
        category: { id: "yap", title: "Yap Mode" },
        prompt: "Yap Mode — free talk",
      },
    });
  };

  const handleGroupPractice = () => {
    navigate(isPaidPlan() ? "/app/group-practice/room" : "/app/group-practice");
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
          Pick something on your mind and start. No topic to answer, no
          structure to follow. Just you, thinking out loud.
        </p>

        <div className="yap-help-card">
          <p className="yap-help-label">A LITTLE HELP</p>
          <ul className="yap-help-list">
            {YAP_HELP.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>

        <p className="yap-quote">“{YAP_QUOTE}”</p>

        <DurationPicker value={speakSeconds} onChange={setSpeakSeconds} />

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
    const help = HELP_LAYER_1[activeCategory?.id];
    return (
      <div className="page practice-page practice-result-page">
        <h1 className="spin-status-title">
          {activeCategory?.id === "word-of-the-day"
            ? "YOUR WORD OF THE DAY"
            : "YOUR TOPIC IS HERE!"}
        </h1>
        <p className="spin-status-subtitle">
          {activeCategory?.id === "word-of-the-day"
            ? "Read your prompt below."
            : "Read your topic below."}
        </p>

        <div className="result-layout">
          <div className="result-jar-column">
            <div className="jar-wrapper result-jar-wrapper">
              <img src={resultJar} alt="Jar" className="jar-image" />

              <div className="topic-note">
                <div className="topic-note-header">
                  <span className="topic-note-level">
                    LEVEL {selectedLevel}
                  </span>
                  {hasPrep && (
                    <span className="topic-note-timer">
                      <Clock size={11} strokeWidth={2.5} />
                      {levelInfo.prepareSeconds} SEC PREP
                    </span>
                  )}
                </div>
                <p className="topic-note-text">{currentPrompt}</p>
              </div>
            </div>

            {help && (
              <button
                className="help-link-btn"
                onClick={() => setShowHelp(true)}
              >
                <HelpCircle size={17} strokeWidth={2} />
                <span>Need a little help?</span>
              </button>
            )}
          </div>

          <div className="result-actions">
            {!hasPrep && (
              <DurationPicker value={speakSeconds} onChange={setSpeakSeconds} />
            )}
            <button
              className="spin-jar-btn result-cta"
              onClick={handleStartPreparing}
            >
              {hasPrep ? "START PREPARING" : "I'M READY TO SPEAK"}
              <span className="arrow">→</span>
            </button>

            {activeCategory?.id !== "word-of-the-day" && (
              <button className="change-topic-btn" onClick={handleChangeTopic}>
                <RotateCw size={14} strokeWidth={2} />
                Change topic
              </button>
            )}
            {promptError && <p role="alert">{promptError}</p>}

            <button className="exit-result-btn" onClick={handleExitResult}>
              Back to practice
            </button>
          </div>
        </div>

        {showHelp && help && (
          <div
            className="help-modal-backdrop"
            onClick={() => setShowHelp(false)}
          >
            <div
              className="help-modal"
              role="dialog"
              aria-modal="true"
              aria-label="A quick pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="help-modal-header">
                <div>
                  <p className="help-modal-eyebrow">A QUICK POINTER</p>
                </div>
                <button
                  className="help-modal-close"
                  onClick={() => setShowHelp(false)}
                  aria-label="Close help"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="help-modal-body">
                <h3 className="help-modal-heading">{help.heading}</h3>

                <div className="help-modal-box">
                  <ul className="help-modal-bullets">
                    {help.questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                  <p className="help-modal-box-note">{help.outro}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- SELECT VIEW (default) ----------
  return (
    <div className="page practice-page">
      <div className="practice-intro">
        <p className="practice-time-label">Practice Time</p>
        <p className="practice-intro-title">
          <LockKeyhole size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>Only you can access your recordings. Speak freely.</span>
        </p>
      </div>

      <div className="practice-select-layout">
        <div className="practice-select-controls">
          <p className="eyebrow practice-level-label">CHOOSE YOUR LEVEL</p>

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
        </div>

        <div className="jar-wrapper practice-main-jar">
          <img
            src={jarImg}
            alt="Jar with speaking topics"
            className="jar-image"
          />
        </div>

        <div className="practice-select-actions">
          <button className="spin-jar-btn" onClick={handleSpinTheJar}>
            <Sparkles size={18} strokeWidth={2} />
            Spin the Jar
          </button>
          {promptError && <p role="alert">{promptError}</p>}

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

          <button className="group-entry-card" onClick={handleGroupPractice}>
            <span className="limit-row-icon" aria-hidden="true">
              <Users size={18} strokeWidth={1.8} />
            </span>
            <span className="limit-row-text">
              <span className="limit-row-title">Group Practice</span>
              <span className="limit-row-sub">
                Practise with others in live sessions.
              </span>
            </span>
            {isPaidPlan() ? (
              <ChevronRight
                size={18}
                className="limit-row-chev"
                aria-hidden="true"
              />
            ) : (
              <LockKeyhole
                size={16}
                className="limit-row-chev"
                aria-label="Members only"
              />
            )}
          </button>

          <div className="daily-limits-card">
            <div className="daily-limits-head">
              <h3>Your daily limits</h3>
              <span>Resets at midnight</span>
            </div>
            <LimitRow
              icon={MessageCircle}
              title="AI Feedback"
              left={usage.aiFeedback.left}
              total={usage.aiFeedback.total}
              unit="sessions"
              onClick={() =>
                navigate("/app/profile", { state: { open: "usage" } })
              }
            />
            <LimitRow
              icon={Users}
              title="Group Practice"
              left={usage.groupMinutes.left}
              total={usage.groupMinutes.total}
              unit="minutes"
              locked={usage.groupMinutes.total === 0}
              onClick={handleGroupPractice}
            />
          </div>
        </div>
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
              {CATEGORIES.map((category) => {
                const Icon = CATEGORY_ICONS[category.id] || MessageCircle;
                return (
                  <button
                    key={category.id}
                    className="category-modal-item category-modal-item-icon"
                    onClick={() =>
                      handleChooseCategory(category.id, category.title)
                    }
                  >
                    <span className="category-modal-icon" aria-hidden="true">
                      <Icon size={20} strokeWidth={1.8} />
                    </span>
                    {category.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LimitRow({ icon: Icon, title, left, total, unit, locked, onClick }) {
  const pct = total > 0 ? Math.round((left / total) * 100) : 0;
  return (
    <button type="button" className="limit-row" onClick={onClick}>
      <span className="limit-row-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <span className="limit-row-text">
        <span className="limit-row-title">{title}</span>
        <span className="limit-row-sub">
          {locked
            ? "Included with Bloom and Flourish"
            : `${left} of ${total} ${unit} remaining`}
        </span>
        {!locked && (
          <span className="limit-row-bar">
            <span style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>
      {locked ? (
        <LockKeyhole size={16} className="limit-row-chev" aria-hidden="true" />
      ) : (
        <ChevronRight size={18} className="limit-row-chev" aria-hidden="true" />
      )}
    </button>
  );
}
