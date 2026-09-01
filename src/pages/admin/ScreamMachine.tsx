import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Award, Mic, Radio, RotateCcw, Square, Trophy, Volume2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEvent } from "@/context/EventContext";
import { useScream } from "@/hooks/useModuleData";
import {
  clearScreamLevels,
  finalizeScream,
  resetScream,
  saveScreamResult,
  setScreamState,
} from "@/lib/firestore";
import { ScreamMeter } from "@/components/ScreamMeter";
import { ScreamBars } from "@/components/ScreamBars";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveColor } from "@/lib/teamColors";
import { cn } from "@/lib/utils";

const RANK_POINTS = [10, 5, 1];
const RANK_STYLE = ["text-amber-500", "text-slate-400", "text-orange-500"];

export default function AdminScreamMachine() {
  const { admin } = useAuth();
  const { teams } = useEvent();
  const { state, levels, results } = useScream();
  const [selectedTeam, setSelectedTeam] = useState("");
  const [busy, setBusy] = useState(false);

  const active = state?.activeTeam ?? null;
  const recording = !!state?.recording;

  useEffect(() => {
    if (!selectedTeam && teams.length) setSelectedTeam(active ?? teams[0].name);
  }, [teams, active, selectedTeam]);

  const liveForActive = useMemo(() => levels.filter((l) => l.team === active), [levels, active]);
  const peakMax = liveForActive.reduce((m, l) => Math.max(m, l.peak), 0);

  const rankedResults = useMemo(
    () => [...results].sort((a, b) => b.maxLevel - a.maxLevel),
    [results]
  );

  async function startRound() {
    if (!selectedTeam) return;
    setBusy(true);
    try {
      await clearScreamLevels();
      await setScreamState({ activeTeam: selectedTeam, recording: true });
      toast.success(`${selectedTeam} is live`);
    } catch {
      toast.error("Couldn't start round.");
    } finally {
      setBusy(false);
    }
  }

  async function stopRound() {
    if (!active) return;
    setBusy(true);
    try {
      const team = teams.find((t) => t.name === active);
      const max = levels.filter((l) => l.team === active).reduce((m, l) => Math.max(m, l.peak), 0);
      if (team) await saveScreamResult({ teamId: team.id, teamName: team.name, maxLevel: max });
      await setScreamState({ activeTeam: active, recording: false });
      toast.success(`${active} locked in at ${Math.round(max)}`);
    } catch {
      toast.error("Couldn't stop round.");
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (!admin) return;
    setBusy(true);
    try {
      await finalizeScream(admin.email);
      toast.success("Loudest teams awarded 10 · 5 · 1");
    } catch {
      toast.error("Finalize failed.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      await resetScream();
      toast.success("Scream session reset");
    } catch {
      toast.error("Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <Volume2 className="h-6 w-6 text-primary" /> Scream Machine
          </h1>
          <p className="text-sm text-muted-foreground">
            Run one team at a time. Loudest three teams win 10 · 5 · 1 when you finalize.
          </p>
        </div>
        <Button variant="outline" onClick={reset} disabled={busy}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>

      {/* Control + live meter */}
      <Card className={cn(recording && "border-primary/50")}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {recording ? (
              <>
                <Radio className="h-4 w-4 animate-pulse text-red-500" /> Recording: {active}
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" /> Select a team to record
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!recording && (
            <div className="flex gap-2">
              <Select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="flex-1">
                {teams.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <Button onClick={startRound} disabled={busy || !selectedTeam}>
                <Mic className="h-4 w-4" /> Start
              </Button>
            </div>
          )}

          {recording && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{active} — all teammates</span>
                <span className="text-sm">
                  Team peak <span className="font-extrabold tabular-nums">{Math.round(peakMax)}</span>
                </span>
              </div>
              {liveForActive.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Waiting for teammates to start screaming…
                </p>
              ) : (
                <ScreamBars levels={liveForActive} />
              )}
              <Button variant="destructive" className="w-full" size="lg" onClick={stopRound} disabled={busy}>
                <Square className="h-5 w-5" /> Stop & lock in {active}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Recorded results</CardTitle>
          <Button size="sm" onClick={finalize} disabled={busy || rankedResults.length === 0}>
            <Award className="h-4 w-4" /> Finalize & award
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {rankedResults.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No teams recorded yet.</p>
          )}
          {rankedResults.map((r, i) => {
            const team = teams.find((t) => t.name === r.team);
            const color = team ? resolveColor(team.color) : null;
            const previewPts = RANK_POINTS[i] ?? 0;
            const awarded = !!r.awardedAt;
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3">
                <span className={cn("w-6 text-center text-lg font-extrabold", RANK_STYLE[i] ?? "text-muted-foreground")}>
                  {i + 1}
                </span>
                <span className={cn("h-2.5 w-2.5 rounded-full", color?.badge)} />
                <span className="flex-1 font-medium">{r.team}</span>
                <ScreamMeter level={r.maxLevel} className="w-32" label="" />
                <span className="w-16 text-right text-sm font-bold">
                  {awarded ? (
                    <span className="text-green-600 dark:text-green-400">+{r.points}</span>
                  ) : (
                    <span className="text-muted-foreground">+{previewPts}?</span>
                  )}
                </span>
                {i === 0 && <Trophy className="h-4 w-4 text-amber-500" />}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
