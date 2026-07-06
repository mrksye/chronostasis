/**
 * # chronostasis — Vue integration
 *
 * A thin adapter that wraps the framework-agnostic core in `./index.ts` with Vue reactivity.
 *
 * - {@link useChronostasis} — read chronostasis state as a readonly {@link Ref}
 * - {@link useChronostasisBodyClass} — side effect that toggles a class on `document.body`
 *
 * Both register an `onScopeDispose`, so they must be called inside an active effect scope
 * (= component `setup`, or an explicit `effectScope`).
 *
 * @packageDocumentation
 */

import { onScopeDispose, readonly, ref, watch, type Ref } from "vue";
import { inChronostasis, subscribeChronostasis } from "./index";

/** Default body class name to toggle. */
const DEFAULT_BODY_CLASS = "chronostasis";

/**
 * Read chronostasis state as a readonly Vue ref that updates on every transition.
 *
 * Internally just registers via {@link subscribeChronostasis} and mirrors the boolean into a
 * `ref`. The subscription is torn down automatically when the surrounding scope disposes.
 *
 * @example
 * ```ts
 * const held = useChronostasis();
 * watch(held, (isHeld) => {
 *   if (isHeld) return;       // do not start the ticker while chronostasis is held
 *   const id = setInterval(tick, 1000);
 *   onScopeDispose(() => clearInterval(id));
 * });
 * ```
 */
export const useChronostasis = (): Readonly<Ref<boolean>> => {
  const held = ref(inChronostasis());
  onScopeDispose(
    subscribeChronostasis((value) => {
      held.value = value;
    }),
  );
  return readonly(held);
};

/**
 * Toggle a class on `document.body` whenever chronostasis state changes.
 *
 * Use it to pause CSS animations in bulk via a CSS selector.
 * Example: `body.chronostasis .star { animation-play-state: paused; }`
 *
 * The class is removed when the surrounding scope disposes.
 *
 * @param className Class name to apply. Defaults to `"chronostasis"`.
 */
export const useChronostasisBodyClass = (className: string = DEFAULT_BODY_CLASS): void => {
  const held = useChronostasis();
  watch(
    held,
    (value) => {
      document.body.classList.toggle(className, value);
    },
    { immediate: true },
  );
  onScopeDispose(() => {
    document.body.classList.remove(className);
  });
};
