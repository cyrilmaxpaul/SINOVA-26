import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, ScanLine, UserX, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEvent } from "@/context/EventContext";
import { awardPoints, getEmployee } from "@/lib/firestore";
import { QRScanner } from "@/components/QRScanner";
import { TeamColorBadge } from "@/components/TeamColorBadge";
import { Stopwatch } from "@/components/Stopwatch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Employee, EmployeeQRPayload, Game } from "@/lib/types";

type Phase = "scanning" | "loading" | "form" | "success" | "notfound";

export default function Scanner() {
  const { admin } = useAuth();
  const { activeGames, results } = useEvent();

  const [phase, setPhase] = useState<Phase>("scanning");
  const [emp, setEmp] = useState<Employee | null>(null);
  const [scannedId, setScannedId] = useState("");

  const [gameId, setGameId] = useState("");
  const [points, setPoints] = useState<number>(0);
  const [timeTaken, setTimeTaken] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastAward, setLastAward] = useState<{ name: string; team: string; points: number } | null>(null);

  const resetTimer = useRef<ReturnType<typeof setTimeout>>();
  const scanLock = useRef(false);

  const selectedGame: Game | undefined = activeGames.find((g) => g.id === gameId);

  // Prefill points when a game is selected.
  useEffect(() => {
    if (selectedGame) setPoints(selectedGame.defaultPoints);
  }, [selectedGame]);

  // Default to the first active game when the form opens.
  useEffect(() => {
    if (phase === "form" && !gameId && activeGames.length > 0) {
      setGameId(activeGames[0].id);
    }
  }, [phase, gameId, activeGames]);

  function fullReset() {
    setEmp(null);
    setScannedId("");
    setGameId("");
    setPoints(0);
    setTimeTaken("");
    setNotes("");
    setLastAward(null);
    setPhase("scanning");
  }

  async function handleScan(payload: EmployeeQRPayload) {
    if (scanLock.current || phase === "loading" || phase === "form") return;
    scanLock.current = true;
    setScannedId(payload.empId);
    setPhase("loading");
    try {
      const found = await getEmployee(payload.empId);
      if (!found) {
        setPhase("notfound");
      } else {
        setEmp(found);
        setPhase("form");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load employee.");
      setPhase("scanning");
    } finally {
      setTimeout(() => (scanLock.current = false), 500);
    }
  }

  async function handleAward(e: React.FormEvent) {
    e.preventDefault();
    if (!emp || !selectedGame || !admin) return;
    if (!points || points === 0) {
      toast.error("Enter a point value.");
      return;
    }
    // Trade-off games: only pre-selected participants can be awarded, once each.
    if (selectedGame.isTradeOff) {
      const ids = selectedGame.participantIds ?? [];
      if (!ids.includes(emp.id)) {
        toast.error(`${emp.name} isn't a participant of this trade-off game.`);
        return;
      }
      if (results.some((r) => r.gameId === selectedGame.id && r.employeeId === emp.id)) {
        toast.error(`${emp.name} has already been awarded for this game.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      await awardPoints({
        employeeId: emp.id,
        game: selectedGame,
        points: Number(points),
        timeTaken: selectedGame.isTimeBased && timeTaken !== "" ? Number(timeTaken) : null,
        notes: notes.trim(),
        awardedBy: admin.email,
      });
      setLastAward({ name: emp.name, team: emp.team, points: Number(points) });
      setPhase("success");
      toast.success(`+${points} to ${emp.name}`);
      // Auto-reset after 2s.
      resetTimer.current = setTimeout(fullReset, 2000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to award points. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const noActiveGames = activeGames.length === 0;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <ScanLine className="h-6 w-6 text-primary" /> Scan & Award
        </h1>
        <p className="text-sm text-muted-foreground">
          Scan a participant's QR code to award points for the active game.
        </p>
      </div>

      {noActiveGames && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 text-sm">
            No active games. Go to{" "}
            <Link to="/admin/games" className="font-semibold text-primary underline">
              Games
            </Link>{" "}
            and set a game to <span className="font-semibold">Active</span> before awarding points.
          </CardContent>
        </Card>
      )}

      {/* Scanner is always mounted; paused while showing a result/form. */}
      <div className={phase === "scanning" || phase === "loading" ? "" : "hidden"}>
        <QRScanner onScan={handleScan} paused={phase !== "scanning"} />
      </div>

      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 py-6 text-muted-foreground"
          >
            <Loader2 className="h-5 w-5 animate-spin" /> Loading {scannedId}…
          </motion.div>
        )}

        {phase === "notfound" && (
          <motion.div key="notfound" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-destructive/40">
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <UserX className="h-10 w-10 text-destructive" />
                <div>
                  <p className="font-semibold">Employee not found</p>
                  <p className="text-sm text-muted-foreground">
                    No participant with ID <span className="font-mono">{scannedId}</span>.
                  </p>
                </div>
                <Button onClick={fullReset} className="w-full">
                  Scan again
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {phase === "form" && emp && (
          <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{emp.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{emp.id}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={fullReset}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <TeamColorBadge team={emp.team} showDot />
                  <span className="text-sm text-muted-foreground">
                    Current: <span className="font-semibold text-foreground">{emp.points} pts</span>
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAward} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Game</Label>
                    <Select value={gameId} onChange={(e) => setGameId(e.target.value)} disabled={noActiveGames}>
                      {activeGames.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.defaultPoints} pts)
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Points</Label>
                    <Input
                      type="number"
                      value={points}
                      onChange={(e) => setPoints(Number(e.target.value))}
                      className="text-lg font-bold"
                      disabled={selectedGame?.isTradeOff}
                    />
                    {selectedGame?.isTradeOff && (
                      <p className="text-xs text-muted-foreground">
                        Trade-off activity — flat {selectedGame.defaultPoints} pts for everyone.
                      </p>
                    )}
                  </div>

                  {selectedGame?.isTimeBased && (
                    <div className="space-y-2">
                      <Label>
                        Time ({selectedGame.timeUnit === "minutes" ? "minutes" : "seconds"})
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder={`Time in ${selectedGame.timeUnit}`}
                        value={timeTaken}
                        onChange={(e) => setTimeTaken(e.target.value)}
                      />
                      <Stopwatch
                        unit={selectedGame.timeUnit ?? "seconds"}
                        onCommit={(v) => setTimeTaken(String(v))}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="e.g. 1st place, tie-breaker win…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={fullReset}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={submitting || noActiveGames}>
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Award Points"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {phase === "success" && lastAward && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-green-500/40 bg-green-500/5">
              <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </motion.div>
                <div className="text-3xl font-extrabold text-green-500">+{lastAward.points}</div>
                <p className="font-semibold">{lastAward.name}</p>
                <TeamColorBadge team={lastAward.team} />
                <Button variant="outline" className="mt-3 w-full" onClick={fullReset}>
                  Scan next
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
