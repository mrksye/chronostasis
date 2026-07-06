# chronostasis

> Pause background animation ticks while a heavy compositing effect runs on top.

**chronostasis (クロノスタシス)** — the visual illusion where the second hand of a clock appears to freeze for a moment when you first glance at it. ([Wikipedia](https://en.wikipedia.org/wiki/Chronostasis))

This module provides a tiny shared-state primitive that lets you suspend the dynamic background of a page (clock displays, CSS animations, `setInterval` / `requestAnimationFrame` side effects) for the duration of a heavy compositing effect running on top of it.

- Zero dependencies
- Framework-agnostic vanilla TypeScript core
- SolidJS, React, React Native, Vue, Svelte, and vanilla DOM adapters included
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

`solid-js`, `react`, `vue`, and `svelte` are optional peer dependencies — each is only required if you import the matching entry point (`chronostasis/solid`, `chronostasis/react`, `chronostasis/vue`, `chronostasis/svelte`). The `chronostasis/native` entry point has no peer dependency.

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

### React

```tsx
import { useEffect } from "react";
import { requestChronostasis } from "chronostasis";
import { useChronostasis, useChronostasisBodyClass } from "chronostasis/react";

// Toggle `body.chronostasis` whenever chronostasis is held.
function App() {
  useChronostasisBodyClass();
  return <Routes />;
}

// Pause a ticker reactively.
function Clock() {
  const held = useChronostasis();
  useEffect(() => {
    if (held) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [held]);
}

// Hold chronostasis for the lifetime of a component.
function BlurredPicker() {
  useEffect(() => requestChronostasis(), []); // released automatically on unmount
  return <div className="picker" />;
}
```

`useChronostasis` is backed by `useSyncExternalStore`, so it is concurrent-safe and SSR-consistent.

### React Native

```tsx
import { useEffect, useState } from "react";
import { Animated } from "react-native";
import { requestChronostasis } from "chronostasis";
import { useChronostasis } from "chronostasis/react-native";

// Pause a ticker reactively.
function Clock() {
  const held = useChronostasis();
  useEffect(() => {
    if (held) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [held]);
}

// Hold chronostasis for the lifetime of a component.
function HeavyOverlay() {
  useEffect(() => requestChronostasis(), []); // released automatically on unmount
  return null;
}
```

React Native has no DOM, so this entry deliberately omits `useChronostasisBodyClass` — gate your `Animated` / Reanimated loops (or `setInterval` tickers) on the boolean instead. It imports only from `react`, so it adds no extra peer dependency beyond React itself.

### Vue

```vue
<script setup lang="ts">
import { watch, onScopeDispose } from "vue";
import { requestChronostasis } from "chronostasis";
import { useChronostasis, useChronostasisBodyClass } from "chronostasis/vue";

// Toggle `body.chronostasis` whenever chronostasis is held.
useChronostasisBodyClass();

// Pause a ticker reactively.
const held = useChronostasis();
watch(held, (isHeld) => {
  if (isHeld) return;
  const id = setInterval(tick, 1000);
  onScopeDispose(() => clearInterval(id));
});

// Hold chronostasis for the lifetime of a component.
onScopeDispose(requestChronostasis()); // released automatically on unmount
</script>
```

`useChronostasis` returns a readonly `Ref<boolean>`. Both composables must be called inside an active effect scope (component `setup`).

### Svelte

```svelte
<script lang="ts">
  import { onDestroy } from "svelte";
  import { requestChronostasis } from "chronostasis";
  import { chronostasisStore, useChronostasisBodyClass } from "chronostasis/svelte";

  // Toggle `body.chronostasis` whenever chronostasis is held.
  useChronostasisBodyClass();

  // Pause a ticker reactively — read the store with `$`.
  $: if (!$chronostasisStore) {
    const id = setInterval(tick, 1000);
    onDestroy(() => clearInterval(id));
  }

  // Hold chronostasis for the lifetime of a component.
  onDestroy(requestChronostasis()); // released automatically on destroy
</script>
```

`chronostasisStore` is a readonly Svelte store — read it reactively with the `$` prefix. It is lazy: it only subscribes to the core while it has at least one active subscriber.

### Vanilla DOM

```ts
import { chronostasisBodyClass, requestChronostasis } from "chronostasis";
import { chronostasisBodyClass as bindBodyClass } from "chronostasis/native";

// Toggle `body.chronostasis` in sync with the state. Returns a cleanup function.
const stop = bindBodyClass();
// ... later, when you tear down ...
stop();
```

Unlike the framework adapters, nothing calls the returned cleanup for you — hold onto it and invoke it yourself.

See `src/solid.ts` for a reference adapter if you need to bridge another framework.

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

### React (`chronostasis/react`)

#### `useChronostasis(): boolean`

Reads chronostasis state as a boolean, re-rendering on every transition. Backed by `useSyncExternalStore` (concurrent-safe, SSR-consistent).

#### `useChronostasisBodyClass(className?: string): void`

Toggles a class (default: `"chronostasis"`) on `document.body` whenever chronostasis state changes. The class is removed on unmount and whenever `className` changes.

### React Native (`chronostasis/react-native`)

#### `useChronostasis(): boolean`

Reads chronostasis state as a boolean, re-rendering on every transition. Backed by `useSyncExternalStore`. No `useChronostasisBodyClass` is exported — React Native has no DOM.

### Vue (`chronostasis/vue`)

Both composables must be called inside an active effect scope (component `setup`).

#### `useChronostasis(): Readonly<Ref<boolean>>`

Reads chronostasis state as a readonly Vue ref. The subscription is torn down automatically when the surrounding scope disposes.

#### `useChronostasisBodyClass(className?: string): void`

Toggles a class (default: `"chronostasis"`) on `document.body` whenever chronostasis state changes. The class is removed when the surrounding scope disposes.

### Svelte (`chronostasis/svelte`)

#### `chronostasisStore: Readable<boolean>`

Chronostasis state as a readonly Svelte store. Read it reactively with the `$` prefix. Lazy — it only subscribes to the core while it has at least one active subscriber.

#### `useChronostasisBodyClass(className?: string): void`

Toggles a class (default: `"chronostasis"`) on `document.body` whenever chronostasis state changes. Must be called during component initialization; the class is removed when the component is destroyed.

### Vanilla DOM (`chronostasis/native`)

#### `chronostasisBodyClass(className?: string): () => void`

Toggles a class (default: `"chronostasis"`) on `document.body` in sync with chronostasis state, starting from the current state. Returns a cleanup function that unsubscribes and removes the class — call it yourself when you tear down.

## License

MIT © [mrksye](https://github.com/mrksye)
