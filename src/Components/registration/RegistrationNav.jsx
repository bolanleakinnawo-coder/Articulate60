import React from "react";
import { Link } from "react-router-dom";
import brandLogo from "../../assets/brandlogo.PNG";
import "./RegistrationNav.css";

function RegistrationNav() {
  return (
    <nav className="registration-nav">
      <Link to="/" className="registration-nav-logo">
        <img src={brandLogo} alt="Loquiex" />
      </Link>

      <Link to="/login" className="registration-nav-login">
        Login
      </Link>
    </nav>
  );
}

export default RegistrationNav;
