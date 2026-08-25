import React from "react";
import Nav from "../Components/landing/Nav";
import Hero from "../Components/landing/Hero";
import "../styles/Landingpage.css";

import HowItWorks from "../Components/landing/HowItWorks";
import CurrentChallenge from "../Components/landing/CurrentChallenge";
import TheCore from "../Components/landing/TheCore";
import Experience from "../Components/landing/Experience";
import Testimonials from "../Components/landing/Testimonial";
import ChallengesShowcase from "../Components/landing/ChallengesShowcase";
import Newsletter from "../Components/landing/Newsletter";
import Library from "../Components/landing/Library";
import Completion from "../Components/landing/Completion";
import CTABanner from "../Components/landing/CTABanner";
import Footer from "../Components/landing/Footer";

const Landing = () => {
  return (
    <div>
      <Nav />
      <Hero />
      <TheCore />
      <Experience />
      <Testimonials />
      <ChallengesShowcase />
      <Newsletter />
      <Library />
      <Completion />
      <CTABanner />
      <Footer />
    </div>
  );
};

export default Landing;
