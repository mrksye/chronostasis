/**
 * # chronostasis — React Native integration
 *
 * React Native runs React, so the reactive hook is identical to the web React adapter — this
 * entry only imports from `react`, never `react-native`, so it adds no extra peer dependency.
 *
 * - {@link useChronostasis} — read chronostasis state as a boolean, kept in sync via
 *   React's `useSyncExternalStore`
 *
 * There is intentionally **no** `useChronostasisBodyClass` here: React Native has no DOM, no
 * `document.body`, and no CSS `animation-play-state`. Gate your animations on the boolean
 * instead — pause an `Animated` / Reanimated loop, or a `setInterval` ticker, while it is `true`.
 *
 * @packageDocumentation
 */

import { useSyncExternalStore } from "react";
import { inChronostasis, subscribeChronostasis } from "./index";

/**
 * Read chronostasis state as a boolean that re-renders the component on every transition.
 *
 * Backed by {@link useSyncExternalStore}, so it is concurrent-safe.
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
