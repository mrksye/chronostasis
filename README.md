# chronostasis

> Pause background animation ticks while a heavy compositing effect runs on top.

**chronostasis (クロノスタシス)** — the visual illusion where the second hand of a clock appears to freeze for a moment when you first glance at it. ([Wikipedia](https://en.wikipedia.org/wiki/Chronostasis))

This module provides a tiny shared-state primitive that lets you suspend the dynamic background of a page (clock displays, CSS animations, `setInterval` / `requestAnimationFrame` side effects) for the duration of a heavy compositing effect running on top of it.

- Zero dependencies
- Framework-agnostic vanilla TypeScript core
- SolidJS adapter included; bridge to React / Vue / vanilla DOM in a few lines
- Lease-style acquire counter — multiple callers can hold chronostasis at the same time

## Why

Compositing effects like `backdrop-filter: blur` are expensive precisely because the browser has to re-blur every time the underlying pixels change. If the layer underneath is completely still, the browser can cache the blurred result on its compositing layer and paint it once — which makes the effect viable on low-end hardware (older iPads, low-cost tablets, education tablets, etc.).

The same problem appears beyond blur. Long opacity transitions, transform springs, and other "recomposite the layer underneath every frame" effects all suffer when background work keeps mutating that layer. While chronostasis is held, you suspend those background ticks so compositing resources can go to the foreground effect.

## Install

```sh
npm install chronostasis
```

```sh
pnpm add chronostasis
```

```sh
yarn add chronostasis
```

`solid-js` is an optional peer dependency — only required if you import the `chronostasis/solid` entry point.

## Usage

### Vanilla (any framework)

```ts
import {
  inChronostasis,
  requestChronostasis,
  subscribeChronostasis,
} from "chronostasis";

// 1. Pause a ticker while chronostasis is held.
let timer: number | undefined;
subscribeChronostasis((held) => {
  if (held) {
    clearInterval(timer);
    timer = undefined;
  } else {
    timer = setInterval(tick, 1000);
  }
});

// 2. Acquire chronostasis around a heavy effect.
function openBlurredPicker() {
  const release = requestChronostasis();
  try {
    // ... show the picker with backdrop-filter: blur ...
  } finally {
    // call release() when the picker closes
  }
}
```

`requestChronostasis()` returns a release function. When several callers hold leases at the same time, chronostasis stays held until the **last** one releases.

### SolidJS

```tsx
import { onCleanup, createEffect, on } from "solid-js";
import { requestChronostasis } from "chronostasis";
import { useChronostasis, useChronostasisBodyClass } from "chronostasis/solid";

// Toggle `body.chronostasis` whenever chronostasis is held.
// Pair this with CSS like:
//   body.chronostasis .star { animation-play-state: paused; }
function App() {
  useChronostasisBodyClass();
  return <Routes />;
}

// Pause a ticker reactively.
function Clock() {
  const held = useChronostasis();
  createEffect(on(held, (isHeld) => {
    if (isHeld) return;
    const id = setInterval(tick, 1000);
    onCleanup(() => clearInterval(id));
  }));
}

// Hold chronostasis for the lifetime of a component.
function BlurredPicker() {
  onCleanup(requestChronostasis()); // released automatically on unmount
  return <div class="picker" />;
}
```

Pairing `requestChronostasis()` with `onCleanup` makes the release structurally guaranteed — there is no "forgot to leave" trap.

### Other frameworks

To bridge to React / Vue / vanilla DOM, wrap `subscribeChronostasis` in your framework's external-store primitive:

```ts
// React example
import { useSyncExternalStore } from "react";
import { inChronostasis, subscribeChronostasis } from "chronostasis";

export const useChronostasis = () =>
  useSyncExternalStore(subscribeChronostasis, inChronostasis, inChronostasis);
```

See `src/solid.ts` for a reference adapter.

## API

### Core (`chronostasis`)

#### `inChronostasis(): boolean`

Synchronous getter. Returns `true` while at least one lease is held.

#### `requestChronostasis(): () => void`

Acquires one lease and returns its release function. The release function is idempotent — calling it more than once is harmless.

#### `subscribeChronostasis(listener: (held: boolean) => void): () => void`

Subscribes to state transitions. The listener fires only at the boundaries (`0 → 1` and `1 → 0`); intermediate changes to the acquire count do not fire it. Returns an unsubscribe function. Adding the same listener multiple times has no effect (the underlying `Set` deduplicates).

### SolidJS (`chronostasis/solid`)

Both must be called inside a reactive owner (component setup).

#### `useChronostasis(): Accessor<boolean>`

Reads chronostasis state as a Solid reactive accessor.

#### `useChronostasisBodyClass(className?: string): void`

Toggles a class (default: `"chronostasis"`) on `document.body` whenever chronostasis state changes. Useful for pausing CSS animations in bulk via a CSS selector:

```css
body.chronostasis .star {
  animation-play-state: paused;
}
```

## License

MIT © [mrksye](https://github.com/mrksye)
