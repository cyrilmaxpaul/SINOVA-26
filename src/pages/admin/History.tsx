import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useEvent } from "@/context/EventContext";
import { downloadCSV } from "@/lib/csv";
import { tsToDate } from "@/lib/firestore";
import { TeamColorBadge } from "@/components/TeamColorBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

export default function History() {
  const { results, games, teams } = useEvent();
  const [gameId, setGameId] = useState("all");
  const [team, setTeam] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);

  // Automated module awards are logged under synthetic game ids.
  const SYNTHETIC_GAMES: Record<string, string> = {
    attendance: "Attendance",
    scream: "Scream Machine",
  };
  const gameName = (id: string) => SYNTHETIC_GAMES[id] ?? games.find((g) => g.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const fromTs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : -Infinity;
    const toTs = toDate ? new Date(toDate + "T23:59:59").getTime() : Infinity;
    return results.filter((r) => {
      if (gameId !== "all" && r.gameId !== gameId) return false;
      if (team !== "all" && r.team !== team) return false;
      const d = tsToDate(r.awardedAt);
      const t = d ? d.getTime() : 0;
      return t >= fromTs && t <= toTs;
    });
  }, [results, gameId, team, fromDate, toDate]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  function exportCsv() {
    downloadCSV(
      "sinova26-history.csv",
      filtered.map((r) => {
        const d = tsToDate(r.awardedAt);
        return {
          Game: gameName(r.gameId),
          Employee: r.employeeName,
          EmployeeId: r.employeeId,
          Team: r.team,
          Points: r.points,
          Time: r.timeTaken ?? "",
          Notes: r.notes,
          AwardedBy: r.awardedBy,
          Date: d ? format(d, "yyyy-MM-dd HH:mm:ss") : "",
        };
      })
    );
  }

  function resetPageAnd(fn: () => void) {
    fn();
    setPage(0);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">Game Results History</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} results</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Game</Label>
            <Select value={gameId} onChange={(e) => resetPageAnd(() => setGameId(e.target.value))}>
              <option value="all">All games</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
              <option value="attendance">Attendance</option>
              <option value="scream">Scream Machine</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Team</Label>
            <Select value={team} onChange={(e) => resetPageAnd(() => setTeam(e.target.value))}>
              <option value="all">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" value={fromDate} onChange={(e) => resetPageAnd(() => setFromDate(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" value={toDate} onChange={(e) => resetPageAnd(() => setToDate(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Game</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Awarded By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No results match these filters.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const d = tsToDate(r.awardedAt);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{gameName(r.gameId)}</TableCell>
                    <TableCell>
                      <div>{r.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{r.employeeId}</div>
                    </TableCell>
                    <TableCell>
                      <TeamColorBadge team={r.team} />
                    </TableCell>
                    <TableCell className="font-bold text-green-500">+{r.points}</TableCell>
                    <TableCell>{r.timeTaken ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.awardedBy}</TableCell>
                    <TableCell className="text-sm">{d ? format(d, "MMM d, h:mm a") : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {clampedPage + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={clampedPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={clampedPage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
