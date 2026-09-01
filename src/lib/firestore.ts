import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  runTransaction,
  increment,
  serverTimestamp,
  query,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { fileToScaledDataUrl, fileToBackgroundDataUrl } from "./image";
import type {
  Employee,
  Team,
  Game,
  Admin,
  AppSettings,
  GameStatus,
  TimeUnit,
  AdminRole,
  GuestRelationship,
  GameType,
  TeamScope,
  RosterEntry,
  ScreamResult,
} from "./types";

// ---------- Collection refs ----------
export const employeesCol = collection(db, "employees");
export const teamsCol = collection(db, "teams");
export const gamesCol = collection(db, "games");
export const resultsCol = collection(db, "gameResults");
export const adminsCol = collection(db, "admins");
export const rosterCol = collection(db, "roster");
export const settingsDoc = doc(db, "settings", "app");
// Module collections
export const attendanceCol = collection(db, "attendance");
export const attendanceAwardsCol = collection(db, "attendanceAwards");
export const screamStateDoc = doc(db, "scream", "state");
export const screamLevelsCol = collection(db, "screamLevels");
export const screamResultsCol = collection(db, "screamResults");
export const tradesCol = collection(db, "trades");
export const tradeGuardsCol = collection(db, "tradeGuards");

// ---------- Identity helpers ----------
/** Normalize an employee id for consistent keys/lookups. */
export function normId(id: string): string {
  return id.trim().toUpperCase();
}

/** Lenient name match: true if names are equal or share any token (first/last name), case-insensitive. */
export function nameMatches(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const tb = new Set(nb.split(" ").filter(Boolean));
  return na.split(" ").filter(Boolean).some((t) => tb.has(t));
}

// ---------- Roster ----------
export async function getRoster(id: string): Promise<RosterEntry | null> {
  const snap = await getDoc(doc(db, "roster", normId(id)));
  return snap.exists() ? ({ ...(snap.data() as RosterEntry), id: snap.id }) : null;
}

/** Bulk upsert roster entries (from CSV). Returns count written. */
export async function upsertRosterEntries(entries: { employeeId: string; name: string }[]): Promise<number> {
  let written = 0;
  // Firestore batches cap at 500 writes.
  for (let i = 0; i < entries.length; i += 450) {
    const batch = writeBatch(db);
    for (const e of entries.slice(i, i + 450)) {
      const id = normId(e.employeeId);
      if (!id || !e.name.trim()) continue;
      batch.set(doc(db, "roster", id), { employeeId: id, name: e.name.trim() });
      written++;
    }
    await batch.commit();
  }
  return written;
}

export async function deleteRosterEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, "roster", normId(id)));
}

/** Whether registration is restricted to the roster (admin toggle). Default false. */
export async function getRequireRoster(): Promise<boolean> {
  const snap = await getDoc(settingsDoc);
  return snap.exists() ? Boolean((snap.data() as AppSettings).requireRoster) : false;
}
// Heavy background image kept in its own doc so it never bloats settings/app
// (which also holds the base64 logo) past Firestore's 1 MB per-doc limit.
export const backgroundDoc = doc(db, "settings", "background");

// ---------- Admin ----------
export async function getAdmin(email: string): Promise<Admin | null> {
  const snap = await getDoc(doc(db, "admins", email.toLowerCase()));
  return snap.exists() ? ({ ...(snap.data() as Admin) }) : null;
}

// ---------- Settings ----------
export async function getSettings(): Promise<AppSettings> {
  const snap = await getDoc(settingsDoc);
  if (snap.exists()) return snap.data() as AppSettings;
  return { eventName: "SINOVA'26", logoUrl: "" };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  await setDoc(settingsDoc, patch, { merge: true });
}

/**
 * Store the dashboard logo as a downscaled data URI directly in the settings
 * doc — no Firebase Storage (Blaze plan) required. Kept well under the 1 MB
 * Firestore doc limit by fileToScaledDataUrl().
 */
export async function uploadLogo(file: File): Promise<string> {
  const dataUrl = await fileToScaledDataUrl(file, 400);
  await saveSettings({ logoUrl: dataUrl });
  return dataUrl;
}

