import { useEffect, useState } from "react";
import { ArrowRight, Mail, MessageSquareQuote } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./Admin.css";

export default function AdminOverview() {
  const [pendingCount, setPendingCount] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/testimonials/admin", { params: { status: "pending" } })
      .then((response) => setPendingCount(response.data.length))
      .catch((requestError) => {
        setError(
          requestError.response?.data?.message ||
            "Could not load the dashboard overview.",
        );
      });
  }, []);

  return (
    <section className="admin-overview">
      <header className="admin-overview-header">
        <p className="admin-overview-eyebrow">Admin dashboard</p>
        <h1>Overview</h1>
        <p>Manage the content and community experience for Loquiex.</p>
      </header>

      {error && (
        <p className="admin-overview-error" role="alert">
          {error}
        </p>
      )}

      <div className="admin-overview-grid">
        <Link className="admin-overview-card" to="/admin/testimonials">
          <span className="admin-overview-card-icon">
            <MessageSquareQuote size={20} />
          </span>
          <span className="admin-overview-card-label">Testimonials</span>
          <strong>
            {pendingCount === null ? "—" : pendingCount}
          </strong>
          <span className="admin-overview-card-caption">
            {pendingCount === 1 ? "win awaiting review" : "wins awaiting review"}
          </span>
          <span className="admin-overview-card-link">
            Open section <ArrowRight size={15} />
          </span>
        </Link>
        <Link className="admin-overview-card" to="/admin/subscribers">
          <span className="admin-overview-card-icon">
            <Mail size={20} />
          </span>
          <span className="admin-overview-card-label">Email subscribers</span>
          <span className="admin-overview-card-caption">
            View members who opted in to Loquiex emails.
          </span>
          <span className="admin-overview-card-link">
            Open section <ArrowRight size={15} />
          </span>
        </Link>
      </div>
    </section>
  );
}
