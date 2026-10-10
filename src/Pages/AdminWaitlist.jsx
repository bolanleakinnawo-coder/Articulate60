import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import api from "../api/axios";
import "./Admin.css";

export default function AdminWaitlist() {
  const [signups, setSignups] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    api
      .get("/api/admin/waitlist")
      .then((response) => {
        if (isCurrent) setSignups(response.data);
      })
      .catch((requestError) => {
        if (!isCurrent) return;
        setError(
          requestError.response?.data?.message ||
            "Could not load waitlist signups.",
        );
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section className="admin-subscribers">
      <header className="admin-overview-header">
        <p className="admin-overview-eyebrow">Admin</p>
        <h1>Waitlist signups</h1>
        <p>People who signed up for Loquiex launch updates.</p>
      </header>

      {error && (
        <p className="admin-overview-error" role="alert">
          {error}
        </p>
      )}
      {isLoading ? (
        <p className="admin-subscriber-empty" role="status">
          Loading waitlist signups...
        </p>
      ) : !error && signups.length === 0 ? (
        <p className="admin-subscriber-empty">
          No one has joined the waitlist yet.
        </p>
      ) : (
        <>
          <p className="admin-subscriber-count">
            {signups.length} waitlist{" "}
            {signups.length === 1 ? "signup" : "signups"}
          </p>
          <div className="admin-subscriber-list">
            {signups.map((signup) => (
              <article className="admin-subscriber-card" key={signup._id}>
                <span className="admin-subscriber-icon">
                  <Users size={18} />
                </span>
                <div>
                  <strong>{signup.name}</strong>
                  <span>
                    {signup.email} · joined{" "}
                    {signup.createdAt
                      ? new Date(signup.createdAt).toLocaleDateString()
                      : "date unavailable"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