/** Compress an uploaded image and store it as the app background (separate doc). */
export async function uploadBackground(file: File): Promise<string> {
  const dataUrl = await fileToBackgroundDataUrl(file);
  await setDoc(backgroundDoc, { bgImage: dataUrl }, { merge: true });
  return dataUrl;
}

export async function saveBackgroundImage(dataUri: string): Promise<void> {
  await setDoc(backgroundDoc, { bgImage: dataUri }, { merge: true });
}

export async function clearBackgroundImage(): Promise<void> {
  await setDoc(backgroundDoc, { bgImage: "" }, { merge: true });
}

// ---------- Teams ----------
export async function createTeam(input: {
  name: string;
  color: string;
  maxMembers?: number;
}): Promise<void> {
  await addDoc(teamsCol, {
    name: input.name.trim(),
    color: input.color,
    members: 0,
    points: 0,
    maxMembers: input.maxMembers ?? 7,
  });
}

export async function updateTeam(id: string, patch: Partial<Team>): Promise<void> {
  const { id: _omit, ...rest } = patch;
  void _omit;
  await updateDoc(doc(db, "teams", id), rest);
}

export async function deleteTeam(id: string): Promise<void> {
  await deleteDoc(doc(db, "teams", id));
}

export async function setTeamCaptain(
  teamId: string,
  captainId: string,
  captainName: string
): Promise<void> {
  await updateDoc(doc(db, "teams", teamId), { captainId, captainName });
}

// ---------- Games ----------
export async function createGame(input: {
  name: string;
  defaultPoints: number;
  isTimeBased: boolean;
  timeUnit: TimeUnit | null;
  status: GameStatus;
  gameType: GameType;
  teamScope: TeamScope | null;
  isTradeOff?: boolean;
  participantIds?: string[];
}): Promise<void> {
  await addDoc(gamesCol, {
    ...input,
    isTradeOff: input.isTradeOff ?? false,
    participantIds: input.participantIds ?? [],
    name: input.name.trim(),
    createdAt: serverTimestamp(),
  });
}

export async function updateGame(id: string, patch: Partial<Game>): Promise<void> {
  const { id: _omit, ...rest } = patch;
  void _omit;
  await updateDoc(doc(db, "games", id), rest);
}

export async function deleteGame(id: string): Promise<void> {
  await deleteDoc(doc(db, "games", id));
}

export async function setGameStatus(id: string, status: GameStatus): Promise<void> {
  await updateDoc(doc(db, "games", id), { status });
}

// ---------- Employees ----------
export async function getEmployee(id: string): Promise<Employee | null> {
  const snap = await getDoc(doc(db, "employees", id));
  return snap.exists() ? ({ ...(snap.data() as Employee), id: snap.id }) : null;
}

