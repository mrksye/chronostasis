import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/solid.ts",
    "src/react.ts",
    "src/react-native.ts",
    "src/vue.ts",
    "src/svelte.ts",
    "src/native.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: "es2020",
  external: ["solid-js", "react", "vue", "svelte", "svelte/store"],
});
