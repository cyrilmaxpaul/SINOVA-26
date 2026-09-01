import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Award, Star, TrendingUp, Trophy, Users } from "lucide-react";
import { useEvent } from "@/context/EventContext";
import { LiveLeaderboard } from "@/components/LiveLeaderboard";
import { TeamColorBadge } from "@/components/TeamColorBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveColor } from "@/lib/teamColors";
import { tsToDate } from "@/lib/firestore";
import { cn } from "@/lib/utils";
import type { Employee, EmployeeQRPayload } from "@/lib/types";

/**
 * Renders the full participant dashboard for a given employee/guest record.
 * Both employees and guests are team members with their own QR, points and team,
 * so this is shared verbatim; only the "open full screen" QR target differs.
 */
export function EmployeeDashboardView({
  employee,
  banner,
  qrFullScreenPath = "/employee/qr",
}: {
  employee: Employee;
  banner?: ReactNode;
  qrFullScreenPath?: string;
}) {
  const navigate = useNavigate();
  const { employees, results, teamByName, teamRank } = useEvent();

  const teammates = useMemo(
    () => employees.filter((e) => e.team === employee.team).sort((a, b) => b.points - a.points),
    [employees, employee.team]
  );
  const empResults = useMemo(
    () => results.filter((r) => r.employeeId === employee.id),
    [results, employee.id]
  );

  const team = teamByName(employee.team);
  const color = team ? resolveColor(team.color) : resolveColor(undefined);
  const rank = teamRank(employee.team);
  const qrPayload: EmployeeQRPayload = { empId: employee.id, name: employee.name, team: employee.team };

  return (
    <div className="space-y-4">
      {banner}

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={cn("overflow-hidden border-0", color.soft)}>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="text-2xl font-extrabold">{employee.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <TeamColorBadge team={employee.team} showDot />
              <span className="text-xs text-muted-foreground">{employee.id}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatMini icon={Star} label="Points" value={employee.points} accent="text-amber-500" />
        <StatMini icon={Users} label="Team" value={team ? `${team.members}` : "—"} accent="text-primary" />
        <StatMini icon={TrendingUp} label="Rank" value={rank ? `#${rank}` : "—"} accent="text-green-500" />
      </div>

      {/* Personal QR */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">My QR Code</CardTitle>
          <p className="text-sm text-muted-foreground">Show this to an admin to collect points.</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={JSON.stringify(qrPayload)} size={180} level="M" />
          </div>
          <button
            onClick={() => navigate(qrFullScreenPath)}
            className="mt-3 text-sm font-medium text-primary"
          >
            Open full screen →
          </button>
        </CardContent>
      </Card>

      {/* Teammates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Team Mates — {employee.team}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {teammates.map((tm) => (
            <div
              key={tm.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2.5",
                tm.id === employee.id && cn("ring-2", color.ring)
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {tm.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="flex-1 truncate font-medium">
                {tm.name}
                {tm.id === employee.id && <span className="ml-1 text-xs text-primary">(You)</span>}
                {tm.isGuest && tm.id !== employee.id && (
                  <span className="ml-1 text-[10px] text-muted-foreground">guest</span>
                )}
              </span>
              <span className="font-bold tabular-nums">{tm.points} pts</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Championship rankings */}
      <LiveLeaderboard isPublic highlightTeam={employee.team} />

      {/* Games won */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" /> My Scored Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {empResults.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No points yet — win a game to get on the board!
            </p>
          )}
          {empResults.map((r) => {
            const d = tsToDate(r.awardedAt);
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <Award className="h-5 w-5 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.notes || "Points awarded"}</div>
                  <div className="text-xs text-muted-foreground">
                    {d ? format(d, "MMM d, h:mm a") : "—"}
                    {r.timeTaken != null && ` · ${r.timeTaken}s`}
                  </div>
                </div>
                <span className="font-bold text-green-500">+{r.points}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function StatMini({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Star;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center p-3 text-center">
        <Icon className={cn("h-4 w-4", accent)} />
        <div className="mt-1 text-xl font-extrabold tabular-nums">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