/** Pick a team for assignment: prefer teams under the soft cap (6); overflow up to maxMembers. */
export function pickTeamForAssignment(teams: Team[]): Team | null {
  if (teams.length === 0) return null;
  const softOpen = teams.filter((t) => t.members < 6);
  const pool = softOpen.length > 0 ? softOpen : teams.filter((t) => t.members < t.maxMembers);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export class RegistrationError extends Error {}

/**
 * Register an employee inside a transaction: creates the employee doc and
 * increments the chosen team's member count atomically. Re-reads teams inside
 * the transaction to avoid races on capacity.
 */
export async function registerEmployee(input: {
  empId: string;
  name: string;
  authUid: string;
  guest?: { relationship: GuestRelationship; linkedEmployeeId: string; linkedEmployeeName: string };
}): Promise<{ team: string }> {
  const empId = input.empId.trim();
  const empRef = doc(db, "employees", empId);

  // Read team pool up front (outside tx) to choose a candidate.
  const teamsSnap = await getDocs(teamsCol);
  const teams: Team[] = teamsSnap.docs.map((d) => ({ ...(d.data() as Team), id: d.id }));
  if (teams.length === 0) {
    throw new RegistrationError(
      "Registration isn't open yet — no teams are available. Please ask an organizer."
    );
  }

  const chosen = pickTeamForAssignment(teams);
  if (!chosen) {
    throw new RegistrationError("All teams are full. Please ask an organizer to add capacity.");
  }

  return runTransaction(db, async (tx) => {
    const existing = await tx.get(empRef);
    if (existing.exists()) {
      return { team: (existing.data() as Employee).team };
    }
    const teamRef = doc(db, "teams", chosen.id);
    const teamSnap = await tx.get(teamRef);
    if (!teamSnap.exists()) {
      throw new RegistrationError("Assigned team no longer exists. Please try again.");
    }
    const teamData = teamSnap.data() as Team;
    // Guard capacity inside the transaction.
    if (teamData.members >= teamData.maxMembers) {
      throw new RegistrationError("Team just filled up. Please try again.");
    }
    tx.set(empRef, {
      name: input.name.trim(),
      team: teamData.name,
      points: 0,
      registeredAt: serverTimestamp(),
      authUid: input.authUid,
      ...(input.guest
        ? {
            isGuest: true,
            relationship: input.guest.relationship,
            linkedEmployeeId: input.guest.linkedEmployeeId,
            linkedEmployeeName: input.guest.linkedEmployeeName,
          }
        : {}),
    });
    tx.update(teamRef, { members: increment(1) });
    return { team: teamData.name };
  });
}

/**
 * Employee sign-in that is safe against typos and duplicates:
 * - If the id already has an account, RESUME it (points intact) after a lenient
 *   name check (prevents opening someone else's account with a wrong id).
 * - Otherwise the id must be on the admin roster and the name must match, then a
 *   new account is created and a team assigned.
 */
export async function loginOrRegisterEmployee(input: {
  empId: string;
  name: string;
  authUid: string;
}): Promise<{ id: string; team: string; resumed: boolean }> {
  const id = normId(input.empId);
  if (!id) throw new RegistrationError("Please enter your Employee ID.");

  const existing = await getEmployee(id);
  if (existing) {
    if (!nameMatches(input.name, existing.name)) {
      throw new RegistrationError(
        "This Employee ID is already registered under a different name. Please check your details."
      );
    }
    return { id, team: existing.team, resumed: true };
  }

  if (await getRequireRoster()) {
    const roster = await getRoster(id);
    if (!roster) {
      throw new RegistrationError(
        "Employee ID not found. Please check your ID, or ask an organizer to add you."
      );
    }
    if (!nameMatches(input.name, roster.name)) {
      throw new RegistrationError("Your name doesn't match our records for this Employee ID.");
    }
  }

  const { team } = await registerEmployee({ empId: id, name: input.name, authUid: input.authUid });
  return { id, team, resumed: false };
}

/**
 * Guest sign-in as a FULL participant, safe against duplicates:
 * - The linked employee id must be on the roster (only roster employees' guests can join).
 * - If a guest with the same name is already linked to that employee, RESUME it.
 * - Otherwise create a new guest participant (own id, QR, points) and assign a team.
 */
export async function loginOrRegisterGuest(input: {
  name: string;
  relationship: GuestRelationship;
  linkedEmployeeId: string;
  authUid: string;
}): Promise<{ participantId: string; team: string; resumed: boolean }> {
  const linkedId = normId(input.linkedEmployeeId);
  if (!linkedId) throw new RegistrationError("Please enter the Employee ID you're here for.");

  const roster = await getRoster(linkedId);
  // When enforced, the linked employee MUST be on the roster; otherwise a registered
  // employee is also acceptable.
  const requireRoster = await getRequireRoster();
  const existingEmp = requireRoster || roster ? null : await getEmployee(linkedId);
  const linkedName = roster?.name ?? existingEmp?.name;
  if (!linkedName) {
    throw new RegistrationError(
      "We couldn't find that Employee ID. Please double-check it with the employee you're here for."
    );
  }

  // Resume an existing guest linked to the same employee with a matching name.
  const linkedGuests = await getDocs(query(employeesCol, where("linkedEmployeeId", "==", linkedId)));
  const match = linkedGuests.docs
    .map((d) => ({ ...(d.data() as Employee), id: d.id }))
    .find((g) => g.isGuest && nameMatches(input.name, g.name));
  if (match) {
    return { participantId: match.id, team: match.team, resumed: true };
  }

  const rand = Math.floor(Math.random() * 1_000_000).toString(36).toUpperCase().padStart(4, "0");
  const participantId = `G-${Date.now().toString(36).toUpperCase()}${rand}`;
  const { team } = await registerEmployee({
    empId: participantId,
    name: input.name,
    authUid: input.authUid,
    guest: { relationship: input.relationship, linkedEmployeeId: linkedId, linkedEmployeeName: linkedName },
  });
  return { participantId, team, resumed: false };
}

/** Award points: increments employee points, team points, and logs a gameResult atomically. */
export async function awardPoints(input: {
  employeeId: string;
  game: Game;
  points: number;
  timeTaken: number | null;
  notes: string;
  awardedBy: string;
}): Promise<{ employeeName: string; team: string }> {
  const empRef = doc(db, "employees", input.employeeId);
  const resultRef = doc(resultsCol);

  return runTransaction(db, async (tx) => {
    const empSnap = await tx.get(empRef);
    if (!empSnap.exists()) throw new Error("Employee not found.");
    const emp = empSnap.data() as Employee;

    // Locate the team doc by name.
    const teamQ = query(teamsCol, where("name", "==", emp.team));
    const teamDocs = await getDocs(teamQ);
    const teamRef = teamDocs.empty ? null : doc(db, "teams", teamDocs.docs[0].id);

    tx.update(empRef, { points: increment(input.points) });
    if (teamRef) tx.update(teamRef, { points: increment(input.points) });

    tx.set(resultRef, {
      gameId: input.game.id,
      employeeId: input.employeeId,
      employeeName: emp.name,
      team: emp.team,
      points: input.points,
      timeTaken: input.timeTaken,
      notes: input.notes,
      awardedAt: serverTimestamp(),
      awardedBy: input.awardedBy,
      awardType: "individual",
    });

    return { employeeName: emp.name, team: emp.team };
  });
}

/** Award points to a TEAM (team-mode games). Increments team points only and logs
 *  a team-type gameResult. No individual score changes. */
export async function awardTeamPoints(input: {
  game: Game;
  teamName: string;
  points: number;
  timeTaken: number | null;
  notes: string;
  awardedBy: string;
  captain?: { id: string; name: string };
}): Promise<void> {
  const teamDocs = await getDocs(query(teamsCol, where("name", "==", input.teamName)));
  if (teamDocs.empty) throw new Error("Team not found.");
  const teamRef = doc(db, "teams", teamDocs.docs[0].id);
  const resultRef = doc(resultsCol);

  await runTransaction(db, async (tx) => {
    tx.update(teamRef, { points: increment(input.points) });
    tx.set(resultRef, {
      gameId: input.game.id,
      employeeId: input.captain?.id ?? "",
      employeeName: input.captain?.name ?? "",
      team: input.teamName,
      points: input.points,
      timeTaken: input.timeTaken,
      notes: input.notes,
      awardedAt: serverTimestamp(),
      awardedBy: input.awardedBy,
      awardType: "team",
    });
  });
}

/** Admin manually creates an employee and auto-assigns a team (same logic as registration). */
export async function adminCreateEmployee(input: {
  empId: string;
  name: string;
}): Promise<{ team: string }> {
  return registerEmployee({ empId: input.empId, name: input.name, authUid: "admin-created" });
}

/** Move an employee to a different team, adjusting both member counts atomically. */
export async function reassignEmployee(input: {
  employeeId: string;
  targetTeamId: string;
}): Promise<void> {
  const empRef = doc(db, "employees", input.employeeId);
  const targetRef = doc(db, "teams", input.targetTeamId);

  await runTransaction(db, async (tx) => {
    const empSnap = await tx.get(empRef);
    if (!empSnap.exists()) throw new Error("Employee not found.");
    const emp = empSnap.data() as Employee;

    const targetSnap = await tx.get(targetRef);
    if (!targetSnap.exists()) throw new Error("Target team not found.");
    const target = targetSnap.data() as Team;
    if (emp.team === target.name) return; // no-op

    if (target.members >= target.maxMembers) {
      throw new Error(`${target.name} is full (${target.members}/${target.maxMembers}).`);
    }

    // Find current team doc by name to decrement.
    const curQ = query(teamsCol, where("name", "==", emp.team));
    const curDocs = await getDocs(curQ);
    const curRef = curDocs.empty ? null : doc(db, "teams", curDocs.docs[0].id);

    tx.update(empRef, { team: target.name });
    tx.update(targetRef, { members: increment(1) });
    if (curRef) tx.update(curRef, { members: increment(-1) });
  });
}

// ---------- Attendance ----------
/** Record a participant's attendance check-in. Idempotent: doc id = participant id. */
export async function logAttendance(emp: Employee): Promise<void> {
  await setDoc(
    doc(db, "attendance", emp.id),
    {
      employeeId: emp.id,
      employeeName: emp.name,
      team: emp.team,
      isGuest: emp.isGuest ?? false,
      at: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Award attendance points to a team that just completed (admin authority).
 * Idempotent via a per-team award doc so the same team is never double-awarded.
 */
export async function awardAttendance(input: {
  teamId: string;
  teamName: string;
  rank: number;
  points: number;
  completedAtMs: number;
  awardedBy: string;
}): Promise<boolean> {
  const awardRef = doc(db, "attendanceAwards", input.teamId);
  const teamRef = doc(db, "teams", input.teamId);
  const resultRef = doc(resultsCol);
  return runTransaction(db, async (tx) => {
    const existing = await tx.get(awardRef);
    if (existing.exists()) return false; // already awarded this round
    tx.set(awardRef, {
      team: input.teamName,
      rank: input.rank,
      points: input.points,
      completedAt: Timestamp.fromMillis(input.completedAtMs),
      awardedAt: serverTimestamp(),
      awardedBy: input.awardedBy,
    });
    if (input.points > 0) {
      tx.update(teamRef, { points: increment(input.points) });
      // Permanent history entry (survives a round reset, which only clears check-ins).
      tx.set(resultRef, {
        gameId: "attendance",
        employeeId: "",
        employeeName: "",
        team: input.teamName,
        points: input.points,
        timeTaken: null,
        notes: `Attendance — #${input.rank}`,
        awardedAt: serverTimestamp(),
        awardedBy: input.awardedBy,
        awardType: "team",
      });
    }
    return true;
  });
}

/** Admin: wipe all attendance check-ins and awards (fresh run / testing). */
export async function resetAttendance(): Promise<void> {
  for (const col of [attendanceCol, attendanceAwardsCol]) {
    const snap = await getDocs(col);
    for (let i = 0; i < snap.docs.length; i += 450) {
      const batch = writeBatch(db);
      for (const d of snap.docs.slice(i, i + 450)) batch.delete(d.ref);
      await batch.commit();
    }
  }
}

// ---------- Scream Machine ----------
/** Admin: set which team may record and whether recording is live. */
export async function setScreamState(input: {
  activeTeam: string | null;
  recording: boolean;
}): Promise<void> {
  await setDoc(
    screamStateDoc,
    {
      activeTeam: input.activeTeam,
      recording: input.recording,
      startedAt: input.recording ? serverTimestamp() : null,
    },
    { merge: true }
  );
}

/** Participant: stream a live loudness reading while recording. */
export async function pushScreamLevel(input: {
  emp: Employee;
  level: number;
  peak: number;
  db?: number;
}): Promise<void> {
  await setDoc(
    doc(db, "screamLevels", input.emp.id),
    {
      employeeId: input.emp.id,
      employeeName: input.emp.name,
      team: input.emp.team,
      level: Math.round(input.level),
      peak: Math.round(input.peak),
      db: input.db != null && isFinite(input.db) ? Math.round(input.db) : null,
      at: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Admin: lock in a team's highest loudness once its round ends. */
export async function saveScreamResult(input: {
  teamId: string;
  teamName: string;
  maxLevel: number;
}): Promise<void> {
  await setDoc(
    doc(db, "screamResults", input.teamId),
    {
      team: input.teamName,
      maxLevel: Math.round(input.maxLevel),
      recordedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Admin: clear the live-levels board (between rounds or on reset). */
export async function clearScreamLevels(): Promise<void> {
  const snap = await getDocs(screamLevelsCol);
  for (let i = 0; i < snap.docs.length; i += 450) {
    const batch = writeBatch(db);
    for (const d of snap.docs.slice(i, i + 450)) batch.delete(d.ref);
    await batch.commit();
  }
}

/**
 * Admin: finalize the scream competition — rank locked results and award 10/5/1
 * to the loudest three teams. Idempotent per team via the result's awardedAt.
 */
export async function finalizeScream(awardedBy: string): Promise<void> {
  const [resultsSnap, teamsSnap] = await Promise.all([
    getDocs(screamResultsCol),
    getDocs(teamsCol),
  ]);
  const teamIdByName = new Map<string, string>();
  teamsSnap.docs.forEach((d) => teamIdByName.set((d.data() as Team).name, d.id));

  const ranked = resultsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as { team: string; maxLevel: number; awardedAt?: unknown }) }))
    .sort((a, b) => b.maxLevel - a.maxLevel);

  const POINTS = [10, 5, 1];
  for (let i = 0; i < ranked.length; i++) {
    const r = ranked[i];
    if (r.awardedAt) continue; // already awarded
    const points = POINTS[i] ?? 0;
    const teamId = teamIdByName.get(r.team);
    const historyRef = doc(resultsCol);
    await runTransaction(db, async (tx) => {
      const resRef = doc(db, "screamResults", r.id);
      const cur = await tx.get(resRef);
      if (!cur.exists() || (cur.data() as ScreamResult).awardedAt) return;
      tx.update(resRef, { rank: i + 1, points, awardedAt: serverTimestamp(), awardedBy });
      if (points > 0 && teamId) {
        tx.update(doc(db, "teams", teamId), { points: increment(points) });
        // Permanent history entry.
        tx.set(historyRef, {
          gameId: "scream",
          employeeId: "",
          employeeName: "",
          team: r.team,
          points,
          timeTaken: null,
          notes: `Scream Machine — #${i + 1} (loudness ${r.maxLevel})`,
          awardedAt: serverTimestamp(),
          awardedBy,
          awardType: "team",
        });
      }
    });
  }
}

/** Admin: wipe the scream session — state, live levels, and locked results. */
export async function resetScream(): Promise<void> {
  await clearScreamLevels();
  const snap = await getDocs(screamResultsCol);
  for (let i = 0; i < snap.docs.length; i += 450) {
    const batch = writeBatch(db);
    for (const d of snap.docs.slice(i, i + 450)) batch.delete(d.ref);
    await batch.commit();
  }
  await setDoc(screamStateDoc, { activeTeam: null, recording: false, startedAt: null });
}

// ---------- Point Trade-off ----------
export class TradeError extends Error {}

/**
 * Execute a trade: an individual's points earn the receiving team half.
 * Enforced atomically:
 *  - an individual can be traded only once (doc id = individualId)
 *  - a receiving team cannot trade from two individuals of the same source team
 *    (guard doc id = receivingTeamId__sourceTeamId)
 * The individual keeps their points; the receiving team gains `creditPoints`.
 */
export async function executeTrade(input: {
  individual: Employee;
  receivingTeamId: string;
  receivingTeamName: string;
  sourceTeamId: string;
  creditPoints: number;
  by: string;
}): Promise<void> {
  if (input.receivingTeamName === input.individual.team) {
    throw new TradeError("A team can't trade points from its own member.");
  }
  const tradeRef = doc(db, "trades", input.individual.id);
  const guardRef = doc(db, "tradeGuards", `${input.receivingTeamId}__${input.sourceTeamId}`);
  const teamRef = doc(db, "teams", input.receivingTeamId);

  await runTransaction(db, async (tx) => {
    const [tradeSnap, guardSnap, teamSnap] = await Promise.all([
      tx.get(tradeRef),
      tx.get(guardRef),
      tx.get(teamRef),
    ]);
    if (tradeSnap.exists()) {
      throw new TradeError(`${input.individual.name} has already traded their points.`);
    }
    if (guardSnap.exists()) {
      throw new TradeError(`Your team has already traded with a member of ${input.individual.team}.`);
    }
    if (!teamSnap.exists()) throw new TradeError("Receiving team not found.");

    tx.set(tradeRef, {
      individualId: input.individual.id,
      individualName: input.individual.name,
      sourceTeam: input.individual.team,
      receivingTeam: input.receivingTeamName,
      points: input.creditPoints,
      at: serverTimestamp(),
      by: input.by,
    });
    tx.set(guardRef, {
      receivingTeam: input.receivingTeamName,
      sourceTeam: input.individual.team,
      individualId: input.individual.id,
      at: serverTimestamp(),
    });
    tx.update(teamRef, { points: increment(input.creditPoints) });
  });
}

// ---------- Misc converters ----------
export function tsToDate(ts: Timestamp | null | undefined): Date | null {
  return ts ? ts.toDate() : null;
}

export type { AdminRole };
