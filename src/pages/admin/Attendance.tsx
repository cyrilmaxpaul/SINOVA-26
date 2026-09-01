import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { CheckCircle2, MapPin, Printer, RotateCcw, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEvent } from "@/context/EventContext";
import { useAttendance } from "@/hooks/useModuleData";
import { awardAttendance, resetAttendance } from "@/lib/firestore";
import { computeAttendanceStandings } from "@/lib/attendance";
import { ATTENDANCE_TOKEN } from "@/lib/constants";
import { resolveColor } from "@/lib/teamColors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const RANK_STYLE = ["bg-amber-400/20 text-amber-600 dark:text-amber-400", "bg-slate-400/20 text-slate-600 dark:text-slate-300", "bg-orange-400/20 text-orange-600 dark:text-orange-400"];

export default function AdminAttendance() {
  const { admin } = useAuth();
  const { teams, employees } = useEvent();
  const { records, awards } = useAttendance();
  const [confirmReset, setConfirmReset] = useState(false);
  const awarding = useRef<Set<string>>(new Set());

  const standings = useMemo(
    () => computeAttendanceStandings(teams, employees, records),
    [teams, employees, records]
  );

  const awardedIds = useMemo(() => new Set(awards.map((a) => a.id)), [awards]);

  // Auto-award 10/5/1 to teams that just completed, in completion order. Idempotent.
  useEffect(() => {
    if (!admin) return;
    const complete = standings
      .filter((s) => s.complete && s.rank > 0)
      .sort((a, b) => a.rank - b.rank);
    for (const s of complete) {
      if (awardedIds.has(s.teamId) || awarding.current.has(s.teamId)) continue;
      awarding.current.add(s.teamId);
      awardAttendance({
        teamId: s.teamId,
        teamName: s.teamName,
        rank: s.rank,
        points: s.points,
        completedAtMs: s.completedAtMs ?? 0,
        awardedBy: admin.email,
      })
        .then((did) => {
          if (did && s.points > 0) toast.success(`${s.teamName}: attendance #${s.rank} → +${s.points}`);
        })
        .catch((e) => console.error("awardAttendance", e))
        .finally(() => awarding.current.delete(s.teamId));
    }
  }, [standings, awardedIds, admin]);

  const sorted = useMemo(() => {
    return [...standings].sort((a, b) => {
      if (a.complete && b.complete) return (a.completedAtMs ?? 0) - (b.completedAtMs ?? 0);
      if (a.complete) return -1;
      if (b.complete) return 1;
      return b.present / (b.total || 1) - a.present / (a.total || 1);
    });
  }, [standings]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  function print() {
    const svg = document.getElementById("attendance-qr")?.outerHTML ?? "";
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`
      <html><head><title>SINOVA'26 — Attendance</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:48px}
      h1{font-size:32px;margin:0 0 4px}p{color:#555;margin:0 0 24px}svg{width:360px;height:360px}</style>
      </head><body><h1>SINOVA'26 Attendance</h1><p>Scan from your seat to clock in</p>${svg}
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  async function doReset() {
    try {
      await resetAttendance();
      toast.success("Attendance reset");
    } catch {
      toast.error("Reset failed");
    } finally {
      setConfirmReset(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <MapPin className="h-6 w-6 text-primary" /> Attendance
          </h1>
          <p className="text-sm text-muted-foreground">
            Display the QR in the hall. First team fully checked in wins 10 · 2nd 5 · 3rd 1.
          </p>
        </div>
        <Button variant="outline" onClick={() => setConfirmReset(true)}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        {/* QR */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attendance QR</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="rounded-xl bg-white p-4">
              <QRCodeSVG id="attendance-qr" value={ATTENDANCE_TOKEN} size={200} level="M" />
            </div>
            <Button variant="outline" onClick={print} className="w-full">
              <Printer className="h-4 w-4" /> Print QR
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">{origin} · in-app tab</p>
          </CardContent>
        </Card>

        {/* Standings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Team check-in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sorted.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No teams yet.</p>
            )}
            {sorted.map((s) => {
              const color = resolveColor(s.color);
              const pct = s.total > 0 ? (s.present / s.total) * 100 : 0;
              const d = s.completedAtMs ? new Date(s.completedAtMs) : null;
              return (
                <div key={s.teamId} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      <span className={cn("h-2.5 w-2.5 rounded-full", color.badge)} />
                      {s.teamName}
                      {s.rank > 0 && (
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", RANK_STYLE[s.rank - 1] ?? "bg-muted")}>
                          #{s.rank} · +{s.points}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-bold tabular-nums">
                      {s.present}/{s.total}
                    </span>
                  </div>
                  <Progress value={pct} indicatorClassName={color.badge} className="mt-2" />
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    {s.complete ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                        {d && ` · ${format(d, "h:mm:ss a")}`}
                      </span>
                    ) : (
                      <span>{s.total - s.present} remaining</span>
                    )}
                    {s.rank === 1 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset attendance?</DialogTitle>
            <DialogDescription>
              This clears all check-ins and awards. Team points already granted are not reverted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={doReset}>
              Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
