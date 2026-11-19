import "./JoiningTeamDialog.css";

// Round 11 (Sheriff, 2026-11-19): shown before someone with an active
// individual plan joins a team by invitation, or creates and pays for their
// own team as Team Admin. Every word is Sheriff's. On Continue their
// individual plan ends with no credit (the server does this).
export default function JoiningTeamDialog({ onContinue, onCancel, busy = false }) {
  return (
    <div className="jt-backdrop" onClick={() => !busy && onCancel()}>
      <div
        className="jt-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="jt-title"
        aria-describedby="jt-text"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="jt-title">Joining a team</h2>
        <div id="jt-text">
          <p>
            Your individual subscription will end immediately when you join
            this team. Any unused days and allowances will be forfeited, as
            individual and team allowances cannot be combined.
          </p>
          <p>
            To avoid losing your remaining subscription, wait until it expires
            before joining.
          </p>
          <p className="jt-ask">Do you want to continue?</p>
        </div>
        <div className="jt-actions">
          <button type="button" className="jt-cancel" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="jt-continue" disabled={busy} onClick={onContinue}>
            {busy ? "Please wait…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
