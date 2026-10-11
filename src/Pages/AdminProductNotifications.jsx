import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import api from "../api/axios";
import "./Admin.css";

export default function AdminProductNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    api
      .get("/api/admin/learn-notifications")
      .then((response) => {
        if (isCurrent) setNotifications(response.data);
      })
      .catch((requestError) => {
        if (!isCurrent) return;
        setError(
          requestError.response?.data?.message ||
            "Could not load product notification requests.",
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
        <h1>Product notifications</h1>
        <p>People who asked to hear when a learning product is available.</p>
      </header>

      {error && (
        <p className="admin-overview-error" role="alert">
          {error}
        </p>
      )}

      <section className="admin-product-notifications">
        <header className="admin-product-notifications-header">
          <div>
            <h2>Requests</h2>
            <p>Requests by product, most recent first.</p>
          </div>
          {!isLoading && !error && (
            <span className="admin-product-notifications-count">
              {notifications.length}
            </span>
          )}
        </header>

        {isLoading ? (
          <p className="admin-subscriber-empty" role="status">
            Loading product notifications...
          </p>
        ) : !error && notifications.length === 0 ? (
          <p className="admin-subscriber-empty">
            No product notification requests yet.
          </p>
        ) : (
          !error && (
            <div className="admin-subscriber-list">
              {notifications.map((notification) => (
                <article
                  className="admin-subscriber-card"
                  key={notification._id}
                >
                  <span className="admin-subscriber-icon">
                    <BellRing size={18} />
                  </span>
                  <div>
                    <strong>{notification.name}</strong>
                    <span>
                      {notification.productName} · {notification.email} ·
                      {" submitted "}
                      {notification.createdAt
                        ? new Date(
                            notification.createdAt,
                          ).toLocaleDateString()
                        : "date unavailable"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )
        )}
      </section>
    </section>
  );
}
