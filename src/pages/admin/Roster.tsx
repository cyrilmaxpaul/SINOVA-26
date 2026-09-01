import { useEffect, useMemo, useRef, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";
import { CheckCircle2, ListChecks, Loader2, Plus, Search, Trash2, Upload } from "lucide-react";
import { useEvent } from "@/context/EventContext";
import { rosterCol, upsertRosterEntries, deleteRosterEntry, saveSettings } from "@/lib/firestore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RosterEntry } from "@/lib/types";

function parseCsv(text: string): { employeeId: string; name: string }[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: { employeeId: string; name: string }[] = [];
  lines.forEach((line, i) => {
    const cells = line.split(/[,\t]/).map((c) => c.trim());
    const id = cells[0] ?? "";
    const name = cells.slice(1).join(" ").trim();
    // Skip a header row like "ID,Name" / "Employee ID, Name"
    if (i === 0 && /^(employee\s*id|emp\s*id|id)$/i.test(id)) return;
    if (!id) return;
    out.push({ employeeId: id, name });
  });
  return out;
}

export default function Roster() {
  const { employees, settings } = useEvent();
  const enforced = Boolean(settings.requireRoster);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(rosterCol, (snap) =>
      setRoster(snap.docs.map((d) => ({ ...(d.data() as RosterEntry), id: d.id })))
    );
    return unsub;
  }, []);

  const registeredIds = useMemo(() => new Set(employees.map((e) => e.id)), [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...roster].sort((a, b) => a.employeeId.localeCompare(b.employeeId));
    if (!q) return list;
    return list.filter((r) => r.employeeId.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [roster, search]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const entries = parseCsv(text);
      if (entries.length === 0) {
        toast.error("No rows found. Use columns: Employee ID, Name.");
        return;
      }
      const n = await upsertRosterEntries(entries);
      toast.success(`Imported ${n} employee${n === 1 ? "" : "s"} to the roster`);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't read that file. Make sure it's a CSV.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function toggleEnforce() {
    try {
      await saveSettings({ requireRoster: !enforced });
      toast.success(!enforced ? "Enforcement ON — only roster can register" : "Enforcement OFF — registration open");
    } catch {
      toast.error("Failed to update setting.");
    }
  }

  async function addOne(e: React.FormEvent) {
    e.preventDefault();
    if (!newId.trim() || !newName.trim()) {
      toast.error("Enter an ID and name.");
      return;
    }
    try {
      await upsertRosterEntries([{ employeeId: newId, name: newName }]);
      toast.success("Added to roster");
      setNewId("");
      setNewName("");
    } catch {
      toast.error("Failed to add.");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <ListChecks className="h-6 w-6 text-primary" /> Employee Roster
        </h1>
        <p className="text-sm text-muted-foreground">
          Only people on this roster (and their guests) can register. {roster.length} on roster.
        </p>
      </div>

      {/* Enforcement toggle */}
      <Card className={cn(enforced ? "border-green-500/40" : "border-amber-500/40")}>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div>
            <div className="font-semibold">Restrict registration to roster</div>
            <p className="text-sm text-muted-foreground">
              {enforced
                ? "🔒 ON — only employees on the roster (and their guests) can register."
                : "⚠️ OFF — anyone can register with any ID/name (roster not enforced)."}
            </p>
            {enforced && roster.length === 0 && (
              <p className="mt-1 text-xs font-medium text-destructive">
                Roster is empty — no one can register until you import employees or turn this off.
              </p>
            )}
          </div>
          <button
            role="switch"
            aria-checked={enforced}
            onClick={toggleEnforce}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors",
              enforced ? "bg-green-500" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
                enforced ? "left-[22px]" : "left-0.5"
              )}
            />
          </button>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" /> Import CSV
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Two columns: <b>Employee ID, Name</b> (one per line). A header row is optional. Re-importing updates existing entries.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={handleFile} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Choose CSV file
          </Button>
          <form onSubmit={addOne} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label>Or add one — Employee ID</Label>
              <Input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="EMP001" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Rahul Sharma" />
            </div>
            <Button type="submit" variant="secondary">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search roster…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Roster is empty. Import a CSV to open registration.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.employeeId}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    {registeredIds.has(r.id) ? (
                      <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" /> Registered
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not yet</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        deleteRosterEntry(r.id).then(() => toast.success(`Removed ${r.employeeId}`))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
