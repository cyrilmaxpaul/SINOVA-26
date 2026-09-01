import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimeUnit } from "@/lib/types";

function fmt(totalMs: number) {
  const s = Math.floor(totalMs / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** Built-in stopwatch for time-based games. Calls onCommit(value in `unit`). */
export function Stopwatch({ unit, onCommit }: { unit: TimeUnit; onCommit: (value: number) => void }) {
  const [elapsed, setElapsed] = useState(0); // ms
  const [running, setRunning] = useState(false);
  const startRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    startRef.current = performance.now() - elapsed;
    const tick = () => {
      setElapsed(performance.now() - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function commit() {
    const seconds = elapsed / 1000;
    const value = unit === "minutes" ? Math.round((seconds / 60) * 100) / 100 : Math.round(seconds);
    onCommit(value);
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Timer className="h-3.5 w-3.5" /> Stopwatch
        </span>
        <span className="font-mono text-2xl font-bold tabular-nums">{fmt(elapsed)}</span>
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={running ? "secondary" : "default"}
          className="flex-1"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "Pause" : "Start"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setRunning(false);
            setElapsed(0);
          }}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setRunning(false);
            commit();
          }}
        >
          Use time
        </Button>
      </div>
    </div>
  );
}
