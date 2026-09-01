import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, MapPin, ScanLine } from "lucide-react";
import { useEvent } from "@/context/EventContext";
import { useAttendance } from "@/hooks/useModuleData";
import { logAttendance } from "@/lib/firestore";
import { computeAttendanceStandings } from "@/lib/attendance";
import { ATTENDANCE_TOKEN } from "@/lib/constants";
import { QRScanner } from "@/components/QRScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { resolveColor } from "@/lib/teamColors";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types";

/** Attendance check-in UI shared by employee and guest logins. */
export function AttendancePanel({ me }: { me: Employee }) {
  const { teams, employees } = useEvent();
  const { records } = useAttendance();
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);

  const myRecord = records.find((r) => r.employeeId === me.id);
  const checkedIn = !!myRecord;

  const myStanding = useMemo(() => {
    const all = computeAttendanceStandings(teams, employees, records);
    return all.find((s) => s.teamName === me.team);
  }, [teams, employees, records, me.team]);

  async function handleScan(_: unknown, raw: string) {
    if (lock.current || saving) return;
    if (raw.trim() !== ATTENDANCE_TOKEN) {
      toast.error("That's not the attendance QR. Scan the code shown in the hall.");
      return;
    }
    lock.current = true;
    setSaving(true);
    try {
      await logAttendance(me);
      toast.success("Attendance recorded!");
      setScanning(false);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't record attendance. Try again.");
    } finally {
      setSaving(false);
      setTimeout(() => (lock.current = false), 800);
    }
  }

  const color = myStanding ? resolveColor(myStanding.color) : null;
  const pct = myStanding && myStanding.total > 0 ? (myStanding.present / myStanding.total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <MapPin className="h-6 w-6 text-primary" /> Attendance
        </h1>
        <p className="text-sm text-muted-foreground">
          Reached your seat? Scan the attendance QR in the hall to clock in.
        </p>
      </div>

      {checkedIn ? (
        <Card className="border-green-500/40 bg-green-500/5">
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-bold">You're checked in!</p>
            <p className="text-sm text-muted-foreground">{me.name} · {me.team}</p>
          </CardContent>
        </Card>
      ) : scanning ? (
        <div className="space-y-3">
          <QRScanner onScan={handleScan} paused={saving} />
          <Button variant="outline" className="w-full" onClick={() => setScanning(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button className="w-full" size="lg" onClick={() => setScanning(true)}>
          <ScanLine className="h-5 w-5" /> Scan attendance QR
        </Button>
      )}

      {myStanding && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className={cn("h-2.5 w-2.5 rounded-full", color?.badge)} />
                {me.team} check-in
              </span>
              <span className="text-sm font-bold tabular-nums">
                {myStanding.present}/{myStanding.total}
              </span>
            </div>
            <Progress value={pct} indicatorClassName={color?.badge} />
            {myStanding.complete ? (
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                Whole team is in! {myStanding.rank > 0 && myStanding.points > 0
                  ? `Finished #${myStanding.rank} → +${myStanding.points} pts`
                  : ""}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Waiting on {myStanding.total - myStanding.present} more teammate(s).
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
