import { useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import AppRoutes from "./Routes/AppRoutes";
import InstallAppButton from "./Components/layout/InstallAppButton";
import splashScreenLogo from "./assets/splashscreen.PNG";

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

  useEffect(() => {
    if (pathname === "/" || pathname === "/landingpage") {
      setIsVisible(false);
      return undefined;
    }

    setIsVisible(true);
    const timeoutId = window.setTimeout(() => setIsVisible(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  if (!isVisible) return null;

  return (
    <div className="navigation-splash" role="status" aria-label="Loading">
      <img src={splashScreenLogo} alt="Articulate60" />
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
