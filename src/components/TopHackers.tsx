import { useMemo } from "react";
import { Flame } from "lucide-react";
import { useEvent } from "@/context/EventContext";
import { TeamColorBadge } from "@/components/TeamColorBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TopHackers({ limit = 10 }: { limit?: number }) {
  const { employees } = useEvent();
  const top = useMemo(
    () =>
      [...employees]
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
        .slice(0, limit),
    [employees, limit]
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" /> Top Individual Hackers
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Outstanding individual contributions driving the team scores forward.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No participants yet.</p>
        )}
        {top.map((emp, i) => (
          <div key={emp.id} className="flex items-center gap-3 rounded-lg border p-2.5">
            <span className="w-8 text-center text-sm font-bold text-muted-foreground">#{i + 1}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {initials(emp.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{emp.name}</div>
              <div className="text-xs text-muted-foreground">{emp.id}</div>
            </div>
            <TeamColorBadge team={emp.team} />
            <div className="w-16 text-right font-bold tabular-nums">{emp.points} pts</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
