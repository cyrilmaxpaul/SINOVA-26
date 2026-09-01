/**
 * Live-tunable glassmorphism theme. Admin edits it in the Appearance panel;
 * the values persist in settings/app.theme and apply app-wide (employees + admin
 * + big screen) via applyTheme(). Light/dark base tints are handled in CSS so the
 * same config works in either mode.
 */

import type { ThemeConfig } from "./types";

export type { ThemeConfig };

export const DEFAULT_THEME: ThemeConfig = {
  bgPreset: "tech",
  accent: "#7c5cff", // tech blue → violet accent
  cardOpacity: 78,
  blur: 12,
};

export const BG_PRESETS: Record<ThemeConfig["bgPreset"], { label: string; image: string }> = {
  tech: {
    label: "Tech (blue → violet)",
    image:
      "radial-gradient(60% 55% at 0% 0%, hsl(226 90% 60% / 0.20), transparent 60%), radial-gradient(55% 55% at 100% 0%, hsl(268 90% 62% / 0.20), transparent 60%), radial-gradient(70% 60% at 50% 110%, hsl(196 92% 55% / 0.14), transparent 60%)",
  },
  aurora: {
    label: "Aurora (multi-color)",
    image:
      "radial-gradient(50% 50% at 10% 10%, hsl(268 90% 62% / 0.24), transparent 60%), radial-gradient(50% 50% at 90% 15%, hsl(330 90% 62% / 0.20), transparent 60%), radial-gradient(55% 55% at 80% 100%, hsl(170 85% 50% / 0.18), transparent 60%), radial-gradient(45% 45% at 15% 95%, hsl(28 95% 58% / 0.16), transparent 60%)",
  },
  sunset: {
    label: "Sunset (violet → pink → amber)",
    image:
      "radial-gradient(60% 55% at 0% 0%, hsl(268 90% 62% / 0.20), transparent 60%), radial-gradient(55% 55% at 100% 20%, hsl(330 90% 63% / 0.20), transparent 60%), radial-gradient(70% 60% at 50% 110%, hsl(35 95% 58% / 0.16), transparent 60%)",
  },
  mono: {
    label: "Minimal (subtle grey)",
    image:
      "radial-gradient(60% 55% at 0% 0%, hsl(240 20% 60% / 0.10), transparent 60%), radial-gradient(55% 55% at 100% 0%, hsl(240 20% 50% / 0.10), transparent 60%)",
  },
};

/** Convert a hex color (#rrggbb) to an "H S% L%" triplet for Tailwind's hsl(var(--x)). */
export function hexToHslTriplet(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const light = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      default: hue = (r - g) / d + 4;
    }
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%`;
}

/** CSS for a custom background image with a theme-tinted scrim for readability. */
export function bgImageCss(uri: string): string {
  return `linear-gradient(hsl(var(--background) / 0.55), hsl(var(--background) / 0.72)), url("${uri}")`;
}

/** Apply a theme config to the document root by setting CSS variables. */
export function applyTheme(t: ThemeConfig) {
  const root = document.documentElement;
  const accent = hexToHslTriplet(t.accent);
  root.style.setProperty("--primary", accent);
  root.style.setProperty("--ring", accent);
  root.style.setProperty("--glass-alpha", String(Math.min(100, Math.max(30, t.cardOpacity)) / 100));
  root.style.setProperty("--glass-blur", `${Math.max(0, Math.min(30, t.blur))}px`);
  root.style.setProperty("--app-bg", BG_PRESETS[t.bgPreset]?.image ?? BG_PRESETS.tech.image);
}

export function mergeTheme(partial?: Partial<ThemeConfig> | null): ThemeConfig {
  return { ...DEFAULT_THEME, ...(partial ?? {}) };
}
