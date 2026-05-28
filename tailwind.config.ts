import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15130f",
        panel: "#fffdf7",
        wire: "#d8d0c2",
        acid: "#b8f052",
        rust: "#d56a3a",
        signal: "#4267ff"
      }
    }
  },
  plugins: []
};

export default config;
