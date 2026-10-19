import { useCallback, useEffect, useRef, useState } from "react";
import { fetchQueryUsage, type QueryUsage } from "../api/usage";

/** How often the usage meter re-reads the backend's total (while it's shown). */
export const USAGE_REFRESH_MS = 60_000;

/**
 * The session's BigQuery usage for the rail's meter, or null while it's off, unread, or unreadable.
 *
 * While `enabled` it reads when switched on or mounted, whenever `refreshKey` changes (the rail
 * passes the recent-searches list, which a search that loaded is what moves), and otherwise every
 * minute. Reads can overlap, so only the newest one's reply is kept. If a read fails the meter goes
 * blank rather than showing figures that would look authoritative exactly when the backend is
 * unreachable; the Usage page is where that failure is explained.
 */
export function useUsageMeter(enabled: boolean, refreshKey: unknown): QueryUsage | null {
  const [usage, setUsage] = useState<QueryUsage | null>(null);
  const read = useRef(0);
  const readUsage = useCallback(() => {
    const current = ++read.current;
    fetchQueryUsage()
      .then((next) => {
        if (current === read.current) setUsage(next);
      })
      .catch(() => {
        if (current === read.current) setUsage(null);
      });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setUsage(null);
      return;
    }
    readUsage();
    const timer = window.setInterval(readUsage, USAGE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [enabled, refreshKey, readUsage]);

  return enabled ? usage : null;
}
