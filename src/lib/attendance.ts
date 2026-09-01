import type { AttendanceRecord, Employee, Team } from "@/lib/types";

export interface AttendanceStanding {
  teamId: string;
  teamName: string;
  color: string;
  total: number; // current team members (incl. guests)
  present: number; // members who have checked in
  complete: boolean;
  completedAtMs: number | null; // when the last member checked in (only if complete)
  rank: number; // 1-based among complete teams; 0 if not complete
  points: number; // 10 / 5 / 1 / 0
}

const RANK_POINTS = [10, 5, 1];

/**
 * Compute per-team attendance progress and the 1st/2nd/3rd ranking among teams
 * that have every member checked in (guests included). Pure — safe to run on any
 * client to render identical standings.
 */
export function computeAttendanceStandings(
  teams: Team[],
  employees: Employee[],
  records: AttendanceRecord[]
): AttendanceStanding[] {
  const recByEmp = new Map<string, AttendanceRecord>();
  for (const r of records) recByEmp.set(r.employeeId, r);

  const standings: AttendanceStanding[] = teams.map((team) => {
    const members = employees.filter((e) => e.team === team.name);
    const present = members.filter((m) => recByEmp.has(m.id));
    const total = members.length;
    const complete = total > 0 && present.length >= total;
    let completedAtMs: number | null = null;
    if (complete) {
      completedAtMs = present.reduce((max, m) => {
        const at = recByEmp.get(m.id)?.at;
        const ms = at ? at.toMillis() : 0;
        return Math.max(max, ms);
      }, 0);
    }
    return {
      teamId: team.id,
      teamName: team.name,
      color: team.color,
      total,
      present: present.length,
      complete,
      completedAtMs,
      rank: 0,
      points: 0,
    };
  });

  // Rank complete teams by completion time (earliest first).
  const completed = standings
    .filter((s) => s.complete && s.completedAtMs != null)
    .sort((a, b) => (a.completedAtMs as number) - (b.completedAtMs as number));
  completed.forEach((s, i) => {
    s.rank = i + 1;
    s.points = RANK_POINTS[i] ?? 0;
  });

  return standings;
}
