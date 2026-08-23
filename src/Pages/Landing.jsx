import React from "react";
import Nav from "../Components/landing/Nav";
import Hero from "../Components/landing/Hero";
import "../styles/Landingpage.css";
import WhatYouCanDo from "../Components/landing/WhatYouCanDo";
import HowItWorks from "../Components/landing/HowItWorks";
import CurrentChallenge from "../Components/landing/CurrentChallenge";

const Landing = () => {
  return (
    <div>
      <Nav />
      <Hero />
      <WhatYouCanDo />
      <HowItWorks />
      <CurrentChallenge />
    </div>
  );
};

export default Landing;
