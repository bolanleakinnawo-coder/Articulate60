import { BookOpen } from "lucide-react";
import "../../styles/Library.css";
import libraryImg from "../../assets/Library.jpg"; // swap with your sourced image

const Library = () => {
  return (
    <section className="lib">
      <div className="lib-container">
        <div className="lib-content">
          <div className="lib-icon">
            <BookOpen size={24} strokeWidth={1.8} />
          </div>

          <span className="lib-badge">THE LIBRARY</span>

          <h2 className="lib-title">The Practical Library</h2>

          <p className="lib-desc">
            A growing collection of practical communication resources, guides,
            templates, exercises and tools you can apply in real life.
          </p>

          <a href="#library" className="lib-link">
            EXPLORE THE LIBRARY <span className="arrow">→</span>
          </a>
        </div>

        <div className="lib-visual">
          <img
            src={libraryImg}
            alt="Books and tablet on a desk"
            className="lib-image"
          />
        </div>
      </div>
    </section>
  );
};

export default Library;
