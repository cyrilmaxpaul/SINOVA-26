import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getAdmin } from "@/lib/firestore";
import type { Admin } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  uid: string | null;
  authReady: boolean;
  admin: Admin | null;
  adminChecking: boolean;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logoutAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export class AdminAuthError extends Error {}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [adminChecking, setAdminChecking] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        // Sign in anonymously so employees can read/register without a login screen.
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Anonymous sign-in failed", e);
          setAuthReady(true);
        }
        return;
      }
      setUser(u);
      // If this is an email/password user, verify admin membership.
      if (!u.isAnonymous && u.email) {
        setAdminChecking(true);
        try {
          const a = await getAdmin(u.email);
          setAdmin(a);
        } finally {
          setAdminChecking(false);
        }
      } else {
        setAdmin(null);
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  async function loginAdmin(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const a = await getAdmin(cred.user.email || email);
    if (!a) {
      await signOut(auth); // will re-trigger anonymous sign-in
      throw new AdminAuthError("This account is not registered as an admin.");
    }
    setAdmin(a);
  }

  async function logoutAdmin() {
    setAdmin(null);
    await signOut(auth); // onAuthStateChanged re-signs in anonymously
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        uid: user?.uid ?? null,
        authReady,
        admin,
        adminChecking,
        loginAdmin,
        logoutAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
