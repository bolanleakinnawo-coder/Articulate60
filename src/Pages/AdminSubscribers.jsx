import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import api from "../api/axios";
import "./Admin.css";

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    api
      .get("/api/admin/subscribers")
      .then((response) => {
        if (isCurrent) setSubscribers(response.data);
      })
      .catch((requestError) => {
        if (!isCurrent) return;
        setError(
          requestError.response?.data?.message ||
            "Could not load email subscribers.",
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
        <h1>Email subscribers</h1>
        <p>
          Members who opted in to communication tips, practice reminders, and
          Loquiex updates.
        </p>
      </header>

      {error && (
        <p className="admin-overview-error" role="alert">
          {error}
        </p>
      )}
      {isLoading ? (
        <p className="admin-subscriber-empty" role="status">
          Loading subscribers...
        </p>
      ) : !error && subscribers.length === 0 ? (
        <p className="admin-subscriber-empty">
          No members have opted in yet.
        </p>
      ) : (
        <>
          <p className="admin-subscriber-count">
            {subscribers.length} opted-in{" "}
            {subscribers.length === 1 ? "member" : "members"}
          </p>
          <div className="admin-subscriber-list">
            {subscribers.map((subscriber) => (
              <article className="admin-subscriber-card" key={subscriber._id}>
                <span className="admin-subscriber-icon">
                  <Mail size={18} />
                </span>
                <div>
                  <strong>{subscriber.email}</strong>
                  <span>
                    {subscriber.username} · opted in{" "}
                    {subscriber.marketingOptInAt
                      ? new Date(
                          subscriber.marketingOptInAt,
                        ).toLocaleDateString()
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
