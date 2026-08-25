import { useState, useEffect, useRef } from "react";

import "../../styles/Testimonials.css";

const TESTIMONIALS = [
  {
    quote:
      "Articulate60 keeps me consistent. The daily practice, topics, and structure make a huge difference in how I speak and show up.",
    name: "Aisha M.",
    role: "Product Manager",
    avatar: "/avatars/aisha.jpg",
  },
  {
    quote:
      "I used to freeze up in meetings. After a few weeks of daily practice, I actually look forward to speaking up now.",
    name: "David O.",
    role: "Software Engineer",
    avatar: "/avatars/david.jpg",
  },
  {
    quote:
      "The structured challenges kept me accountable in a way no app has before. My confidence has genuinely changed.",
    name: "Grace T.",
    role: "Marketing Lead",
    avatar: "/avatars/grace.jpg",
  },
  {
    quote:
      "Simple, daily, effective. That's really all it took to build a habit that stuck for the first time.",
    name: "Michael B.",
    role: "Founder",
    avatar: "/avatars/michael.jpg",
  },
];

const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const handleScroll = () => {
      const card = track.firstChild;
      if (!card) return;
      const cardWidth = card.offsetWidth + 16; // width + gap
      const index = Math.round(track.scrollLeft / cardWidth);
      setActiveIndex(index);
    };

    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => track.removeEventListener("scroll", handleScroll);
  }, []);

  const goToSlide = (index) => {
    const track = trackRef.current;
    const card = track?.firstChild;
    if (!track || !card) return;
    const cardWidth = card.offsetWidth + 16;
    track.scrollTo({ left: index * cardWidth, behavior: "smooth" });
    setActiveIndex(index);
  };

  return (
    <section className="testi">
      <div className="testi-container">
        <h2 className="testi-heading">Real People. Real Improvement.</h2>

        <div className="testi-track" ref={trackRef}>
          {TESTIMONIALS.map((t) => (
            <div className="testi-card" key={t.name}>
              <span className="testi-quote-mark">&ldquo;</span>
              <p className="testi-quote">{t.quote}</p>
              <div className="testi-author">
                <img src={t.avatar} alt={t.name} className="testi-avatar" />
                <div>
                  <p className="testi-name">{t.name}</p>
                  <p className="testi-role">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="testi-dots">
          {TESTIMONIALS.map((_, index) => (
            <button
              key={index}
              className={`testi-dot ${index === activeIndex ? "active" : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
