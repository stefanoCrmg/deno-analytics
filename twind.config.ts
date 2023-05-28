import { Options } from "$fresh/plugins/twindv1.ts"
import { defineConfig, Preset } from "twind"
import presetAutoPrefix from "twind-preset-autoprefix"
import presetTailWind from "twind-preset-tailwind"
import * as colors from "twind-preset-tailwind-colors"

export default {
  selfURL: import.meta.url,
  ...defineConfig({
    presets: [
      presetAutoPrefix() as Preset,
      presetTailWind({
        colors: {
          // This line is required. Otherwise, if removed, the values of other colors with be removed.
          ...colors,
          // Modify primary and secondary colors according to your color-scheme
          // primary: "#4f06be",
          // secondary: "#170139",
        },
        // deno-lint-ignore no-explicit-any
      }) as Preset<any>,
    ],
    theme: {
      extend: {
        backgroundImage: {
          "deno-pattern": "url('/background-pattern.svg')",
          "dark-deno-pattern": "url('/background-pattern-dark.svg')",
        },
      },
    },
    darkMode: "class",
  }),
} as Options
