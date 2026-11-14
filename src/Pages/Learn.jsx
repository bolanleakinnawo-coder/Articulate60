import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell,
  BellRing,
  BookOpen,
  Check,
  Library as LibraryIcon,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import whatDoISayImage from "../assets/whatdoisay.PNG";
import whatDoIDoImage from "../assets/whatdoido.jpeg";
import BookCover from "../Components/learn/BookCover";
import {
  BOOKS,
  FEATURED_ID,
  OFFER_FALLBACK_ENDS_AT,
  PRODUCTS,
  SHOP_ORDER,
  formatPrice,
  percentOff,
} from "../data/learn";
import {
  loadLearn,
  setNotifyMe,
  splitTimeLeft,
  startBookCheckout,
  verifyBookPayment,
} from "../lib/learn";
import { syncPendingPayments } from "../data/plans";
import { isPaystackUrl, openPaystackPopup, preloadPaystack } from "../lib/paystackPopup";
import {
  ensureReminderNotifications,
  reminderHelp,
} from "../lib/practiceReminders";
import "../styles/Learn.css";

const TABS = [
  { id: "all", label: "All" },
  { id: "explore", label: "Explore" },
  { id: "library", label: "My library" },
];

const COMING_SOON = [
  {
    id: "what-do-i-say",
    title: "What Do I Say?",
    description:
      "Find the right words when you’re not sure how to express yourself.",
    image: whatDoISayImage,
  },
  {
    id: "what-do-i-do",
    title: "What Do I Do?",
    description: "Know what to do in difficult communication situations.",
    image: whatDoIDoImage,
  },
];

// Prices are shown in naira and dollars, as on the price list. Paystack
// charges in naira unless dollar payments are switched on (PAYSTACK_USD_ENABLED).
const DISPLAY_CURRENCIES = ["NGN", "USD"];

const pad = (n) => String(n).padStart(2, "0");

/* ---------- Small pieces ---------- */

function NotifyButton({ on, busy, onClick, className = "" }) {
  return (
    <button
      type="button"
      className={`lx-notify ${on ? "is-on" : ""} ${className}`}
      onClick={onClick}
      disabled={busy}
      aria-pressed={on}
    >
      {busy ? (
        <Loader2 size={16} className="lx-spin" aria-hidden="true" />
      ) : on ? (
        <BellRing size={16} aria-hidden="true" />
      ) : (
        <Bell size={16} aria-hidden="true" />
      )}
      {on ? "We’ll notify you" : "Notify me"}
    </button>
  );
}

function PriceLine({ product, prices, offerActive, currencies }) {
  const priceOf = (c) => prices?.[c] || product.prices[c];
  const ngn = priceOf("NGN");
  const discounted = offerActive && ngn.now < ngn.full;
  return (
    <div className="lx-price">
      <span className="lx-price-now">
        {currencies
          .map((c) => formatPrice(offerActive ? priceOf(c).now : priceOf(c).full, c))
          .join(" / ")}
      </span>
      {discounted && (
        <>
          <s className="lx-price-full">
            {currencies.map((c) => formatPrice(priceOf(c).full, c)).join(" / ")}
          </s>
          <span className="lx-off">{percentOff(ngn.full, ngn.now)}% off</span>
        </>
      )}
    </div>
  );
}

