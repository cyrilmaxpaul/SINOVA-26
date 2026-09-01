import { cn } from "@/lib/utils";
import type { ScreamLevel } from "@/lib/types";

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const hueFor = (level: number) => 120 - (clamp(level) / 100) * 120; // 120 green → 0 red

/**
 * One horizontal bar per teammate — name on the left, live loudness bar on the
 * right — reading straight from each person's device. Peak-hold tick shows their
 * loudest moment; the team's highest peak is what gets recorded.
 */
export function ScreamBars({ levels, className }: { levels: ScreamLevel[]; className?: string }) {
  const sorted = [...levels].sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  return (
    <div className={cn("space-y-2.5", className)}>
      {sorted.map((l) => {
        const lvl = clamp(l.level);
        const peak = clamp(l.peak);
        const hue = hueFor(lvl);
        return (
          <div key={l.id} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-sm font-medium sm:w-32" title={l.employeeName}>
              {l.employeeName}
            </span>
            <div
              className="relative h-4 flex-1 overflow-hidden rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, hsl(120 70% 45% / .16), hsl(60 80% 50% / .16), hsl(0 85% 50% / .16))",
              }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-100 ease-out"
                style={{
                  width: `${lvl}%`,
                  background: `linear-gradient(90deg, hsl(120 75% 45%), hsl(${hue} 85% 48%))`,
                }}
              />
              <div
                className="pointer-events-none absolute top-0 h-full w-0.5 bg-foreground/70"
                style={{ left: `calc(${peak}% - 1px)` }}
                title={`Peak ${Math.round(peak)}`}
              />
            </div>
            <span
              className="w-9 shrink-0 text-right text-sm font-bold tabular-nums"
              style={{ color: `hsl(${hue} 85% 45%)` }}
            >
              {Math.round(lvl)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
