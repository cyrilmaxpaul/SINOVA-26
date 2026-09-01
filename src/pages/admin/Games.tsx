import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useEvent } from "@/context/EventContext";
import { createGame, deleteGame, setGameStatus, updateGame } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Game, GameStatus, GameType, TeamScope, TimeUnit } from "@/lib/types";

const STATUS_STYLE: Record<GameStatus, string> = {
  active: "bg-green-500/15 text-green-600 dark:text-green-400",
  upcoming: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  completed: "bg-muted text-muted-foreground",
};

interface FormState {
  name: string;
  defaultPoints: number;
  isTimeBased: boolean;
  timeUnit: TimeUnit;
  status: GameStatus;
  gameType: GameType;
  teamScope: TeamScope;
  isTradeOff: boolean;
  participantIds: string[];
}

const EMPTY: FormState = {
  name: "",
  defaultPoints: 10,
  isTimeBased: false,
  timeUnit: "seconds",
  status: "upcoming",
  gameType: "individual",
  teamScope: "each",
  isTradeOff: false,
  participantIds: [],
};

function gameTypeLabel(g: Game): string {
  if (g.gameType === "team") return `Team · ${g.teamScope === "all" ? "All together" : "By team"}`;
  if (g.isTradeOff) return "Individual · Trade-off";
  return "Individual";
}

export default function Games() {
  const { games, employees } = useEvent();
  const tradeOffCandidates = employees
    .filter((e) => !e.isGuest)
    .sort((a, b) => a.name.localeCompare(b.name));

  function toggleParticipant(id: string) {
    setForm((f) => ({
      ...f,
      participantIds: f.participantIds.includes(id)
        ? f.participantIds.filter((p) => p !== id)
        : [...f.participantIds, id],
    }));
  }
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<Game | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = [...games].sort((a, b) => a.name.localeCompare(b.name));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(g: Game) {
    setEditing(g);
    setForm({
      name: g.name,
      defaultPoints: g.defaultPoints,
      isTimeBased: g.isTimeBased,
      timeUnit: g.timeUnit ?? "seconds",
      status: g.status,
      gameType: g.gameType ?? "individual",
      teamScope: g.teamScope ?? "each",
      isTradeOff: g.isTradeOff ?? false,
      participantIds: g.participantIds ?? [],
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.defaultPoints < 1) {
      toast.error("Enter a name and points (min 1).");
      return;
    }
    if (form.gameType === "individual" && form.isTradeOff && form.participantIds.length === 0) {
      toast.error("Select at least one participant for a trade-off game.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        defaultPoints: Number(form.defaultPoints),
        isTimeBased: form.isTimeBased,
        timeUnit: form.isTimeBased ? form.timeUnit : null,
        status: form.status,
        gameType: form.gameType,
        teamScope: form.gameType === "team" ? form.teamScope : null,
        isTradeOff: form.gameType === "individual" ? form.isTradeOff : false,
        participantIds:
          form.gameType === "individual" && form.isTradeOff ? form.participantIds : [],
      };
      if (editing) await updateGame(editing.id, payload);
      else await createGame(payload);
      toast.success(editing ? "Game updated" : "Game created");
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save game.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return;
    try {
      await deleteGame(confirmDelete.id);
      toast.success("Game deleted");
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Games</h1>
          <p className="text-sm text-muted-foreground">Create and manage playable games.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Create Game
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Default Points</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No games yet. Create your first game.
                  </TableCell>
                </TableRow>
              )}
              {sorted.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>{g.defaultPoints}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{gameTypeLabel(g)}</div>
                    {g.isTimeBased ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> Timed ({g.timeUnit})
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Standard</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_STYLE[g.status]} capitalize`}>{g.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {g.status !== "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setGameStatus(g.id, "active").then(() => toast.success(`${g.name} is now active`))}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Set Active
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(g)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(g)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Game" : "Create Game"}</DialogTitle>
            <DialogDescription>Configure the game details and scoring.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Prompt Battle"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default Points</Label>
              <Input
                type="number"
                min={1}
                value={form.defaultPoints}
                onChange={(e) => setForm({ ...form, defaultPoints: Number(e.target.value) })}
              />
            </div>
            {/* Team vs individual */}
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={form.gameType === "team"}
                  onChange={(e) => setForm({ ...form, gameType: e.target.checked ? "team" : "individual" })}
                />
                <span className="text-sm font-medium">Team game</span>
              </label>
              {form.gameType === "team" ? (
                <div className="flex flex-col gap-2 pl-6">
                  {(
                    [
                      { v: "all", label: "All teams play together (scan winning team's captain)" },
                      { v: "each", label: "One team at a time (enter each team's result)" },
                    ] as { v: TeamScope; label: string }[]
                  ).map((o) => (
                    <label key={o.v} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="teamScope"
                        className="accent-[hsl(var(--primary))]"
                        checked={form.teamScope === o.v}
                        onChange={() => setForm({ ...form, teamScope: o.v })}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 pl-6">
                  <p className="text-xs text-muted-foreground">
                    Individual: scan each player's QR to award points.
                  </p>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                      checked={form.isTradeOff}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          isTradeOff: e.target.checked,
                          defaultPoints: e.target.checked ? 5 : form.defaultPoints,
                        })
                      }
                    />
                    <span className="text-sm">
                      <span className="font-medium">Trade-off activity</span>
                      <span className="block text-xs text-muted-foreground">
                        Flat points for everyone; players become tradeable point holders.
                      </span>
                    </span>
                  </label>

                  {form.isTradeOff && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Participants ({form.participantIds.length} selected)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Only these players can be awarded — their QR must match at scan time.
                      </p>
                      <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-2">
                        {tradeOffCandidates.length === 0 && (
                          <p className="py-2 text-center text-xs text-muted-foreground">
                            No employees registered yet.
                          </p>
                        )}
                        {tradeOffCandidates.map((emp) => (
                          <label
                            key={emp.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[hsl(var(--primary))]"
                              checked={form.participantIds.includes(emp.id)}
                              onChange={() => toggleParticipant(emp.id)}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm">{emp.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {emp.id} · {emp.team}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={form.isTimeBased}
                onChange={(e) => setForm({ ...form, isTimeBased: e.target.checked })}
              />
              <span className="text-sm font-medium">Time-based game</span>
            </label>
            {form.isTimeBased && (
              <div className="flex gap-4 pl-6">
                {(["seconds", "minutes"] as TimeUnit[]).map((u) => (
                  <label key={u} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="timeUnit"
                      className="accent-[hsl(var(--primary))]"
                      checked={form.timeUnit === u}
                      onChange={() => setForm({ ...form, timeUnit: u })}
                    />
                    <span className="capitalize">{u}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as GameStatus })}
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Game"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete game?</DialogTitle>
            <DialogDescription>
              This will permanently remove "{confirmDelete?.name}". Existing results are kept.
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
