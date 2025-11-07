/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border, 0, 0%, 80%))",       // fallback to light gray
        input: "hsl(var(--input, 0, 0%, 95%))",        // fallback to very light gray
        ring: "hsl(var(--ring, 0, 0%, 70%))",
        background: "hsl(var(--background, 0, 0%, 100%))",
        foreground: "hsl(var(--foreground, 0, 0%, 10%))",
        primary: {
          DEFAULT: "hsl(var(--primary, 220, 90%, 56%))",
          foreground: "hsl(var(--primary-foreground, 0, 0%, 100%))",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 0, 0%, 50%))",
          foreground: "hsl(var(--secondary-foreground, 0, 0%, 100%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive, 0, 90%, 60%))",
          foreground: "hsl(var(--destructive-foreground, 0, 0%, 100%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 0, 0%, 95%))",
          foreground: "hsl(var(--muted-foreground, 0, 0%, 40%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, 210, 50%, 60%))",
          foreground: "hsl(var(--accent-foreground, 0, 0%, 100%))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover, 0, 0%, 100%))",
          foreground: "hsl(var(--popover-foreground, 0, 0%, 10%))",
        },
        card: {
          DEFAULT: "hsl(var(--card, 0, 0%, 100%))",
          foreground: "hsl(var(--card-foreground, 0, 0%, 10%))",
        },
        orange: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
      },
      borderRadius: {
        lg: "var(--radius, 0.5rem)",  // fallback if --radius missing
        md: "calc(var(--radius, 0.5rem) - 2px)",
        sm: "calc(var(--radius, 0.5rem) - 4px)",
      },
      fontFamily: {
        sans: [ "Proxima Nova", "Sofia Pro", "system-ui", "sans-serif"],
        display: ["Sofia Pro", "Proxima Nova", "Inter", "system-ui", "sans-serif"],
        body: [ "Proxima Nova", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "smoothFadeIn 1s ease-out",
        "slide-x": "smoothSlideX 1s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-down": "smoothSlideDown 1s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in-x": "smoothSlideInX 1s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-up": "smoothSlideUp 1s cubic-bezier(0.4, 0, 0.2, 1)",
        scale: "smoothScale 1s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
