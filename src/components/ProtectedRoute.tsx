import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { AdminRole } from "@/lib/types";
import { Loader2 } from "lucide-react";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/** Guards admin routes: requires a verified admin, optionally with one of `roles`. */
export function AdminRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: AdminRole[];
}) {
  const { admin, adminChecking, authReady, user } = useAuth();
  const location = useLocation();

  if (!authReady || adminChecking) return <FullScreenLoader />;

  if (!admin || !user || user.isAnonymous) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }
  if (roles && !roles.includes(admin.role)) {
    return <Navigate to="/admin/scanner" replace />;
  }
  return <>{children}</>;
}

/** Guards employee routes: just needs the anonymous auth to be ready. */
export function EmployeeRoute({ children }: { children: React.ReactNode }) {
  const { authReady, uid } = useAuth();
  if (!authReady || !uid) return <FullScreenLoader />;
  return <>{children}</>;
}
