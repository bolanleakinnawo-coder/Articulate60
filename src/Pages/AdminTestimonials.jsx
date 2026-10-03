import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import api from "../api/axios";
import "./AdminTestimonials.css";

const STATUSES = ["pending", "approved", "rejected"];

export default function AdminTestimonials() {
  const [status, setStatus] = useState("pending");
  const [testimonials, setTestimonials] = useState([]);
  const [loadedStatus, setLoadedStatus] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [error, setError] = useState("");
  const isLoading = loadedStatus !== status;

  useEffect(() => {
    let isCurrent = true;
    api
      .get("/api/testimonials/admin", { params: { status } })
      .then((response) => {
        if (!isCurrent) return;
        setTestimonials(response.data);
        setError("");
        setLoadedStatus(status);
      })
      .catch((requestError) => {
        if (!isCurrent) return;
        setError(
          requestError.response?.data?.message ||
            "Could not load testimonials for review.",
        );
        setLoadedStatus(status);
      });
    return () => {
      isCurrent = false;
    };
  }, [status]);

  const reviewTestimonial = async (id, decision) => {
    setError("");
    setReviewingId(id);

    try {
      await api.patch(`/api/testimonials/admin/${id}`, { status: decision });
      setTestimonials((current) =>
        current.filter((testimonial) => testimonial._id !== id),
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not update testimonial status.",
      );
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <section className="admin-testimonials">
      <header className="admin-testimonials-header">
        <div>
          <p className="admin-testimonials-eyebrow">Admin</p>
          <h1>Testimonial review</h1>
          <p>Review community wins before they appear on the public website.</p>
        </div>
      </header>

      <div className="admin-testimonial-tabs" aria-label="Testimonial status">
        {STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            className={status === item ? "active" : ""}
            aria-pressed={status === item}
            onClick={() => setStatus(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {error && <p className="admin-testimonial-error">{error}</p>}

      {isLoading ? (
        <p className="admin-testimonial-empty">Loading testimonials...</p>
      ) : testimonials.length === 0 ? (
        <p className="admin-testimonial-empty">
          No {status} testimonials to show.
        </p>
      ) : (
        <div className="admin-testimonial-list">
          {testimonials.map((testimonial) => (
            <article className="admin-testimonial-card" key={testimonial._id}>
              <p className="admin-testimonial-quote">{testimonial.quote}</p>
              <div className="admin-testimonial-meta">
                <strong>{testimonial.displayName}</strong>
                <time dateTime={testimonial.createdAt}>
                  {new Date(testimonial.createdAt).toLocaleDateString()}
                </time>
              </div>
              {status === "pending" && (
                <div className="admin-testimonial-actions">
                  <button
                    type="button"
                    className="admin-approve-button"
                    disabled={reviewingId === testimonial._id}
                    onClick={() =>
                      reviewTestimonial(testimonial._id, "approved")
                    }
                  >
                    <Check size={16} />
                    Approve
                  </button>
                  <button
                    type="button"
                    className="admin-reject-button"
                    disabled={reviewingId === testimonial._id}
                    onClick={() =>
                      reviewTestimonial(testimonial._id, "rejected")
                    }
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
