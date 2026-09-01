import { useEffect } from "react";
import { useEvent } from "@/context/EventContext";
import { applyTheme, mergeTheme, bgImageCss, BG_PRESETS, hexToHslTriplet } from "@/lib/theme";

/** Reads the saved theme + optional background image from settings and applies
 *  them to the document root. Renders nothing. Mounted once near the app root.
 *  Also caches the resolved background/accent so the boot script in index.html can
 *  apply them before first paint on the next load (prevents the default-gradient flash). */
export function ThemeApplier() {
  const { settings, bgImage } = useEvent();

  useEffect(() => {
    const theme = mergeTheme(settings.theme);
    applyTheme(theme);

    // A custom background image (if set) overrides the gradient preset.
    const appBg = bgImage ? bgImageCss(bgImage) : BG_PRESETS[theme.bgPreset]?.image ?? BG_PRESETS.tech.image;
    if (bgImage) {
      document.documentElement.style.setProperty("--app-bg", appBg);
    }

    // Cache for the no-flash boot script (see index.html).
    try {
      localStorage.setItem("sinova-appbg", appBg);
      localStorage.setItem("sinova-accent", hexToHslTriplet(theme.accent));
    } catch {
      /* storage full / disabled — non-fatal */
    }
  }, [settings.theme, bgImage]);

  return null;
}
