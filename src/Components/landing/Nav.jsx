import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/Articulate Logo.PNG";

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Challenges", href: "#challenges" },
  { label: "Library", href: "#library" },
  { label: "Pricing", href: "#pricing" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 860);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth > 860;
      setIsDesktop(desktop);
      if (desktop) setIsOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`navbar ${isScrolled ? "scrolled" : ""}`}>
      <div className="navbar-container">
        <a href="/" className="navbar-logo">
          <img src={logo} alt="Articulate60" />
        </a>

        <nav className="navbar-links">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="navbar-actions">
          {isDesktop && (
            <Link to="/register" className="btn-primary navbar-cta">
              Start Practicing Free
            </Link>
          )}

          <button
            className={`navbar-toggle ${isOpen ? "active" : ""}`}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={`navbar-mobile ${isOpen ? "open" : ""}`}>
        <nav className="navbar-mobile-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <Link to="/register" className="btn-primary navbar-mobile-cta">
          Start Practicing Free
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
