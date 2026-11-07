import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Share2, X } from "lucide-react";
import {
  getShareCaption,
  getStoredUser,
  renderShareImage,
} from "./shareImage";
import "./FeedbackReport.css";

// Bottom sheet with the branded share image built from the member's real
// practice: download it, share it from the phone's share sheet, and copy the
// caption (which carries the member's own invite link).
//   score    0-100 overall score, or null to show time spent speaking
//   seconds  speaking time
//   strength / focus  "A quick look at my progress" lines (score version)
export default function ShareSheet({ score = null, seconds, strength, focus, onClose }) {
  const user = useMemo(() => getStoredUser(), []);
  const caption = useMemo(() => getShareCaption(user), [user]);
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let url = "";
    let cancelled = false;
    renderShareImage({ score, seconds, strength, focus, user })
      .then((image) => {
        if (cancelled || !image) return;
        url = URL.createObjectURL(image);
        setBlob(image);
        setPreviewUrl(url);
      })
      .catch(() => setError("We couldn't create your image. Please try again."));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [score, seconds, strength, focus, user]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const file = blob
    ? new File([blob], "loquiex-practice.png", { type: "image/png" })
    : null;
  const canShareFile =
    file && navigator.canShare && navigator.canShare({ files: [file] });

  const download = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = "loquiex-practice.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const share = async () => {
    try {
      if (canShareFile) {
        await navigator.share({ files: [file], text: caption });
      } else if (navigator.share) {
        await navigator.share({ text: caption });
      } else {
        download();
      }
    } catch {
      // The person closed the share sheet; nothing to do.
    }
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy didn't work here. Press and hold the caption to copy it.");
    }
  };

  return (
    <div className="sh-backdrop" onClick={onClose}>
      <div
        className="sh-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Share your practice"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sh-head">
          <div>
            <p className="sh-kicker">Share your progress</p>
            <h2 className="sh-title">Post it, inspire a friend.</h2>
          </div>
          <button
            type="button"
            className="sh-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sh-preview">
          {previewUrl ? (
            <img src={previewUrl} alt="Your Loquiex practice result" />
          ) : (
            <div className="fb-spinner" aria-label="Creating your image" />
          )}
        </div>

        <div className="sh-caption">
          <p className="sh-caption-label">Caption</p>
          <p className="sh-caption-text">{caption}</p>
          <button type="button" className="sh-copy" onClick={copyCaption}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy caption"}
          </button>
        </div>

        {error && <p className="fb-footnote">{error}</p>}

        <div className="sh-actions">
          <button
            type="button"
            className="sh-primary sh-btn"
            onClick={share}
            disabled={!blob}
          >
            <Share2 size={17} /> Share to TikTok, IG or friends
          </button>
          <button
            type="button"
            className="fb-secondary-btn sh-btn"
            onClick={download}
            disabled={!blob}
          >
            <Download size={17} /> Download image
          </button>
        </div>
        <p className="sh-hint">
          Tip: copy the caption first, then paste it when you post.
        </p>
      </div>
    </div>
  );
}
