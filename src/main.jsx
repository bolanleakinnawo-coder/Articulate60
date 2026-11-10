import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import ErrorBoundary from "./Components/layout/ErrorBoundary";
import "./styles/globals.css";

// Sign-ins used to live in sessionStorage (lost whenever the app or tab was
// closed). They now live in localStorage, so members stay signed in until
// they log out or the 7-day sign-in expires. Carry over a current sign-in.
try {
  for (const key of ["token", "user"]) {
    const value = sessionStorage.getItem(key);
    if (value && !localStorage.getItem(key)) localStorage.setItem(key, value);
    sessionStorage.removeItem(key);
  }
} catch {
  // Storage blocked (private mode): nothing to carry over.
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
