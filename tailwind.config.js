/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          900: "#030611",
          800: "#060a1a",
          700: "#0a1026",
          600: "#0e1733",
        },
        cyber: {
          cyan: "#22d3ee",
          blue: "#38bdf8",
          electric: "#60a5fa",
          violet: "#a78bfa",
          danger: "#f43f5e",
          success: "#34d399",
          amber: "#fbbf24",
        },
      },
      fontFamily: {
        display: ['"Orbitron"', '"Rajdhani"', "system-ui", "sans-serif"],
        body: ['"Rajdhani"', '"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
        serif: ['"Playfair Display"', 'Georgia', "serif"],
        hand: ['"Caveat"', "cursive"],
        stamp: ['"Special Elite"', '"Courier New"', "monospace"],
      },
      boxShadow: {
        glow: "0 0 32px rgba(34,211,238,0.35), 0 0 80px rgba(96,165,250,0.15)",
        "glow-soft": "0 0 20px rgba(34,211,238,0.25)",
        "glow-violet": "0 0 32px rgba(167,139,250,0.35)",
        card: "0 10px 40px rgba(2,6,23,0.6), inset 0 0 0 1px rgba(34,211,238,0.08)",
      },
      backgroundImage: {
        grid:
          "linear-gradient(rgba(34,211,238,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.07) 1px, transparent 1px)",
        radial:
          "radial-gradient(1200px 600px at 50% -10%, rgba(34,211,238,0.14), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(167,139,250,0.10), transparent 60%)",
      },
      animation: {
        "pulse-slow": "pulse 4s ease-in-out infinite",
        "spin-slow": "spin 18s linear infinite",
        "scan": "scan 6s linear infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "10%": { opacity: "0.6" },
          "90%": { opacity: "0.6" },
          "100%": { transform: "translateY(100%)", opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
}
