import React from "react";
import { Link } from "react-router-dom";
import "./RegistrationNav.css";

function RegistrationNav() {
  return (
    <nav className="registration-nav">
      <Link to="/" className="registration-nav-logo">
        <span>ARTICULATE</span>
        <strong>60</strong>
      </Link>

      <Link to="/login" className="registration-nav-login">
        Login
      </Link>
    </nav>
  );
}

export default RegistrationNav;
