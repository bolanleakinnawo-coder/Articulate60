import { CheckCircle2 } from "lucide-react";
import "../../styles/Completion.css";
import certificateImg from "../../assets/certificATE.jpEg"; // swap with your sourced image

const CHECKLIST = [
  "Challenge completed",
  "Certificate unlocked",
  "Completion session unlocked",
];

const Completion = () => {
  return (
    <section className="comp">
      <div className="comp-container">
        <div className="comp-content">
          <span className="comp-label">COMPLETE. CELEBRATE. GROW.</span>

          <h2 className="comp-title">Show up. Practise. Complete.</h2>

          <p className="comp-desc">
            Your effort deserves recognition. Finish your challenge and unlock
            rewards that keep you moving forward.
          </p>

          <ul className="comp-list">
            {CHECKLIST.map((item) => (
              <li className="comp-list-item" key={item}>
                <CheckCircle2 size={18} strokeWidth={1.8} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="comp-visual">
          <img
            src={certificateImg}
            alt="Certificate of Completion"
            className="comp-image"
          />
        </div>
      </div>
    </section>
  );
};

export default Completion;
