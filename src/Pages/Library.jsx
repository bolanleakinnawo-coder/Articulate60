import { useState } from "react";
import { ShoppingCart, Sparkles } from "lucide-react";
import "./Library.css";

const FILTERS = ["All", "Courses", "eBooks", "Workbooks", "Templates"];

export default function Library() {
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <div className="library-content">
      <div className="library-intro">
        <h1>Library</h1>
        <p>
          Practical resources, courses and tools to help you build stronger
          communication skills — at your pace.
        </p>
      </div>

      <div className="library-filters">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            className={`library-filter${filter === activeFilter ? " active" : ""}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="library-empty">
        <div className="library-empty-art">
          <div className="library-empty-blob" />
          <ShoppingCart
            size={100}
            strokeWidth={1.5}
            className="library-cart-icon"
          />
        </div>

        <h2>Something great is coming...</h2>
        <p>
          We're curating practical resources, courses and tools to help you
          communicate better. Stay tuned!
        </p>
      </div>
    </div>
  );
}
