// Reads a book the member owns, one page at a time, and saves how far they
// got (furthest page / total pages = "% completed") to the server, so
// Continue learning and My Learning show it on every device.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { BOOKS } from "../data/learn";
import { downloadBook, loadLearn, saveReadingProgress } from "../lib/learn";
import "../styles/Learn.css";
import "../styles/BookReader.css";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export default function BookReader() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const book = BOOKS[bookId];

  const [status, setStatus] = useState({ kind: "loading", percent: 0 });
  const [doc, setDoc] = useState(null);
  const [page, setPage] = useState(1);
  const [furthest, setFurthest] = useState(0);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const saveTimer = useRef(null);
  const pending = useRef(null);
  const [width, setWidth] = useState(0);

  // Load the member's place in the book, then the book itself.
  useEffect(() => {
    if (!book) return undefined;
    let alive = true;
    let loaded = null;
    (async () => {
      try {
        const learn = await loadLearn();
        const item = learn.library.find((i) => i.bookId === bookId);
        if (!item) {
          if (alive) setStatus({ kind: "not-owned" });
          return;
        }
        if (!item.ready) {
          if (alive) setStatus({ kind: "not-ready" });
          return;
        }
        const bytes = await downloadBook(bookId, (percent) => {
          if (alive) setStatus({ kind: "loading", percent });
        });
        loaded = await pdfjs.getDocument({ data: bytes }).promise;
        if (!alive) return;
        const start = Math.min(Math.max(item.lastPage || 1, 1), loaded.numPages);
        setDoc(loaded);
        setFurthest(item.furthestPage || 0);
        setPage(start);
        setStatus({ kind: "ready" });
      } catch (e) {
        if (!alive) return;
        const code = e.response?.status;
        setStatus({
          kind: code === 403 ? "not-owned" : code === 409 ? "not-ready" : "error",
        });
      }
    })();
    return () => {
      alive = false;
      loaded?.destroy();
    };
  }, [book, bookId]);

  // Fit the page to the reading area.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [status.kind]);

  useEffect(() => {
    if (!doc || !width || !canvasRef.current) return undefined;
    let task = null;
    let cancelled = false;
    setRendering(true);
    doc.getPage(page).then((p) => {
      if (cancelled) return;
      const base = p.getViewport({ scale: 1 });
      const scale = Math.min(width, 900) / base.width;
      const ratio = window.devicePixelRatio || 1;
      const viewport = p.getViewport({ scale: scale * ratio });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / ratio}px`;
      canvas.style.height = `${viewport.height / ratio}px`;
      task = p.render({ canvasContext: canvas.getContext("2d"), viewport });
      task.promise.then(() => !cancelled && setRendering(false)).catch(() => {});
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, width]);

  const flush = useCallback(() => {
    clearTimeout(saveTimer.current);
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    saveReadingProgress(bookId, p.page, p.total).catch(() => {
      pending.current = pending.current || p; // try again on the next turn
    });
  }, [bookId]);

  // Save the page a moment after it changes (and when leaving).
  useEffect(() => {
    if (!doc) return;
    pending.current = { page, total: doc.numPages };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 800);
    window.scrollTo({ top: 0 });
  }, [doc, page, flush]);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  const total = doc?.numPages || 0;
  const go = useCallback(
    (delta) => {
      const next = Math.min(Math.max(page + delta, 1), total || 1);
      setPage(next);
      setFurthest((f) => Math.max(f, next));
    },
    [page, total],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Swipe left / right on phones.
  const touch = useRef(null);
  const onTouchStart = (e) => {
    touch.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
  };

  const percent = total ? Math.min(100, Math.round((Math.max(furthest, page) / total) * 100)) : 0;
  const back = () => navigate("/app/learn?tab=library");

  return (
    <div className="learn-content lx-page br-page">
      <header className="br-head">
        <button type="button" className="br-back" onClick={back} aria-label="Back to My Learning">
          <ArrowLeft size={18} />
        </button>
        <div className="br-head-text">
          <h1>{book?.shortTitle || "Book"}</h1>
          {status.kind === "ready" && (
            <p>
              {percent}% completed · Page {page} of {total}
            </p>
          )}
        </div>
      </header>

      {status.kind === "ready" && (
        <div className="lx-bar br-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Reading progress">
          <span style={{ width: `${percent}%` }} />
        </div>
      )}

      {!book && <p className="lx-muted">We couldn’t find this book.</p>}

      {book && status.kind === "loading" && (
        <div className="br-state" role="status">
          <Loader2 size={22} className="lx-spin" aria-hidden="true" />
          <p>Opening your book{status.percent ? `… ${status.percent}%` : "…"}</p>
        </div>
      )}

      {status.kind === "not-owned" && (
        <div className="br-state">
          <p>This book isn’t in your library yet.</p>
          <button type="button" className="lx-cta" onClick={() => navigate("/app/learn?tab=explore")}>
            See the books
          </button>
        </div>
      )}

      {status.kind === "not-ready" && (
        <div className="br-state">
          <p>
            We’re getting your book ready. We’ll send you a notification as
            soon as you can start reading.
          </p>
          <button type="button" className="lx-cta lx-cta-outline" onClick={back}>
            Back to My Learning
          </button>
        </div>
      )}

      {status.kind === "error" && (
        <div className="br-state">
          <p>We couldn’t open the book. Check your connection and try again.</p>
          <button type="button" className="lx-cta" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      )}

      {status.kind === "ready" && (
        <>
          <div
            className="br-sheet"
            ref={wrapRef}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <canvas ref={canvasRef} className={rendering ? "is-rendering" : ""} aria-label={`Page ${page} of ${total}`} />
          </div>
          <nav className="br-nav" aria-label="Pages">
            <button type="button" className="lx-cta lx-cta-outline" onClick={() => go(-1)} disabled={page <= 1}>
              <ChevronLeft size={18} aria-hidden="true" /> Previous
            </button>
            <span className="br-count">
              {page} / {total}
            </span>
            <button type="button" className="lx-cta" onClick={() => go(1)} disabled={page >= total}>
              Next <ChevronRight size={18} aria-hidden="true" />
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
