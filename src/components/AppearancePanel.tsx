import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ImagePlus, Loader2, Palette, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEvent } from "@/context/EventContext";
import { saveSettings, saveBackgroundImage, clearBackgroundImage } from "@/lib/firestore";
import { fileToBackgroundDataUrl } from "@/lib/image";
import { applyTheme, mergeTheme, bgImageCss, BG_PRESETS, DEFAULT_THEME } from "@/lib/theme";
import type { ThemeConfig } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCENT_SWATCHES = ["#7c5cff", "#3b82f6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];

export function AppearancePanel() {
  const { settings, bgImage } = useEvent();
  const [cfg, setCfg] = useState<ThemeConfig>(mergeTheme(settings.theme));
  const [bgLocal, setBgLocal] = useState<string>(bgImage);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Persisted values load asynchronously; sync local state once when they first arrive
  // (afterwards the admin's edits win and won't be clobbered by the snapshot).
  const initedTheme = useRef(false);
  const initedBg = useRef(false);
  useEffect(() => {
    if (!initedTheme.current && settings.theme) {
      setCfg(mergeTheme(settings.theme));
      initedTheme.current = true;
    }
  }, [settings.theme]);
  useEffect(() => {
    if (!initedBg.current && bgImage) {
      setBgLocal(bgImage);
      initedBg.current = true;
    }
  }, [bgImage]);

  // Live preview: apply theme, then override the background with the uploaded image if present.
  useEffect(() => {
    applyTheme(cfg);
    if (bgLocal) document.documentElement.style.setProperty("--app-bg", bgImageCss(bgLocal));
  }, [cfg, bgLocal]);

  // On unmount, restore whatever is actually persisted.
  useEffect(() => {
    return () => {
      applyTheme(mergeTheme(settings.theme));
      if (bgImage) document.documentElement.style.setProperty("--app-bg", bgImageCss(bgImage));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) {
    setCfg((c) => ({ ...c, [key]: value }));
  }

  async function handleBgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const dataUrl = await fileToBackgroundDataUrl(file);
      setBgLocal(dataUrl);
      toast.success("Background ready — click Save to apply for everyone");
    } catch {
      toast.error("Couldn't process that image.");
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    setSaving(true);
    try {
      await saveSettings({ theme: cfg });
      if (bgLocal !== bgImage) {
        if (bgLocal) await saveBackgroundImage(bgLocal);
        else await clearBackgroundImage();
      }
      toast.success("Appearance saved for everyone");
    } catch {
      toast.error("Failed to save appearance.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setCfg(DEFAULT_THEME);
    setBgLocal("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" /> Appearance
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tune the look. Changes preview live; <b>Save</b> applies it for all screens (works in light & dark).
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Background gradient presets */}
        <div className="space-y-2">
          <Label>Background {bgLocal && <span className="text-muted-foreground">(image active — overrides preset)</span>}</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(BG_PRESETS) as ThemeConfig["bgPreset"][]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  set("bgPreset", key);
                  setBgLocal(""); // choosing a preset clears the custom image
                }}
                className={cn(
                  "rounded-lg border p-2 text-left text-xs font-medium transition-all",
                  !bgLocal && cfg.bgPreset === key
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span
                  className="mb-1 block h-10 w-full rounded-md"
                  style={{ backgroundImage: BG_PRESETS[key].image, backgroundColor: "hsl(var(--muted))" }}
                />
                {BG_PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom background image */}
        <div className="space-y-2">
          <Label>Background image (optional)</Label>
          <div className="flex items-center gap-3">
            <div
              className="h-16 w-24 shrink-0 rounded-lg border bg-muted bg-cover bg-center"
              style={bgLocal ? { backgroundImage: `url("${bgLocal}")` } : undefined}
            >
              {!bgLocal && (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBgFile} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {bgLocal ? "Replace" : "Upload"}
            </Button>
            {bgLocal && (
              <Button variant="ghost" size="icon" onClick={() => setBgLocal("")} aria-label="Remove background">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            A subtle theme tint keeps text readable. Card transparency &amp; frost below still apply on top.
          </p>
        </div>

        {/* Accent */}
        <div className="space-y-2">
          <Label>Accent color (buttons, icons, highlights)</Label>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("accent", c)}
                className={cn(
                  "h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition-all",
                  cfg.accent.toLowerCase() === c.toLowerCase() ? "ring-2 ring-foreground" : ""
                )}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="color"
                value={cfg.accent}
                onChange={(e) => set("accent", e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border bg-transparent"
              />
              <span className="font-mono text-xs text-muted-foreground">{cfg.accent}</span>
            </label>
          </div>
        </div>

        {/* Transparency */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Card opacity (transparency)</Label>
            <span className="text-xs text-muted-foreground">{cfg.cardOpacity}%</span>
          </div>
          <input
            type="range"
            min={40}
            max={100}
            value={cfg.cardOpacity}
            onChange={(e) => set("cardOpacity", Number(e.target.value))}
            className="w-full accent-[hsl(var(--primary))]"
          />
        </div>

        {/* Frost / blur */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Frost (blur)</Label>
            <span className="text-xs text-muted-foreground">{cfg.blur}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={24}
            value={cfg.blur}
            onChange={(e) => set("blur", Number(e.target.value))}
            className="w-full accent-[hsl(var(--primary))]"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={reset} className="flex-1">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button onClick={save} disabled={saving} className="flex-1">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save for everyone"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
