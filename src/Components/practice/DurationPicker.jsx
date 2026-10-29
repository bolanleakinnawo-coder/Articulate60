import { SPEAK_DURATIONS } from "../../data/prompts";
import "../../styles/PracticeExtras.css";

// "Choose your speaking duration": 30 sec, 1 min or 2 min.
export default function DurationPicker({ value, onChange, className = "" }) {
  return (
    <div className={`duration-picker ${className}`}>
      <p className="duration-picker-label">Choose your speaking duration</p>
      <div
        className="duration-picker-options"
        role="radiogroup"
        aria-label="Speaking duration"
      >
        {SPEAK_DURATIONS.map((d) => (
          <button
            key={d.seconds}
            type="button"
            role="radio"
            aria-checked={value === d.seconds}
            className={`duration-chip ${value === d.seconds ? "selected" : ""}`}
            onClick={() => onChange(d.seconds)}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
