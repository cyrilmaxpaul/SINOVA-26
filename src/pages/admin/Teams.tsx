import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Crown, Palette, Plus, Trash2, UsersRound } from "lucide-react";
import { useEvent } from "@/context/EventContext";
import { createTeam, deleteTeam, setTeamCaptain } from "@/lib/firestore";
import { TEAM_COLORS, resolveColor } from "@/lib/teamColors";
import { tsToDate } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Employee, Team } from "@/lib/types";

export default function Teams() {
  const { teams, employees, results } = useEvent();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [colorKey, setColorKey] = useState(TEAM_COLORS[0].key);
  const [maxMembers, setMaxMembers] = useState(7);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [viewMember, setViewMember] = useState<Employee | null>(null);
  const [confirmCaptain, setConfirmCaptain] = useState<{
    teamId: string;
    teamName: string;
    member: Employee;
    prevName: string;
  } | null>(null);

  const membersByTeam = useMemo(() => {
    const map = new Map<string, Employee[]>();
    for (const e of employees) {
      const arr = map.get(e.team) ?? [];
      arr.push(e);
      map.set(e.team, arr);
    }
    return map;
  }, [employees]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a team name.");
      return;
    }
    if (teams.some((t) => t.name.toLowerCase() === name.trim().toLowerCase())) {
      toast.error("A team with that name already exists.");
      return;
    }
    setSaving(true);
    try {
      await createTeam({ name, color: colorKey, maxMembers: Number(maxMembers) });
      toast.success(`Team "${name}" created`);
      setName("");
      setColorKey(TEAM_COLORS[0].key);
      setMaxMembers(7);
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create team.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return;
    const count = membersByTeam.get(confirmDelete.name)?.length ?? 0;
    if (count > 0) {
      toast.error("Reassign members before deleting this team.");
      setConfirmDelete(null);
      return;
    }
    try {
      await deleteTeam(confirmDelete.id);
      toast.success("Team deleted");
    } catch {
      toast.error("Failed to delete team.");
    } finally {
      setConfirmDelete(null);
    }
  }

  const memberResults = viewMember
    ? results.filter((r) => r.employeeId === viewMember.id)
    : [];

  const viewMemberTeam = viewMember ? teams.find((t) => t.name === viewMember.team) : undefined;
  const viewMemberIsCaptain = !!viewMember && viewMemberTeam?.captainId === viewMember.id;

  async function doSetCaptain(teamId: string, member: Employee, teamName: string) {
    try {
      await setTeamCaptain(teamId, member.id, member.name);
      toast.success(`${member.name} is now ${teamName}'s captain`);
    } catch {
      toast.error("Failed to set captain.");
    }
  }

  /** Set captain directly if none set; otherwise confirm the replacement first. */
  function requestCaptain(team: Team, member: Employee) {
    if (team.captainId === member.id) return; // already captain
    if (!team.captainId) {
      void doSetCaptain(team.id, member, team.name);
      return;
    }
    setConfirmCaptain({
      teamId: team.id,
      teamName: team.name,
      member,
      prevName: team.captainName ?? "the current captain",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Teams</h1>
          <p className="text-sm text-muted-foreground">
            Create teams and view members. New participants are auto-assigned.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Create Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <UsersRound className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No teams yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Create at least one team so employees can register and get assigned.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
            const color = resolveColor(team.color);
            const members = (membersByTeam.get(team.name) ?? []).sort(
              (a, b) => b.points - a.points
            );
            const pct = (team.members / team.maxMembers) * 100;
            return (
              <Card key={team.id} className={cn("overflow-hidden", color.soft)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 rounded-full", color.badge)} />
                      {team.name}
                    </CardTitle>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setConfirmDelete({ id: team.id, name: team.name })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {team.members}/{team.maxMembers} players
                    </span>
                    <span className="font-bold">{team.points} pts</span>
                  </div>
                  <Progress value={pct} indicatorClassName={color.badge} />
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Crown className="h-3 w-3 text-amber-500" />
                    Captain: {team.captainName ? <span className="font-medium text-foreground">{team.captainName}</span> : "not set"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {members.length === 0 && (
                    <p className="py-2 text-sm text-muted-foreground">No members yet.</p>
                  )}
                  {members.map((m) => {
                    const isCaptain = team.captainId === m.id;
                    return (
                      <div
                        key={m.id}
                        className="flex w-full items-center gap-2 rounded-lg bg-background/60 p-2 transition-colors hover:bg-background"
                      >
                        <button
                          onClick={() => setViewMember(m)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</span>
                        </button>
                        <button
                          title={isCaptain ? "Captain" : "Make captain"}
                          onClick={() => requestCaptain(team, m)}
                          className={isCaptain ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500"}
                        >
                          <Crown className="h-4 w-4" fill={isCaptain ? "currentColor" : "none"} />
                        </button>
                        <span className="w-8 text-right text-sm font-bold tabular-nums">{m.points}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create team */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>Pick a name and color for the team.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Team Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ChatGPT"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Palette className="h-4 w-4" /> Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {TEAM_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setColorKey(c.key)}
                    className={cn(
                      "h-9 w-9 rounded-full ring-offset-2 ring-offset-background transition-all",
                      c.badge,
                      colorKey === c.key ? "ring-2 ring-foreground" : ""
                    )}
                    aria-label={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Max Members</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create Team"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Member game history */}
      <Dialog open={!!viewMember} onOpenChange={(o) => !o && setViewMember(null)}>
        <DialogContent onClose={() => setViewMember(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewMember?.name}
              {viewMemberIsCaptain && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Crown className="h-3 w-3" fill="currentColor" /> Captain
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {viewMember?.id} · {viewMember?.team} · {viewMember?.points} pts
            </DialogDescription>
          </DialogHeader>

          <Button
            variant={viewMemberIsCaptain ? "outline" : "default"}
            className="w-full"
            disabled={viewMemberIsCaptain}
            onClick={() => viewMemberTeam && viewMember && requestCaptain(viewMemberTeam, viewMember)}
          >
            <Crown className="h-4 w-4" fill={viewMemberIsCaptain ? "currentColor" : "none"} />
            {viewMemberIsCaptain
              ? `Captain of ${viewMember?.team}`
              : `Make ${viewMember?.name} captain`}
          </Button>

          <div className="space-y-2">
            {memberResults.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No game history yet.</p>
            )}
            {memberResults.map((r) => {
              const d = tsToDate(r.awardedAt);
              return (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div>
                    <div className="text-sm font-medium">{r.notes || "Points awarded"}</div>
                    <div className="text-xs text-muted-foreground">
                      {d ? format(d, "MMM d, h:mm a") : "—"}
                      {r.timeTaken != null && ` · ${r.timeTaken}`}
                    </div>
                  </div>
                  <span className="font-bold text-green-500">+{r.points}</span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Change captain confirm */}
      <Dialog open={!!confirmCaptain} onOpenChange={(o) => !o && setConfirmCaptain(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" /> Change captain?
            </DialogTitle>
            <DialogDescription>
              Making <span className="font-semibold text-foreground">{confirmCaptain?.member.name}</span> captain
              will remove <span className="font-semibold text-foreground">{confirmCaptain?.prevName}</span> as{" "}
              {confirmCaptain?.teamName}'s captain.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmCaptain(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (confirmCaptain) {
                  await doSetCaptain(confirmCaptain.teamId, confirmCaptain.member, confirmCaptain.teamName);
                }
                setConfirmCaptain(null);
              }}
            >
              <Crown className="h-4 w-4" /> Make captain
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete team?</DialogTitle>
            <DialogDescription>
              Remove "{confirmDelete?.name}"? Teams with members can't be deleted — reassign them first.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
