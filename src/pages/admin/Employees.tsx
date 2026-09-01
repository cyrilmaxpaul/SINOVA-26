import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Loader2, Plus, Search, UserCog } from "lucide-react";
import { useEvent } from "@/context/EventContext";
import {
  adminCreateEmployee,
  reassignEmployee,
  RegistrationError,
  tsToDate,
} from "@/lib/firestore";
import { TeamColorBadge } from "@/components/TeamColorBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
import type { Employee } from "@/lib/types";

export default function Employees() {
  const { employees, teams, results } = useEvent();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [busy, setBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...employees].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.team.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const selectedResults = selected ? results.filter((r) => r.employeeId === selected.id) : [];

  async function handleReassign() {
    if (!selected || !reassignTo) return;
    setBusy(true);
    try {
      await reassignEmployee({ employeeId: selected.id, targetTeamId: reassignTo });
      toast.success("Team updated");
      setReassignTo("");
      // keep dialog open; selected will update via snapshot on next render
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reassign.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newId.trim() || !newName.trim()) {
      toast.error("Enter an ID and name.");
      return;
    }
    setBusy(true);
    try {
      const { team } = await adminCreateEmployee({ empId: newId, name: newName });
      toast.success(`${newName} added to ${team}`);
      setNewId("");
      setNewName("");
      setCreateOpen(false);
    } catch (err) {
      if (err instanceof RegistrationError) toast.error(err.message);
      else toast.error("Failed to create employee.");
    } finally {
      setBusy(false);
    }
  }

  // Refresh the selected employee object from live data.
  const live = selected ? employees.find((e) => e.id === selected.id) ?? selected : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">Employees</h1>
          <p className="text-sm text-muted-foreground">{employees.length} participants</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={teams.length === 0}>
          <Plus className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, ID, or team…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No employees found.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((e) => {
                const d = tsToDate(e.registeredAt);
                return (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelected(e)}>
                    <TableCell className="font-mono text-sm">{e.id}</TableCell>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>
                      <TeamColorBadge team={e.team} />
                    </TableCell>
                    <TableCell className="font-bold tabular-nums">{e.points}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d ? format(d, "MMM d, h:mm a") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); setSelected(e); }}>
                        <UserCog className="h-4 w-4" /> Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Profile + reassign */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setReassignTo(""); } }}>
        <DialogContent onClose={() => { setSelected(null); setReassignTo(""); }}>
          {live && (
            <>
              <DialogHeader>
                <DialogTitle>{live.name}</DialogTitle>
                <DialogDescription>
                  {live.id} · {live.points} pts
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current team:</span>
                  <TeamColorBadge team={live.team} />
                </div>

                <div className="space-y-1.5">
                  <Label>Reassign to team</Label>
                  <div className="flex gap-2">
                    <Select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
                      <option value="">Select team…</option>
                      {teams
                        .filter((t) => t.name !== live.team)
                        .map((t) => (
                          <option key={t.id} value={t.id} disabled={t.members >= t.maxMembers}>
                            {t.name} ({t.members}/{t.maxMembers})
                            {t.members >= t.maxMembers ? " — full" : ""}
                          </option>
                        ))}
                    </Select>
                    <Button onClick={handleReassign} disabled={!reassignTo || busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move"}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Game history</Label>
                  <div className="space-y-2">
                    {selectedResults.length === 0 && (
                      <p className="py-2 text-sm text-muted-foreground">No game history yet.</p>
                    )}
                    {selectedResults.map((r) => {
                      const d = tsToDate(r.awardedAt);
                      return (
                        <div key={r.id} className="flex items-center justify-between rounded-lg border p-2.5">
                          <div>
                            <div className="text-sm font-medium">{r.notes || "Points awarded"}</div>
                            <div className="text-xs text-muted-foreground">
                              {d ? format(d, "MMM d, h:mm a") : "—"}
                            </div>
                          </div>
                          <span className="font-bold text-green-500">+{r.points}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create employee */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent onClose={() => setCreateOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>
              Manually add a participant. They'll be auto-assigned to a team.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Employee ID</Label>
              <Input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="e.g. EMP012" />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Rahul Sharma" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Adding…" : "Add & Assign"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
