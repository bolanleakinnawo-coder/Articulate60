import { SPEAK_DURATIONS } from "../../data/prompts";
import "../../styles/PracticeExtras.css";

// "Choose your speaking duration": 30 sec, 45 sec or 1 min.
export default function DurationPicker({
  value,
  onChange,
  className = "",
  options = SPEAK_DURATIONS,
}) {
  return (
    <div className={`duration-picker ${className}`}>
      <p className="duration-picker-label">Choose your speaking duration</p>
      <div
        className="duration-picker-options"
        role="radiogroup"
        aria-label="Speaking duration"
      >
        {options.map((d) => (
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