function LaunchCard({ endsAt, offset, onEnded }) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(t);
  }, [offset]);
  const left = new Date(endsAt).getTime() - now;
  useEffect(() => {
    if (left <= 0) onEnded();
  }, [left, onEnded]);
  if (left <= 0) return null;
  const t = splitTimeLeft(left);
  const ends = new Date(endsAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return (
    <section className="lx-launch" aria-labelledby="lx-launch-title">
      <div className="lx-launch-head">
        <span className="lx-launch-pill">Launch special</span>
        <h2 id="lx-launch-title" className="lx-launch-title">
          A little something to celebrate!
        </h2>
        <p className="lx-launch-text">
          Enjoy <strong>20% off</strong> every book during our launch offer.
        </p>
      </div>
      <div className="lx-launch-timer">
        <p className="lx-launch-label">Offer ends in</p>
        <div className="lx-timer" role="timer" aria-label={`Offer ends ${ends}`}>
          {[
            [t.days, "Days"],
            [t.hours, "Hours"],
            [t.minutes, "Mins"],
            [t.seconds, "Secs"],
          ].map(([v, label]) => (
            <div className="lx-timer-box" key={label}>
              <strong>{pad(v)}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="lx-launch-note">
        Ends {ends}. Prices go back to normal after that.
      </p>
    </section>
  );
}

function ProgressRow({ item, onRead }) {
  const book = BOOKS[item.bookId];
  if (!book) return null;
  const started = item.furthestPage > 0;
  return (
    <article className="lx-progress-card">
      <div className="lx-progress-top">
        <BookCover id={item.bookId} size="sm" />
        <div className="lx-progress-info">
          <h3>{book.shortTitle}</h3>
          <p>
            {!item.ready
              ? "Getting your book ready"
              : item.completedAt
                ? "Finished"
                : `${item.percent}% completed`}
          </p>
          <div
            className="lx-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={item.percent}
            aria-label={`${book.shortTitle} progress`}
          >
            <span style={{ width: `${item.percent}%` }} />
          </div>
        </div>
      </div>
      <button
        type="button"
        className="lx-cta lx-cta-block"
        onClick={() => onRead(item.bookId)}
      >
        {item.completedAt ? "Read again" : started ? "Continue reading" : "Start reading"}
      </button>
    </article>
  );
}

/* ---------- Page ---------- */

export default function Learn() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "all";
  const returnRef = params.get("reference") || params.get("trxref");

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [offset, setOffset] = useState(0);
  const [offerOver, setOfferOver] = useState(false);
  const [busyNotify, setBusyNotify] = useState(null);
  const [notifyHelp, setNotifyHelp] = useState("");
  const [buying, setBuying] = useState(null); // product being bought
  const [currency, setCurrency] = useState("NGN");
  const [checkoutError, setCheckoutError] = useState("");
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [payment, setPayment] = useState(returnRef ? { kind: "checking" } : null);

  const setTab = (id) => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("tab");
    else next.set("tab", id);
    next.delete("reference");
    next.delete("trxref");
    setParams(next, { replace: true });
  };

  const refresh = useCallback(async () => {
    try {
      const d = await loadLearn();
      setOffset(new Date(d.offer.serverNow).getTime() - Date.now());
      setData(d);
      setLoadError("");
    } catch (e) {
      setLoadError(
        e.response?.data?.message || "We couldn’t load Learn. Please try again.",
      );
    }
  }, []);

  useEffect(() => {
    // Loads from the server; state is set when the request finishes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    preloadPaystack();
    // A book paid for earlier but not confirmed yet is added now.
    syncPendingPayments().then((applied) => {
      if (applied.some((p) => p.kind === "book")) refresh();
    });
  }, [refresh]);

  // Back from Paystack: confirm the payment with the server.
  const checkPayment = useCallback(async (reference) => {
    setPayment({ kind: "checking", reference });
    try {
      const r = await verifyBookPayment(reference);
      if (r.payment.added) {
        setPayment({ kind: "added", productId: r.payment.productId });
        setData((d) => (d ? { ...d, library: r.library } : d));
      } else if (r.payment.status === "pending") {
        setPayment({ kind: "pending", reference });
      } else {
        setPayment({ kind: "failed", reference });
      }
    } catch {
      setPayment({ kind: "pending", reference });
    }
  }, []);

  useEffect(() => {
    if (!returnRef) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkPayment(returnRef);
    const next = new URLSearchParams(params);
    next.delete("reference");
    next.delete("trxref");
    next.set("tab", "library");
    setParams(next, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currencies = data?.currencies?.length ? data.currencies : ["NGN"];
  const offerActive = data ? data.offer.active && !offerOver : true;
  const endsAt = data?.offer.endsAt || OFFER_FALLBACK_ENDS_AT;
  const library = useMemo(() => data?.library || [], [data]);
  const owned = useMemo(() => new Set(library.map((i) => i.bookId)), [library]);
  const notifyOn = useMemo(() => new Set(data?.notify || []), [data]);
  const serverPrices = useMemo(
    () => Object.fromEntries((data?.products || []).map((p) => [p.id, p.prices])),
    [data],
  );
  const ownsAll = (productId) => PRODUCTS[productId].books.every((b) => owned.has(b));

  const onOfferEnded = useCallback(() => {
    setOfferOver(true);
    refresh();
  }, [refresh]);

  const toggleNotify = async (productId) => {
    if (busyNotify) return;
    const turnOn = !notifyOn.has(productId);
    setBusyNotify(productId);
    setNotifyHelp("");
    // Ask for phone notifications straight from the tap (Safari needs this).
    const pushState = turnOn ? await ensureReminderNotifications() : "on";
    try {
      await setNotifyMe(productId, turnOn);
      setData((d) => {
        if (!d) return d;
        const set = new Set(d.notify);
        if (turnOn) set.add(productId);
        else set.delete(productId);
        return { ...d, notify: [...set] };
      });
      if (turnOn && pushState !== "on") {
        setNotifyHelp(
          `We’ll tell you in the app when it’s out. ${reminderHelp(pushState)}`.replace(
            "to get the reminder",
            "to hear about it on your phone",
          ),
        );
      }
    } catch (e) {
      setNotifyHelp(
        e.response?.data?.message || "We couldn’t save that. Please try again.",
      );
    } finally {
      setBusyNotify(null);
    }
  };

  const openBuy = (productId) => {
    setCheckoutError("");
    setCurrency(currencies.includes(currency) ? currency : "NGN");
    setBuying(productId);
  };

  const goToPayment = async () => {
    if (!buying || startingCheckout) return;
    setStartingCheckout(true);
    setCheckoutError("");
    try {
      const r = await startBookCheckout(buying, currency, true);
      let result;
      try {
        if (!r.accessCode) throw Object.assign(new Error(), { code: "POPUP_UNAVAILABLE" });
        result = await openPaystackPopup(r.accessCode, r.reference);
      } catch (err) {
        if (err.code !== "POPUP_UNAVAILABLE") throw err;
        // Back-up: Paystack's own page, which returns to this same site.
        const page = await startBookCheckout(buying, currency, false);
        if (!isPaystackUrl(page.authorizationUrl)) throw new Error("Unexpected payment page.", { cause: err });
        window.location.assign(page.authorizationUrl);
        return;
      }
      setStartingCheckout(false);
      setBuying(null);
      if (result.status === "success") {
        checkPayment(result.reference);
        setTab("library");
      } else {
        // Closed the pop-up: a transfer may still land, so check quietly.
        verifyBookPayment(result.reference)
          .then((v) => {
            if (v.payment.added) {
              setPayment({ kind: "added", productId: v.payment.productId });
              setData((d) => (d ? { ...d, library: v.library } : d));
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      setCheckoutError(
        e.response?.data?.message || "Couldn’t start the payment. Please try again.",
      );
      setStartingCheckout(false);
    }
  };

  const read = (bookId) => navigate(`/app/learn/read/${bookId}`);

  useEffect(() => {
    if (!buying) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !startingCheckout) setBuying(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [buying, startingCheckout]);

  const showShop = tab !== "library";
  const continueItems = library.filter((i) => !i.completedAt).slice(0, 3);

  const productCard = (id) => {
    const p = PRODUCTS[id];
    const has = ownsAll(id);
    const partly = !has && p.books.some((b) => owned.has(b));
    return (
      <article key={id} className="lx-book">
        <BookCover id={id} size="md" />
        <div className="lx-book-body">
          {p.tagline && <span className="lx-tag">{p.tagline}</span>}
          <h3 className="lx-book-title">{p.title}</h3>
          <p className="lx-book-text">{p.description}</p>
          <PriceLine
            product={p}
            prices={serverPrices[id]}
            offerActive={offerActive}
            currencies={DISPLAY_CURRENCIES}
          />
          {partly && (
            <p className="lx-book-note">
              You already have{" "}
              {p.books.filter((b) => owned.has(b)).map((b) => BOOKS[b].shortTitle).join(", ")}.
            </p>
          )}
          {has ? (
            <button type="button" className="lx-cta lx-cta-outline" onClick={() => setTab("library")}>
              <Check size={16} aria-hidden="true" /> In your library
            </button>
          ) : (
            <button type="button" className="lx-cta" onClick={() => openBuy(id)}>
              Buy access
            </button>
          )}
        </div>
      </article>
    );
  };

  const featured = PRODUCTS[FEATURED_ID];
  const buyingProduct = buying ? PRODUCTS[buying] : null;
  const buyingPrice = buying
    ? serverPrices[buying]?.[currency] || buyingProduct.prices[currency]
    : null;

  return (
    <div className="learn-content lx-page">
      <header className="learn-header">
        <h1 className="learn-title">Learn</h1>
        <p className="learn-subtitle">Build the skills to communicate better.</p>
      </header>

      <div className="learn-categories" role="tablist" aria-label="Learn sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`learn-chip ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {payment && (
        <div className={`lx-banner lx-banner-${payment.kind}`} role="status">
          {payment.kind === "checking" && (
            <>
              <Loader2 size={18} className="lx-spin" aria-hidden="true" />
              <span>Confirming your payment…</span>
            </>
          )}
          {payment.kind === "added" && (
            <>
              <Check size={18} aria-hidden="true" />
              <span>
                <strong>{PRODUCTS[payment.productId]?.title}</strong> is in your library.
                Happy reading!
              </span>
            </>
          )}
          {payment.kind === "pending" && (
            <>
              <span>We haven’t received confirmation of your payment yet.</span>
              <button type="button" className="lx-link" onClick={() => checkPayment(payment.reference)}>
                Check again
              </button>
            </>
          )}
          {payment.kind === "failed" && (
            <span>Your payment didn’t go through, so you weren’t charged. You can try again.</span>
          )}
          {payment.kind !== "checking" && (
            <button type="button" className="lx-banner-close" aria-label="Dismiss" onClick={() => setPayment(null)}>
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {loadError && (
        <div className="lx-banner lx-banner-failed" role="alert">
          <span>{loadError}</span>
          <button type="button" className="lx-link" onClick={refresh}>
            Try again
          </button>
        </div>
      )}

      {showShop && data && offerActive && (
        <LaunchCard
          endsAt={endsAt}
          offset={offset}
          onEnded={onOfferEnded}
        />
      )}

      {showShop && (
        <section className="lx-reset" aria-labelledby="lx-reset-title">
          <div className="lx-reset-main">
            <span className="lx-featured-pill">
              <Sparkles size={13} aria-hidden="true" /> Featured for you
            </span>
            <h2 id="lx-reset-title" className="lx-reset-title">{featured.title}</h2>
            <p className="lx-reset-text">{featured.description}</p>
            <PriceLine
              product={featured}
              prices={serverPrices[FEATURED_ID]}
              offerActive={offerActive}
              currencies={DISPLAY_CURRENCIES}
            />
            {ownsAll(FEATURED_ID) ? (
              <button type="button" className="lx-cta lx-cta-outline lx-reset-cta" onClick={() => read(FEATURED_ID)}>
                <BookOpen size={16} aria-hidden="true" /> Read now
              </button>
            ) : (
              <button type="button" className="lx-cta lx-reset-cta" onClick={() => openBuy(FEATURED_ID)}>
                Buy access
              </button>
            )}
          </div>
          <div className="lx-reset-cover">
            <BookCover id={FEATURED_ID} size="lg" />
          </div>
        </section>
      )}

      {notifyHelp && showShop && <p className="lx-help">{notifyHelp}</p>}

      {tab === "all" && continueItems.length > 0 && (
        <section className="lx-section">
          <div className="lx-section-head">
            <h2>Continue learning</h2>
            <button type="button" className="lx-link" onClick={() => setTab("library")}>
              My library
            </button>
          </div>
          <div className="lx-progress-grid">
            {continueItems.map((item) => (
              <ProgressRow key={item.bookId} item={item} onRead={read} />
            ))}
          </div>
        </section>
      )}

      {showShop && (
        <section className="lx-section" aria-labelledby="lx-books-title">
          <div className="lx-section-head lx-section-head-col">
            <h2 id="lx-books-title">Playbooks</h2>
            <p>Read at your own pace, on any device.</p>
          </div>

          <div className="lx-book-grid">{SHOP_ORDER.map(productCard)}</div>
        </section>
      )}

      {showShop && (
        <section className="lx-section" aria-labelledby="lx-soon-title">
          <div className="lx-section-head lx-section-head-col">
            <h2 id="lx-soon-title">Next on Learn</h2>
            <p>More learning experiences are on the way.</p>
          </div>
          <div className="lx-soon-grid">
            {COMING_SOON.map((item) => (
              <article key={item.id} className="lx-soon">
                <div className="lx-soon-media">
                  <img src={item.image} alt="" />
                  <span className="lx-soon-label">Coming soon</span>
                </div>
                <h3 className="lx-book-title">{item.title}</h3>
                <p className="lx-book-text">{item.description}</p>
                <NotifyButton
                  on={notifyOn.has(item.id)}
                  busy={busyNotify === item.id}
                  onClick={() => toggleNotify(item.id)}
                  className="lx-notify-block"
                />
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "library" && (
        <section className="lx-section" aria-labelledby="lx-lib-title">
          <div className="lx-section-head lx-section-head-col">
            <h2 id="lx-lib-title">My library</h2>
            <p>Every book you’ve bought, and how far you’ve read.</p>
          </div>
          {!data && !loadError ? (
            <p className="lx-muted" role="status">Loading your library…</p>
          ) : library.length === 0 ? (
            <div className="lx-empty">
              <LibraryIcon size={28} aria-hidden="true" />
              <h3>Your library is empty</h3>
              <p>Books you buy will appear here, with your reading progress.</p>
              <button type="button" className="lx-cta" onClick={() => setTab("explore")}>
                Explore books
              </button>
            </div>
          ) : (
            <div className="lx-progress-grid">
              {library.map((item) => (
                <ProgressRow key={item.bookId} item={item} onRead={read} />
              ))}
            </div>
          )}
        </section>
      )}

      {buyingProduct && (
        <div
          className="learn-notify-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !startingCheckout) setBuying(null);
          }}
        >
          <section className="learn-notify-dialog lx-buy" role="dialog" aria-modal="true" aria-labelledby="lx-buy-title">
            <button
              className="learn-notify-close"
              type="button"
              aria-label="Close"
              onClick={() => setBuying(null)}
              disabled={startingCheckout}
            >
              <X size={20} />
            </button>
            <div className="lx-buy-head">
              <BookCover id={buying} size="sm" />
              <div>
                <h2 id="lx-buy-title">{buyingProduct.title}</h2>
                {buyingProduct.tagline && <p className="lx-muted">{buyingProduct.tagline}</p>}
              </div>
            </div>
            {currencies.length > 1 && (
              <div className="lx-currency" role="radiogroup" aria-label="Pay in">
                {currencies.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={currency === c}
                    className={`learn-chip ${currency === c ? "active" : ""}`}
                    onClick={() => setCurrency(c)}
                  >
                    {c === "NGN" ? "Naira (₦)" : "Dollars ($)"}
                  </button>
                ))}
              </div>
            )}
            <div className="lx-buy-total">
              <span>You pay</span>
              <strong>{formatPrice(offerActive ? buyingPrice.now : buyingPrice.full, currency)}</strong>
              {offerActive && buyingPrice.now < buyingPrice.full && (
                <s>{formatPrice(buyingPrice.full, currency)}</s>
              )}
            </div>
            <p className="lx-muted">
              One payment, yours to keep. It goes straight into My library and
              you can read it on any device.
            </p>
            {checkoutError && <p className="learn-notify-error" role="alert">{checkoutError}</p>}
            <button
              type="button"
              className="lx-cta lx-cta-block"
              onClick={goToPayment}
              disabled={startingCheckout || data?.available === false}
            >
              {startingCheckout ? "Opening secure payment…" : "Pay now"}
            </button>
            {data?.available === false && (
              <p className="lx-muted">Payments aren’t available right now. Please try again later.</p>
            )}
            <p className="lx-secure">Secure payment by Paystack</p>
          </section>
        </div>
      )}
    </div>
  );
}
