import { useEffect } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import AppRoutes from "./Routes/AppRoutes";
import InstallAppButton from "./Components/layout/InstallAppButton";

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
      <InstallAppButton />
    </BrowserRouter>
  );
}

export default App;
