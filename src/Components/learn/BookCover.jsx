import { PRODUCTS } from "../../data/learn";

// A book cover drawn in the brand colours (no image files needed).
// size: "lg" (featured), "md" (shop cards), "sm" (library rows)
export default function BookCover({ id, size = "md" }) {
  const p = PRODUCTS[id];
  if (!p) return null;
  if (id === "language-upgrade") {
    return (
      <div className={`lx-cover lx-cover-${size} cover-bundle`} aria-hidden="true">
        <span className="lx-cover-mini cover-word">
          <span>Word</span>
          <span>Playbook</span>
        </span>
        <span className="lx-cover-mini cover-grammar">
          <span>Grammar</span>
          <span>Playbook</span>
        </span>
      </div>
    );
  }
  return (
    <div className={`lx-cover lx-cover-${size} ${p.cover}`} aria-hidden="true">
      <span className="lx-cover-title">
        {p.coverTitle.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
      {p.coverSub && <span className="lx-cover-sub">{p.coverSub}</span>}
      <span className="lx-cover-brand">Loquiex</span>
    </div>
  );
}
