// Admin: upload each book's PDF, see copies sold, and tell everyone who
// tapped "Notify me" when something launches.
import { useCallback, useEffect, useState } from "react";
import { BookOpen, Megaphone, Upload } from "lucide-react";
import api from "../api/axios";
import "./Admin.css";

const money = (amount, currency) =>
  currency === "USD"
    ? `$${amount.toFixed(2)}`
    : `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

export default function AdminLearnBooks() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    api
      .get("/api/admin/learn")
      .then((r) => {
        setData(r.data);
        setError("");
      })
      .catch((e) => setError(e.response?.data?.message || "Could not load Learn details."));
  }, []);

  useEffect(load, [load]);

  const upload = async (bookId, file) => {
    if (!file) return;
    setBusy(bookId);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post(`/api/admin/learn/books/${bookId}/file`, form);
      setMessage("Book uploaded. Members who own it can read it now.");
      load();
    } catch (e) {
      setMessage(e.response?.data?.message || "Upload failed.");
    } finally {
      setBusy("");
    }
  };

  const announce = async (item) => {
    if (!window.confirm(`Tell ${item.waiting} people that ${item.title} is out now?`)) return;
    setBusy(item.id);
    setMessage("");
    try {
      const r = await api.post(`/api/admin/learn/announce/${item.id}`);
      setMessage(`Sent to ${r.data.notified} people (${r.data.phones} phone notifications).`);
      load();
    } catch (e) {
      setMessage(e.response?.data?.message || "Could not send.");
    } finally {
      setBusy("");
    }
  };

  if (error) return <p className="admin-overview-error" role="alert">{error}</p>;
  if (!data) return <p className="admin-subscriber-empty" role="status">Loading books…</p>;

  return (
    <>
      {message && <p className="admin-subscriber-empty" role="status">{message}</p>}

      <section className="admin-product-notifications">
        <header className="admin-product-notifications-header">
          <div>
            <h2>Books</h2>
            <p>Upload the PDF for each book. Only members who bought it can open it.</p>
          </div>
        </header>
        <div className="admin-subscriber-list">
          {data.books.map((b) => (
            <article className="admin-subscriber-card" key={b.id}>
              <span className="admin-subscriber-icon">
                <BookOpen size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{b.title}</strong>
                <span>
                  {b.owners} {b.owners === 1 ? "owner" : "owners"} ·{" "}
                  {b.file
                    ? `${b.file.name || "PDF"} · ${(b.file.size / 1048576).toFixed(1)} MB${b.file.pages ? ` · ${b.file.pages} pages` : ""}`
                    : "No PDF yet"}
                </span>
              </div>
              <label className="admin-learn-upload">
                <Upload size={15} aria-hidden="true" />
                {busy === b.id ? "Uploading…" : b.file ? "Replace PDF" : "Upload PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  disabled={Boolean(busy)}
                  onChange={(e) => upload(b.id, e.target.files?.[0])}
                />
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-product-notifications">
        <header className="admin-product-notifications-header">
          <div>
            <h2>Sales</h2>
            <p>Confirmed book payments.</p>
          </div>
        </header>
        {data.sales.length === 0 ? (
          <p className="admin-subscriber-empty">No book sales yet.</p>
        ) : (
          <div className="admin-subscriber-list">
            {data.sales.map((s) => (
              <article className="admin-subscriber-card" key={`${s.productId}-${s.currency}`}>
                <div>
                  <strong>{s.title}</strong>
                  <span>
                    {s.count} sold · {money(s.amount, s.currency)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-product-notifications">
        <header className="admin-product-notifications-header">
          <div>
            <h2>Coming soon</h2>
            <p>When one launches, send everyone who tapped Notify me a phone and in-app notification.</p>
          </div>
        </header>
        <div className="admin-subscriber-list">
          {data.upcoming.map((u) => (
            <article className="admin-subscriber-card" key={u.id}>
              <span className="admin-subscriber-icon">
                <Megaphone size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{u.title}</strong>
                <span>
                  {u.total} asked · {u.waiting} not told yet
                </span>
              </div>
              <button
                type="button"
                className="admin-learn-upload"
                disabled={!u.waiting || Boolean(busy)}
                onClick={() => announce(u)}
              >
                {busy === u.id ? "Sending…" : "Announce launch"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
