import { useEvent } from "@/context/EventContext";
import { useAuth } from "@/context/AuthContext";
import type { Employee } from "@/lib/types";

const LS_KEY = "sinova-emp-id";

export function rememberEmployee(id: string) {
  localStorage.setItem(LS_KEY, id);
}

export function forgetEmployee() {
  localStorage.removeItem(LS_KEY);
}

/** Synchronous read of the remembered employee id (used to auto-resume on launch). */
export function getRememberedEmployeeId(): string | null {
  return localStorage.getItem(LS_KEY);
}

/** Resolve the employee for this device — by remembered id first, then by authUid link. */
export function useMyEmployee(): { me: Employee | null; loading: boolean } {
  const { employees, loading } = useEvent();
  const { uid } = useAuth();
  const rememberedId = localStorage.getItem(LS_KEY);

  const me =
    (rememberedId && employees.find((e) => e.id === rememberedId)) ||
    (uid && employees.find((e) => e.authUid === uid)) ||
    null;

  return { me: me || null, loading };
}
