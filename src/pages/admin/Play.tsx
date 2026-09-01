import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Crown, Flag, Gamepad2, Loader2, ScanLine, Users, UserX, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEvent } from "@/context/EventContext";
import { awardPoints, awardTeamPoints, getEmployee, setGameStatus } from "@/lib/firestore";
import { QRScanner } from "@/components/QRScanner";
import { TeamColorBadge } from "@/components/TeamColorBadge";
import { Stopwatch } from "@/components/Stopwatch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Employee, EmployeeQRPayload, Game, Team } from "@/lib/types";

export default function Play() {
  const { activeGames } = useEvent();
  const [gameId, setGameId] = useState("");
  const [ending, setEnding] = useState(false);
  const [endingBusy, setEndingBusy] = useState(false);

  useEffect(() => {
    if (!gameId && activeGames.length > 0) setGameId(activeGames[0].id);
    if (gameId && !activeGames.some((g) => g.id === gameId)) setGameId(activeGames[0]?.id ?? "");
  }, [activeGames, gameId]);

  async function endGame(g: Game) {
    setEndingBusy(true);
    try {
      await setGameStatus(g.id, "completed");
      toast.success(`"${g.name}" ended`);
      setEnding(false);
    } catch {
      toast.error("Couldn't end the game.");
    } finally {
      setEndingBusy(false);
    }
  }

  const game = activeGames.find((g) => g.id === gameId);
  const mode: "individual" | "team_all" | "team_each" | null = !game
    ? null
    : game.gameType === "team"
    ? game.teamScope === "all"
      ? "team_all"
      : "team_each"
    : "individual";

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <Gamepad2 className="h-6 w-6 text-primary" /> Play Game
        </h1>
        <p className="text-sm text-muted-foreground">Start an active game and record results.</p>
      </div>

      {activeGames.length === 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 text-sm">
            No active games. Go to{" "}
            <Link to="/admin/games" className="font-semibold text-primary underline">
              Games
            </Link>{" "}
            and set a game to <b>Active</b> to start playing.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-2 p-4">
              <Label>Active game</Label>
              <Select value={gameId} onChange={(e) => setGameId(e.target.value)}>
                {activeGames.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
              {game && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="secondary">
                    {mode === "individual" ? "Individual" : mode === "team_all" ? "Team · All together" : "Team · By team"}
                  </Badge>
                  <Badge variant="secondary">{game.isTimeBased ? `Timed (${game.timeUnit})` : "Standard"}</Badge>
                  <Badge variant="secondary">Default {game.defaultPoints} pts</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto text-destructive hover:text-destructive"
                    onClick={() => setEnding(true)}
                  >
                    <Flag className="h-4 w-4" /> End game
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {game && mode === "individual" && <IndividualPlay game={game} />}
          {game && mode === "team_each" && <TeamEachPlay game={game} />}
          {game && mode === "team_all" && <TeamAllPlay game={game} />}
        </>
      )}

      {/* End game confirm */}
      <Dialog open={ending} onOpenChange={(o) => !o && setEnding(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" /> End this game?
            </DialogTitle>
            <DialogDescription>
              "{game?.name}" will be marked <b>Completed</b> and removed from the active list.
              Points already awarded stay. You can re-activate it later from Games.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEnding(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => game && endGame(game)} disabled={endingBusy}>
              {endingBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "End game"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function useAdminEmail() {
  const { admin } = useAuth();
  return admin?.email ?? "admin";
}

// ---------------- Individual: scan player → (timer) → points ----------------
function IndividualPlay({ game }: { game: Game }) {
  const awardedBy = useAdminEmail();
  const { employees, results } = useEvent();
  const participants =
    game.isTradeOff && game.participantIds
      ? (game.participantIds
          .map((id) => employees.find((e) => e.id === id))
          .filter(Boolean) as Employee[])
      : [];
  const awardedIds = new Set(
    results.filter((r) => r.gameId === game.id).map((r) => r.employeeId)
  );
  const [phase, setPhase] = useState<"scan" | "loading" | "form" | "success" | "notfound">("scan");
  const [emp, setEmp] = useState<Employee | null>(null);
  const [scannedId, setScannedId] = useState("");
  const [points, setPoints] = useState<number>(game.defaultPoints);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ name: string; team: string; points: number } | null>(null);
  const scanLock = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setPoints(game.defaultPoints), [game.id, game.defaultPoints]);
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  function reset() {
    setEmp(null);
    setScannedId("");
    setPoints(game.defaultPoints);
    setTime("");
    setNotes("");
    setLast(null);
    setPhase("scan");
  }

  async function onScan(payload: EmployeeQRPayload) {
    if (scanLock.current || phase !== "scan") return;
    scanLock.current = true;
    // Trade-off games: only the pre-selected participants can be awarded, once each.
    if (game.isTradeOff) {
      const ids = game.participantIds ?? [];
      if (!ids.includes(payload.empId)) {
        toast.error("This player isn't a participant of this game.");
        setTimeout(() => (scanLock.current = false), 800);
        return;
      }
      if (awardedIds.has(payload.empId)) {
        toast.error("This participant has already been awarded.");
        setTimeout(() => (scanLock.current = false), 800);
        return;
      }
    }
    setScannedId(payload.empId);
    setPhase("loading");
    try {
      const found = await getEmployee(payload.empId);
      if (!found) setPhase("notfound");
      else {
        setEmp(found);
        setPhase("form");
      }
    } finally {
      setTimeout(() => (scanLock.current = false), 500);
    }
  }

  async function award(e: React.FormEvent) {
    e.preventDefault();
    if (!emp || !points) return;
    setBusy(true);
    try {
      await awardPoints({
        employeeId: emp.id,
        game,
        points: Number(points),
        timeTaken: game.isTimeBased && time !== "" ? Number(time) : null,
        notes: notes.trim(),
        awardedBy,
      });
      setLast({ name: emp.name, team: emp.team, points: Number(points) });
      setPhase("success");
      toast.success(`+${points} to ${emp.name}`);
      resetTimer.current = setTimeout(reset, 2000);
    } catch {
      toast.error("Failed to award. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {game.isTradeOff && participants.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Participants ({awardedIds.size}/{participants.length} awarded)
            </CardTitle>
            <p className="text-sm text-muted-foreground">Scan a participant's QR to award {game.defaultPoints} pts.</p>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {participants.map((p) => {
              const done = awardedIds.has(p.id);
              return (
                <div key={p.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span className="min-w-0 truncate">
                    {p.name} <span className="text-xs text-muted-foreground">· {p.team}</span>
                  </span>
                  {done ? (
                    <span className="flex shrink-0 items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" /> Awarded
                    </span>
                  ) : (
                    <span className="shrink-0 text-muted-foreground">Pending</span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      <div className={phase === "scan" || phase === "loading" ? "" : "hidden"}>
        <QRScanner onScan={onScan} paused={phase !== "scan"} />
      </div>
      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading {scannedId}…
          </motion.div>
        )}
        {phase === "notfound" && (
          <motion.div key="nf" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-destructive/40">
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <UserX className="h-10 w-10 text-destructive" />
                <p className="text-sm">No participant with ID <span className="font-mono">{scannedId}</span>.</p>
                <Button onClick={reset} className="w-full">Scan again</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {phase === "form" && emp && (
          <motion.div key="f" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{emp.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{emp.id}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={reset}><X className="h-5 w-5" /></Button>
                </div>
                <div className="flex items-center gap-2">
                  <TeamColorBadge team={emp.team} showDot />
                  <span className="text-sm text-muted-foreground">Current: <b className="text-foreground">{emp.points} pts</b></span>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={award} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Points</Label>
                    <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} className="text-lg font-bold" />
                  </div>
                  {game.isTimeBased && (
                    <div className="space-y-2">
                      <Label>Time ({game.timeUnit})</Label>
                      <Input type="number" step="any" placeholder={`Time in ${game.timeUnit}`} value={time} onChange={(e) => setTime(e.target.value)} />
                      <Stopwatch unit={game.timeUnit ?? "seconds"} onCommit={(v) => setTime(String(v))} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Notes (optional)</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 1st place" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={reset}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={busy}>
                      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Award Points"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {phase === "success" && last && (
          <motion.div key="s" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className="border-green-500/40 bg-green-500/5">
              <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
                <CheckCircle2 className="h-14 w-14 text-green-500" />
                <div className="text-3xl font-extrabold text-green-500">+{last.points}</div>
                <p className="font-semibold">{last.name}</p>
                <TeamColorBadge team={last.team} />
                <Button variant="outline" className="mt-3 w-full" onClick={reset}>Scan next</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------- Team, one at a time: pick team → (timer) → points ----------------
function TeamEachPlay({ game }: { game: Game }) {
  const awardedBy = useAdminEmail();
  const { teams } = useEvent();
  const [pts, setPts] = useState<Record<string, number>>({});
  const [times, setTimes] = useState<Record<string, string>>({});
  const [awarded, setAwarded] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const getP = (t: Team) => pts[t.id] ?? game.defaultPoints;

  async function award(team: Team) {
    setBusy(team.id);
    try {
      await awardTeamPoints({
        game,
        teamName: team.name,
        points: Number(getP(team)),
        timeTaken: game.isTimeBased && times[team.id] ? Number(times[team.id]) : null,
        notes: "",
        awardedBy,
      });
      setAwarded((a) => ({ ...a, [team.id]: (a[team.id] ?? 0) + Number(getP(team)) }));
      toast.success(`+${getP(team)} to ${team.name}`);
    } catch {
      toast.error("Failed to award.");
    } finally {
      setBusy(null);
    }
  }

  if (teams.length === 0) return <p className="text-sm text-muted-foreground">Create teams first.</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Record each team's result in turn.</p>
      {teams.map((team) => (
        <Card key={team.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <TeamColorBadge team={team.name} showDot />
              {awarded[team.id] != null && (
                <Badge className="bg-green-500/15 text-green-600 dark:text-green-400">
                  +{awarded[team.id]} awarded
                </Badge>
              )}
            </div>
            {game.isTimeBased && (
              <div className="space-y-2">
                <Label>Time ({game.timeUnit})</Label>
                <Input
                  type="number"
                  step="any"
                  value={times[team.id] ?? ""}
                  onChange={(e) => setTimes((t) => ({ ...t, [team.id]: e.target.value }))}
                  placeholder={`Time in ${game.timeUnit}`}
                />
                <Stopwatch unit={game.timeUnit ?? "seconds"} onCommit={(v) => setTimes((t) => ({ ...t, [team.id]: String(v) }))} />
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>Points</Label>
                <Input
                  type="number"
                  value={getP(team)}
                  onChange={(e) => setPts((p) => ({ ...p, [team.id]: Number(e.target.value) }))}
                />
              </div>
              <Button onClick={() => award(team)} disabled={busy === team.id}>
                {busy === team.id ? <Loader2 className="h-4 w-4 animate-spin" /> : awarded[team.id] != null ? "Award again" : "Award"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------- Team, all together: common timer → scan captain / pick winner ----------------
function TeamAllPlay({ game }: { game: Game }) {
  const awardedBy = useAdminEmail();
  const { teams } = useEvent();
  const [roundTime, setRoundTime] = useState("");
  const [selTeam, setSelTeam] = useState<Team | null>(null);
  const [captain, setCaptain] = useState<{ id: string; name: string } | undefined>();
  const [points, setPoints] = useState<number>(game.defaultPoints);
  const [busy, setBusy] = useState(false);
  const [awarded, setAwarded] = useState<{ team: string; points: number }[]>([]);
  const scanLock = useRef(false);

  useEffect(() => setPoints(game.defaultPoints), [game.id, game.defaultPoints]);

  function pickTeam(t: Team | null, cap?: { id: string; name: string }) {
    setSelTeam(t);
    setCaptain(cap);
    setPoints(game.defaultPoints);
  }

  async function onScan(payload: EmployeeQRPayload) {
    if (scanLock.current || selTeam) return;
    scanLock.current = true;
    const t = teams.find((x) => x.name === payload.team) ?? null;
    if (!t) toast.error(`Scanned QR isn't for a known team.`);
    else pickTeam(t, { id: payload.empId, name: payload.name });
    setTimeout(() => (scanLock.current = false), 600);
  }

  async function award() {
    if (!selTeam) return;
    setBusy(true);
    try {
      await awardTeamPoints({
        game,
        teamName: selTeam.name,
        points: Number(points),
        timeTaken: game.isTimeBased && roundTime !== "" ? Number(roundTime) : null,
        notes: "",
        awardedBy,
        captain,
      });
      setAwarded((a) => [...a, { team: selTeam.name, points: Number(points) }]);
      toast.success(`+${points} to ${selTeam.name}`);
      pickTeam(null);
    } catch {
      toast.error("Failed to award.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {game.isTimeBased && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Round Timer</CardTitle>
            <p className="text-sm text-muted-foreground">Run one timer for the round, then award the winner.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Stopwatch unit={game.timeUnit ?? "seconds"} onCommit={(v) => setRoundTime(String(v))} />
            <div className="space-y-1.5">
              <Label>Recorded time ({game.timeUnit})</Label>
              <Input type="number" step="any" value={roundTime} onChange={(e) => setRoundTime(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {!selTeam ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanLine className="h-4 w-4" /> Award a team
            </CardTitle>
            <p className="text-sm text-muted-foreground">Scan the winning team's captain QR, or pick the team.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <QRScanner onScan={onScan} />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or pick a team <span className="h-px flex-1 bg-border" />
            </div>
            <Select
              value=""
              onChange={(e) => {
                const t = teams.find((x) => x.id === e.target.value);
                if (t) pickTeam(t);
              }}
            >
              <option value="">Select winning team…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.captainName ? ` (captain: ${t.captainName})` : ""}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Award {selTeam.name}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => pickTeam(null)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex items-center gap-2">
              <TeamColorBadge team={selTeam.name} showDot />
              {captain && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Crown className="h-3 w-3 text-amber-500" /> {captain.name}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {game.isTimeBased && (
              <div className="space-y-1.5">
                <Label>Time ({game.timeUnit})</Label>
                <Input type="number" step="any" value={roundTime} onChange={(e) => setRoundTime(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Points</Label>
              <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} className="text-lg font-bold" />
            </div>
            <Button className="w-full" onClick={award} disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : `Award ${points} to ${selTeam.name}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {awarded.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Awarded this round
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {awarded.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-2">
                <TeamColorBadge team={a.team} />
                <span className="font-bold text-green-500">+{a.points}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
