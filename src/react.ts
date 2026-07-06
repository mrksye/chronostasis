/**
 * # chronostasis — React integration
 *
 * A thin adapter that wraps the framework-agnostic core in `./index.ts` with React hooks.
 *
 * - {@link useChronostasis} — read chronostasis state as a boolean, kept in sync via
 *   React's `useSyncExternalStore`
 * - {@link useChronostasisBodyClass} — side effect that toggles a class on `document.body`
 *
 * The core's {@link subscribeChronostasis} already matches the shape React's external-store
 * subscribe expects (it returns an unsubscribe function), so the bridge is a one-liner.
 *
 * @packageDocumentation
 */

import { useEffect, useSyncExternalStore } from "react";
import { inChronostasis, subscribeChronostasis } from "./index";

/** Default body class name to toggle. */
const DEFAULT_BODY_CLASS = "chronostasis";

/**
 * Read chronostasis state as a boolean that re-renders the component on every transition.
 *
 * Backed by {@link useSyncExternalStore}, so it is concurrent-safe and returns a consistent
 * value during SSR (`inChronostasis()` is `false` on the server since no lease can be held).
 *
 * @example
 * ```tsx
 * function Clock() {
 *   const held = useChronostasis();
 *   useEffect(() => {
 *     if (held) return;       // do not start the ticker while chronostasis is held
 *     const id = setInterval(tick, 1000);
 *     return () => clearInterval(id);
 *   }, [held]);
 * }
 * ```
 */
export const useChronostasis = (): boolean =>
  useSyncExternalStore(subscribeChronostasis, inChronostasis, inChronostasis);

/**
 * Toggle a class on `document.body` whenever chronostasis state changes.
 *
 * Use it to pause CSS animations in bulk via a CSS selector.
 * Example: `body.chronostasis .star { animation-play-state: paused; }`
 *
 * The class is removed on unmount and whenever `className` changes.
 *
 * @param className Class name to apply. Defaults to `"chronostasis"`.
 */
export const useChronostasisBodyClass = (className: string = DEFAULT_BODY_CLASS): void => {
  const held = useChronostasis();
  useEffect(() => {
    document.body.classList.toggle(className, held);
    return () => {
      document.body.classList.remove(className);
    };
  }, [held, className]);
};
