// src/components/StructureGuide.jsx
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { STRUCTURES_INTRO, STRUCTURES, CHOOSE_WHAT_FITS } from "../data/help";

export default function StructureGuide({ onBack }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="page practice-page structure-page">
      <button className="structure-back" onClick={onBack} aria-label="Back">
        <ArrowLeft size={18} strokeWidth={2} />
      </button>

      <p className="eyebrow practice-eyebrow">COMMUNICATION STRUCTURES</p>
      <h1 className="structure-title">Structure your answer</h1>

      <div className="structure-intro">
        {STRUCTURES_INTRO.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {STRUCTURES.map((s) => (
        <section key={s.id} className="structure-card">
          <h2 className="structure-name">{s.name}</h2>
          <p className="structure-bestfor">
            <strong>Best for:</strong> {s.bestFor}
          </p>
          <p>{s.intro}</p>

          <ul className="structure-steps">
            {s.steps.map((step, i) => (
              <li key={i}>
                <strong>{step.label}:</strong> {step.text}
              </li>
            ))}
          </ul>

          <div className="structure-example">
            <p className="structure-example-label">EXAMPLE</p>
            <p className="structure-example-question">{s.example.question}</p>
            {s.example.parts.map((part, i) => (
              <p key={i}>
                <strong>{part.label}:</strong> {part.text}
              </p>
            ))}
          </div>

          <p className="structure-note">{s.note}</p>
        </section>
      ))}

      <section className="structure-card">
        <h2 className="structure-name">{CHOOSE_WHAT_FITS.title}</h2>
        {CHOOSE_WHAT_FITS.body.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </section>
    </div>
  );
}
