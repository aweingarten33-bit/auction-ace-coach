import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display:   ['"Bebas Neue"', '"Anton"', '"Oswald"', "ui-sans-serif", "sans-serif"],
        headline:  ['"Bebas Neue"', '"Anton"', '"Oswald"', "ui-sans-serif", "sans-serif"],
        heading:   ['"Bebas Neue"', '"Anton"', "ui-sans-serif", "sans-serif"],
        condensed: ['"Bebas Neue"', '"Oswald"', "ui-sans-serif", "sans-serif"],
        editorial: ['"DM Sans"', '"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        serif:     ['"DM Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans:      ['"DM Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        body:      ['"DM Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono:      ['"JetBrains Mono"', "ui-monospace", "monospace"],
        data:      ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        "surface-2": "hsl(var(--surface-2))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        sm:   "0.75rem",
        md:   "1rem",
        lg:   "1.25rem",
        xl:   "1.5rem",
        "2xl":"2rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s ease-out",
        "accordion-up":   "accordion-up 0.3s ease-out",
        float:            "float 3s ease-in-out infinite",
        "fade-in":        "fade-in 0.3s ease-out both",
      },
      transitionDuration: {
        300: "300ms",
        500: "500ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
