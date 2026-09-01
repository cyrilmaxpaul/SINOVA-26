import { cn } from "@/lib/utils";

/** Map a 0–100 loudness level to a hue: 120° (green) → 0° (red). */
function hueFor(level: number): number {
  return 120 - (Math.max(0, Math.min(100, level)) / 100) * 120;
}

interface Props {
  level: number; // live 0–100
  peak?: number; // optional peak marker 0–100
  db?: number; // optional approximate dBFS readout (<= 0)
  label?: string;
  className?: string;
}

/** Green→red loudness meter that fluctuates with the live level. */
export function ScreamMeter({ level, peak, db, label, className }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(level)));
  const hue = hueFor(clamped);
  const showDb = db != null && isFinite(db);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex items-end justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label ?? "Loudness"}</span>
        <span className="flex items-baseline gap-1.5">
          {showDb && <span className="text-[11px] tabular-nums text-muted-foreground">≈{Math.round(db!)} dB</span>}
          <span className="text-2xl font-extrabold tabular-nums" style={{ color: `hsl(${hue} 85% 45%)` }}>
            {clamped}
          </span>
        </span>
      </div>
      <div
        className="relative h-6 w-full overflow-hidden rounded-full"
        style={{
          background:
            "linear-gradient(90deg, hsl(120 70% 45% / .18), hsl(60 80% 50% / .18), hsl(0 85% 50% / .18))",
        }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-75"
          style={{
            width: `${clamped}%`,
            background: `linear-gradient(90deg, hsl(120 75% 45%), hsl(${hue} 85% 48%))`,
          }}
        />
        {peak != null && peak > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground/70"
            style={{ left: `calc(${Math.max(0, Math.min(100, peak))}% - 1px)` }}
            title={`Peak ${Math.round(peak)}`}
          />
        )}
      </div>
      {peak != null && (
        <p className="mt-1 text-right text-[11px] text-muted-foreground">
          Peak <span className="font-semibold text-foreground">{Math.round(peak)}</span>
        </p>
      )}
    </div>
  );
}
