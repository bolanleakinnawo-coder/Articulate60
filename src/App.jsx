import { useEffect, useRef, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import AppRoutes from "./Routes/AppRoutes";
import InstallAppButton from "./Components/layout/InstallAppButton";
import splashScreenLogo from "./assets/brandlogo.PNG";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function NavigationSplash() {
  const { pathname } = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const pathnameRef = useRef(pathname);
  const wasAwayRef = useRef(false);

  pathnameRef.current = pathname;

  useEffect(() => {
    let timeoutId;

    const showSplashOnReturn = () => {
      if (
        !wasAwayRef.current ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      wasAwayRef.current = false;
      if (
        pathnameRef.current === "/" ||
        pathnameRef.current === "/landingpage"
      ) {
        return;
      }

      window.clearTimeout(timeoutId);
      setIsVisible(true);
      timeoutId = window.setTimeout(() => setIsVisible(false), 2000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        wasAwayRef.current = true;
      } else {
        showSplashOnReturn();
      }
    };

    const handlePageShow = () => showSplashOnReturn();
    const handlePageHide = () => {
      wasAwayRef.current = true;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="navigation-splash" role="status" aria-label="Loading">
      <img
        className="navigation-splash-logo"
        src={splashScreenLogo}
        alt="Loquiex"
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppRoutes />
      <InstallAppButton />
      <NavigationSplash />
    </BrowserRouter>
  );
}

export default App;
