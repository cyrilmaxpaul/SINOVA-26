import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEvent } from "@/context/EventContext";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { EmployeeShell } from "@/components/EmployeeShell";
import { EmployeeDashboardView } from "@/components/EmployeeDashboardView";
import { CardSkeleton } from "@/components/Skeletons";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { loading } = useEvent();
  const { me } = useMyEmployee();

  useEffect(() => {
    if (!loading && !me) navigate("/employee/register", { replace: true });
  }, [loading, me, navigate]);

  if (loading || !me) {
    return (
      <EmployeeShell>
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </EmployeeShell>
    );
  }

  return (
    <EmployeeShell showLogout>
      <EmployeeDashboardView employee={me} />
    </EmployeeShell>
  );
}
