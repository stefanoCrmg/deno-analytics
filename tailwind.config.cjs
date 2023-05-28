/** This file exists only to get the tailwindCSS intellisense to work because the vscode twind intellisense is broken. */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      backgroundImage: {
        "deno-pattern": "url('/background-pattern.svg')",
        "dark-deno-pattern": "url('/background-pattern-dark.svg')",
      },
    },
  },
  plugins: [],
}