import { Component } from "react";
import "./ErrorBoundary.css";

// Catches any screen that fails to draw, so members see a way back instead of
// a blank page. A failed chunk load (an old tab after a new release) is fixed
// by reloading once, automatically.
const RELOAD_FLAG = "loquiex.reloadedAfterChunkError";

function isChunkError(error) {
  const text = String(error?.message || error || "");
  return /Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(
    text,
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Screen failed to load:", error, info?.componentStack);
    if (isChunkError(error)) {
      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          window.location.reload();
        }
      } catch {
        // Storage blocked: the buttons below still work.
      }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const signedIn = (() => {
      try {
        return Boolean(localStorage.getItem("token"));
      } catch {
        return false;
      }
    })();

    return (
      <main className="error-boundary" role="alert">
        <div className="error-boundary-card">
          <h1>Something went wrong</h1>
          <p>
            This screen didn't load properly. Your practices and progress are
            safe. Please try again.
          </p>
          <div className="error-boundary-actions">
            <button type="button" onClick={() => window.location.reload()}>
              Try again
            </button>
            <a href={signedIn ? "/app/home" : "/"}>
              {signedIn ? "Back to home" : "Go to the start"}
            </a>
          </div>
        </div>
      </main>
    );
  }
}
