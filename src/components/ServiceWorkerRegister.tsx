"use client";

import { useEffect } from "react";

/**
 * Registers the BhashaVerse service worker once the page is idle.
 *
 * - Skipped in development to avoid stale-cache surprises during HMR.
 * - Registered against `/sw.js` so the scope covers the whole app.
 * - Failures are logged but never thrown; the app still works without SW.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Unregister any pre-existing worker in dev so stale builds don't stick around.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      });
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("[sw] registration failed", err);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
