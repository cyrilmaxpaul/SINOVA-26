import { useEvent } from "@/context/EventContext";
import type { Employee, GuestRelationship } from "@/lib/types";

const LS_KEY = "sinova-guest";

export interface GuestSession {
  participantId: string; // the guest's own participant/employee id
  name: string;
  relationship: GuestRelationship;
  linkedEmployeeId: string;
}

export function rememberGuest(session: GuestSession) {
  localStorage.setItem(LS_KEY, JSON.stringify(session));
}

export function forgetGuest() {
  localStorage.removeItem(LS_KEY);
}

function readSession(): GuestSession | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as GuestSession) : null;
  } catch {
    return null;
  }
}

/** Synchronous read of the stored guest session (used to auto-resume on launch). */
export function getGuestSession(): GuestSession | null {
  return readSession();
}

/** Resolve the guest's OWN participant record (they're a full team member). */
export function useMyGuest(): { session: GuestSession | null; me: Employee | null; loading: boolean } {
  const { employees, loading } = useEvent();
  const session = readSession();
  const me = session ? employees.find((e) => e.id === session.participantId) ?? null : null;
  return { session, me, loading };
}
