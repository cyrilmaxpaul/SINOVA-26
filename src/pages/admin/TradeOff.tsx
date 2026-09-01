import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeftRight, ScanLine } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEvent } from "@/context/EventContext";
import { useTrades } from "@/hooks/useModuleData";
import { tradeableIndividuals } from "@/lib/trade";
import { tsToDate } from "@/lib/firestore";
import { TradeScanner } from "@/components/TradeScanner";
import { TeamColorBadge } from "@/components/TeamColorBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminTradeOff() {
  const { admin } = useAuth();
  const { teams, employees, games, results } = useEvent();
  const trades = useTrades();
  const [receivingTeam, setReceivingTeam] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!receivingTeam && teams.length) setReceivingTeam(teams[0].name);
  }, [teams, receivingTeam]);

  const individuals = useMemo(
    () => tradeableIndividuals(employees, games, results, trades),
    [employees, games, results, trades]
  );
  const receivingTeamObj = teams.find((t) => t.name === receivingTeam);
  const hasTradeOffGame = games.some((g) => g.isTradeOff);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <ArrowLeftRight className="h-6 w-6 text-primary" /> Trade-off
        </h1>
        <p className="text-sm text-muted-foreground">
          Individual point holders can trade half their points to a rival team, once.
        </p>
      </div>

      {!hasTradeOffGame && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 text-sm">
            No trade-off activities yet. Create an <span className="font-semibold">Individual</span> game and tick{" "}
            <span className="font-semibold">Trade-off activity</span> in Games, then award players to make them
            tradeable.
          </CardContent>
        </Card>
      )}

      {/* Admin-executed trade */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Record a trade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Receiving team</label>
              <Select value={receivingTeam} onChange={(e) => setReceivingTeam(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            {!scanning && (
              <Button onClick={() => setScanning(true)} disabled={!receivingTeamObj}>
                <ScanLine className="h-4 w-4" /> Scan individual
              </Button>
            )}
          </div>
          {scanning && receivingTeamObj && admin && (
            <div className="mx-auto max-w-sm space-y-2">
              <TradeScanner
                receivingTeamId={receivingTeamObj.id}
                receivingTeamName={receivingTeamObj.name}
                by={admin.email}
                onDone={() => setScanning(false)}
              />
              <Button variant="outline" className="w-full" onClick={() => setScanning(false)}>
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tradeable individuals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Individual point holders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Trade value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {individuals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No individual point holders yet.
                  </TableCell>
                </TableRow>
              )}
              {individuals.map((i) => (
                <TableRow key={i.emp.id}>
                  <TableCell className="font-medium">{i.emp.name}</TableCell>
                  <TableCell>
                    <TeamColorBadge team={i.emp.team} showDot />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {i.earned} → <span className="font-semibold">{i.credit}</span>
                  </TableCell>
                  <TableCell>
                    {i.trade ? (
                      <span className="text-sm text-muted-foreground">→ {i.trade.receivingTeam}</span>
                    ) : (
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">Available</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* All trades */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Completed trades</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receiving team</TableHead>
                <TableHead>Individual</TableHead>
                <TableHead>From team</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No trades recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {[...trades]
                .sort((a, b) => (tsToDate(b.at)?.getTime() ?? 0) - (tsToDate(a.at)?.getTime() ?? 0))
                .map((t) => {
                  const d = tsToDate(t.at);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.receivingTeam}</TableCell>
                      <TableCell>{t.individualName}</TableCell>
                      <TableCell>{t.sourceTeam}</TableCell>
                      <TableCell className="font-bold text-green-600 dark:text-green-400">+{t.points}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d ? format(d, "MMM d, h:mm a") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
