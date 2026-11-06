import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import { onReconnect, onStreakStatus } from "../lib/realtime";

// The member's streak status, kept live:
//   - loaded from GET /api/practice/streak (worked out in their time zone)
//   - updated instantly over Socket.IO after a practice on any device
//   - reloaded when the app comes back into view and just after local
//     midnight, when the day (and maybe the grace period) changes.
export default function useLiveStreak() {
  const [streak, setStreak] = useState(null);

  const refresh = useCallback(() => {
    api
      .get("/api/practice/streak")
      .then((response) => setStreak(response.data))
      .catch(() => setStreak((prev) => prev || { current: 0, longest: 0 }));
  }, []);

  useEffect(() => {
    refresh();
    const stopStatus = onStreakStatus((status) => setStreak(status));
    const stopReconnect = onReconnect(refresh);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopStatus();
      stopReconnect();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Reload a moment after the member's local midnight.
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 5, 0);
    const timer = setTimeout(refresh, midnight - now);
    return () => clearTimeout(timer);
  }, [refresh, streak?.today]);

  return streak;
}
