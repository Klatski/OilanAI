import { useEffect, useState } from "react";

/**
 * Two responsibilities:
 *
 * 1. Offline indicator — persistent banner whenever the browser is offline.
 *    App still works (local Socratic fallback, local cards, localStorage
 *    progress), we just explain what's going on.
 *
 * 2. "Ready for offline" toast — the PWA service worker fires an event
 *    the first time it finishes pre-caching the app shell. From that
 *    moment on, a hard refresh without internet will still load OilanAI.
 *
 * Detection strategy:
 *   - primary:   window online/offline events
 *   - fallback:  re-poll navigator.onLine every 3s AND whenever the tab
 *                becomes visible. Some browsers (and especially DevTools
 *                "Offline" mode) don't always fire the event reliably.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    document.addEventListener("visibilitychange", sync);
    // Defensive polling in case the events don't fire (rare, but happens
    // in some Chromium quirks when DevTools toggles the offline switch).
    const poll = window.setInterval(sync, 3000);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      document.removeEventListener("visibilitychange", sync);
      window.clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    const onReady = () => {
      setOfflineReady(true);
      window.setTimeout(() => setOfflineReady(false), 6500);
    };
    window.addEventListener("oilanai:offline-ready", onReady);
    return () => window.removeEventListener("oilanai:offline-ready", onReady);
  }, []);

  return (
    <>
      {!online && (
        <div className="offline-banner" role="status" aria-live="polite">
          <span className="offline-banner__dot" aria-hidden />
          <span>
            <strong>Офлайн-режим.</strong> ИИ будет работать на локальной
            симуляции, карточки и прогресс сохраняются как обычно.
          </span>
        </div>
      )}

      {offlineReady && (
        <div className="offline-ready-toast" role="status">
          <span className="offline-ready-toast__icon" aria-hidden>
            ✓
          </span>
          <span>
            <strong>Приложение готово к работе офлайн.</strong>{" "}
            Можно выключать интернет — OilanAI всё равно загрузится.
          </span>
        </div>
      )}
    </>
  );
}
