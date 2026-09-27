/**
 * Preloader contract shared by the inline decision script, the overlay, the
 * Lenis gate and the hero choreography.
 *
 * The state lives on the overlay element itself, not on <html>: React 19
 * treats <html>/<body> as singletons and clears foreign attributes on them
 * when it hydrates.
 *
 * [data-preloader-root][data-state="on"]    set before first paint when the overlay should run
 * [data-preloader-root][data-state="done"]  set when the overlay has gone
 * window "gwallaga:ready"                    dispatched once the overlay has gone
 */
export const PRELOADER_SELECTOR = "[data-preloader-root]";
export const PRELOADER_ATTR = "data-state";
export const PRELOADER_SESSION_KEY = "gwallaga:preloaded";
export const READY_EVENT = "gwallaga:ready";

/**
 * Runs inline right after the overlay's markup, before first paint. Once per
 * session; never on admin routes, for reduced motion, or with save-data on.
 */
export const PRELOADER_DECISION_SCRIPT = `(function(){try{var d=document.querySelector(${JSON.stringify(PRELOADER_SELECTOR)});if(!d)return;if(/^\\/admin(\\/|$)/.test(location.pathname))return;if(sessionStorage.getItem(${JSON.stringify(PRELOADER_SESSION_KEY)}))return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var c=navigator.connection;if(c&&c.saveData)return;d.setAttribute(${JSON.stringify(PRELOADER_ATTR)},"on")}catch(e){}})();`;

/**
 * Development only: `?motion=slow` plays all GSAP motion at 1/6 speed so the
 * choreography can be reviewed (and recorded). Always 1 in production builds.
 */
export function motionDebugScale(): number {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return 1;
  return new URLSearchParams(window.location.search).get("motion") === "slow" ? 1 / 6 : 1;
}

/** True while the overlay is (or is about to be) on screen. */
export function preloaderActive(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector(PRELOADER_SELECTOR)?.getAttribute(PRELOADER_ATTR) === "on";
}

/**
 * Run `start` once the preloader has gone, or right away when it is not
 * running. A failsafe starts it anyway after `timeoutMs`. Returns a cleanup.
 */
export function whenBrandReady(start: () => void, timeoutMs = 2600): () => void {
  if (!preloaderActive()) {
    start();
    return () => {};
  }
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    window.removeEventListener(READY_EVENT, run);
    window.clearTimeout(timer);
    start();
  };
  window.addEventListener(READY_EVENT, run);
  const timer = window.setTimeout(run, timeoutMs / motionDebugScale());
  return () => {
    done = true;
    window.removeEventListener(READY_EVENT, run);
    window.clearTimeout(timer);
  };
}
