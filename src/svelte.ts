/**
 * # chronostasis — Svelte integration
 *
 * A thin adapter that wraps the framework-agnostic core in `./index.ts` with a Svelte store.
 *
 * - {@link chronostasisStore} — chronostasis state as a readonly Svelte {@link Readable} store
 * - {@link useChronostasisBodyClass} — side effect that toggles a class on `document.body`
 *
 * The core's {@link subscribeChronostasis} already matches Svelte's store-start contract (a
 * subscribe function that returns an unsubscribe), so the bridge is a one-liner. The store is
 * lazy: it only subscribes to the core while it has at least one active Svelte subscriber.
 *
 * @packageDocumentation
 */

import { onDestroy } from "svelte";
import { readable, type Readable } from "svelte/store";
import { inChronostasis, subscribeChronostasis } from "./index";

/** Default body class name to toggle. */
const DEFAULT_BODY_CLASS = "chronostasis";

/**
 * Chronostasis state as a readonly Svelte store. Read it reactively with the `$` prefix.
 *
 * @example
 * ```svelte
 * <script>
 *   import { chronostasisStore } from "chronostasis/svelte";
 *   $: if (!$chronostasisStore) startTicker();
 * </script>
 * ```
 */
export const chronostasisStore: Readable<boolean> = readable(
  inChronostasis(),
  (set) => subscribeChronostasis(set),
);

/**
 * Toggle a class on `document.body` whenever chronostasis state changes, starting from the
 * current state.
 *
 * Use it to pause CSS animations in bulk via a CSS selector.
 * Example: `body.chronostasis .star { animation-play-state: paused; }`
 *
 * Must be called during component initialization (it registers an `onDestroy`). The class is
 * removed when the component is destroyed.
 *
 * @param className Class name to apply. Defaults to `"chronostasis"`.
 */
export const useChronostasisBodyClass = (className: string = DEFAULT_BODY_CLASS): void => {
  const unsubscribe = chronostasisStore.subscribe((held) => {
    document.body.classList.toggle(className, held);
  });
  onDestroy(() => {
    unsubscribe();
    document.body.classList.remove(className);
  });
};
