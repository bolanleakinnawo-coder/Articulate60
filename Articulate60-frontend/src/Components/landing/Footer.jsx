import "../../styles/Footer.css";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <p className="footer-logo">
            articulate<span>60</span>
          </p>
          <p className="footer-tagline">
            Practise every day. <br />
            Become unstoppable.
          </p>
        </div>

        <div className="footer-socials">
          <a href="#" aria-label="Instagram" className="footer-social-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle
                cx="17.5"
                cy="6.5"
                r="1"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </a>
          <a href="#" aria-label="LinkedIn" className="footer-social-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.2 3.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4ZM3.4 9h3.6v11.5H3.4V9Zm5.8 0h3.4v1.6h.05c.47-.9 1.63-1.85 3.35-1.85 3.58 0 4.24 2.36 4.24 5.42v6.33h-3.55v-5.61c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96v5.71H9.2V9Z" />
            </svg>
          </a>
          <a href="#" aria-label="YouTube" className="footer-social-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.6 7.2a2.9 2.9 0 0 0-2.04-2.05C17.76 4.7 12 4.7 12 4.7s-5.76 0-7.56.45A2.9 2.9 0 0 0 2.4 7.2C1.95 9 1.95 12 1.95 12s0 3 .45 4.8a2.9 2.9 0 0 0 2.04 2.05c1.8.45 7.56.45 7.56.45s5.76 0 7.56-.45a2.9 2.9 0 0 0 2.04-2.05c.45-1.8.45-4.8.45-4.8s0-3-.45-4.8ZM10 15.7V8.3l6.2 3.7-6.2 3.7Z" />
            </svg>
          </a>
          <a href="#" aria-label="TikTok" className="footer-social-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.6 5.82c-1.02-.88-1.6-2.13-1.6-3.49h-3.28v13.11c0 1.51-1.22 2.73-2.73 2.73a2.73 2.73 0 0 1 0-5.46c.28 0 .55.04.8.12V9.63a6.02 6.02 0 0 0-.8-.05 6.02 6.02 0 1 0 6.02 6.02V9.4a7.53 7.53 0 0 0 4.4 1.4V7.53a4.83 4.83 0 0 1-2.81-1.71z" />
            </svg>
          </a>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {year} Articulate60. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
