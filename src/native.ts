/**
 * # chronostasis — vanilla DOM integration
 *
 * A thin adapter for use without any framework. Where the Solid / React / Vue adapters express
 * chronostasis as a reactive value, this one binds it directly to the DOM and hands you an
 * unsubscribe function to call yourself (there is no component lifecycle to lean on).
 *
 * - {@link chronostasisBodyClass} — toggle a class on `document.body` in sync with the state
 *
 * For anything more bespoke, use the core {@link subscribeChronostasis} directly.
 *
 * @packageDocumentation
 */

import { inChronostasis, subscribeChronostasis } from "./index";

/** Default body class name to toggle. */
const DEFAULT_BODY_CLASS = "chronostasis";

/**
 * Toggle a class on `document.body` whenever chronostasis state changes, starting from the
 * current state.
 *
 * Use it to pause CSS animations in bulk via a CSS selector.
 * Example: `body.chronostasis .star { animation-play-state: paused; }`
 *
 * Returns a cleanup function that unsubscribes and removes the class. Unlike the framework
 * adapters, nothing calls it for you — hold onto it and invoke it when you tear down.
 *
 * @example
 * ```ts
 * const stop = chronostasisBodyClass();
 * // ... later ...
 * stop();
 * ```
 *
 * @param className Class name to apply. Defaults to `"chronostasis"`.
 * @returns A function that unsubscribes and removes the class.
 */
export const chronostasisBodyClass = (
  className: string = DEFAULT_BODY_CLASS,
): (() => void) => {
  document.body.classList.toggle(className, inChronostasis());
  const unsubscribe = subscribeChronostasis((held) => {
    document.body.classList.toggle(className, held);
  });
  return () => {
    unsubscribe();
    document.body.classList.remove(className);
  };
};
