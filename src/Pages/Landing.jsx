import React, { useEffect } from "react";
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
  useEffect(() => {
    const sections = document.querySelectorAll(".landing-page section");
    const revealSections = Array.from(sections).filter(
      (section) => !section.classList.contains("hero"),
    );

    revealSections.forEach((section) =>
      section.classList.add("landing-reveal"),
    );

    if (!("IntersectionObserver" in window)) {
      revealSections.forEach((section) => section.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    revealSections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">
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
