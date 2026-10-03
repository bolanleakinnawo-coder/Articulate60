import { useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { Download } from "lucide-react";
import AppRoutes from "./Routes/AppRoutes";

function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return undefined;
    }

    const handleInstallAvailable = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleInstalled = () => setInstallPrompt(null);

    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleInstallAvailable,
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  if (!installPrompt) return null;

  return (
    <button
      className="install-app-button"
      type="button"
      onClick={installApp}
    >
      <Download size={17} />
      Install Articulate60
    </button>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppRoutes />
      <InstallAppPrompt />
    </BrowserRouter>
  );
}

export default App;
