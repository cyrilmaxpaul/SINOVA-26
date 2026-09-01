import type { Timestamp } from "firebase/firestore";

export type GameStatus = "upcoming" | "active" | "completed";
export type TimeUnit = "seconds" | "minutes";
export type AdminRole = "super" | "scanner" | "viewer";
export type GameType = "individual" | "team";
export type TeamScope = "all" | "each"; // all teams together vs one team at a time

export type GuestRelationship = "Husband" | "Wife" | "Son" | "Daughter";

export interface Employee {
  id: string; // Employee/participant ID e.g. "EMP012" (guests get a generated "G-…" id) — also the Firestore doc id
  name: string;
  team: string; // team name
  points: number;
  registeredAt: Timestamp | null;
  authUid: string;
  // Guest participants are full team members with these extra fields:
  isGuest?: boolean;
  relationship?: GuestRelationship;
  linkedEmployeeId?: string; // the employee they came with
  linkedEmployeeName?: string;
}

export interface Team {
  id: string; // Firestore doc id
  name: string;
  color: string; // palette key, e.g. "purple" (see teamColors.ts)
  members: number;
  points: number;
  maxMembers: number; // defaults to 7
  captainId?: string; // member designated as captain (scanned in all-teams games)
  captainName?: string;
}

export interface Game {
  id: string;
  name: string;
  defaultPoints: number;
  isTimeBased: boolean;
  timeUnit: TimeUnit | null;
  status: GameStatus;
  createdAt: Timestamp | null;
  gameType?: GameType; // undefined = "individual" (back-compat)
  teamScope?: TeamScope | null; // only for team games
  isTradeOff?: boolean; // individual "trade-off" activity: flat points, player becomes tradeable
  participantIds?: string[]; // trade-off games: only these employees can be awarded
}

export interface GameResult {
  id: string;
  gameId: string;
  employeeId: string; // for team awards this is the captain (or "")
  employeeName: string;
  team: string;
  points: number;
  timeTaken: number | null;
  notes: string;
  awardedAt: Timestamp | null;
  awardedBy: string; // admin email
  awardType?: "individual" | "team"; // undefined = individual (back-compat)
}

export interface Admin {
  email: string;
  role: AdminRole;
  createdAt: Timestamp | null;
}


export interface ThemeConfig {
  bgPreset: "tech" | "aurora" | "sunset" | "mono";
  accent: string;
  cardOpacity: number;
  blur: number;
}

export interface AppSettings {
  eventName: string;
  logoUrl: string;
  theme?: ThemeConfig;
  requireRoster?: boolean; // when true, only roster employees (and their guests) can register
}

/** Pre-approved employee. Doc id = normalized employee id. */
export interface RosterEntry {
  id: string;
  employeeId: string;
  name: string;
}

/** Payload encoded inside an employee's personal QR code. */
export interface EmployeeQRPayload {
  empId: string;
  name: string;
  team: string;
}

// ---------- Attendance module ----------
/** One participant's attendance check-in (doc id = employee/participant id). */
export interface AttendanceRecord {
  id: string; // = employeeId
  employeeId: string;
  employeeName: string;
  team: string;
  isGuest?: boolean;
  at: Timestamp | null;
}

/** Recorded award for a team that completed attendance (doc id = team id). */
export interface AttendanceAward {
  id: string; // = team id
  team: string;
  rank: number; // 1,2,3…
  points: number; // 10 / 5 / 1 / 0
  completedAt: Timestamp | null;
  awardedAt: Timestamp | null;
  awardedBy: string;
}

// ---------- Scream Machine module ----------
/** Single control doc for the scream session (doc id = "state"). */
export interface ScreamState {
  activeTeam: string | null; // team currently allowed to record
  recording: boolean;
  startedAt: Timestamp | null;
}

/** A participant's live loudness while recording (doc id = employee/participant id). */
export interface ScreamLevel {
  id: string; // = employeeId
  employeeId: string;
  employeeName: string;
  team: string;
  level: number; // instantaneous 0–100
  peak: number; // max since recording started
  db?: number; // approximate loudness in dBFS (<= 0), display only
  at: Timestamp | null;
}

/** Locked-in loudness result for a team (doc id = team id). */
export interface ScreamResult {
  id: string; // = team id
  team: string;
  maxLevel: number; // 0–100 (highest peak among teammates)
  rank?: number; // assigned when finalized
  points?: number; // 10 / 5 / 1 / 0
  recordedAt: Timestamp | null;
  awardedAt?: Timestamp | null;
}

// ---------- Point Trade-off module ----------
/** A completed trade: an individual's points earn the receiving team half (doc id = individual id). */
export interface Trade {
  id: string; // = individual (source) employee id — enforces one trade per individual
  individualId: string;
  individualName: string;
  sourceTeam: string; // the individual's own team
  receivingTeam: string; // the team that gained points
  points: number; // credited to receiving team (half of individual's tradeable points)
  at: Timestamp | null;
  by: string; // "captain:<id>" or admin email
}
