import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEvent } from "@/context/EventContext";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { EmployeeShell } from "@/components/EmployeeShell";
import { ScreamPanel } from "@/components/ScreamPanel";

export default function EmployeeScream() {
  const navigate = useNavigate();
  const { me, loading } = useMyEmployee();
  const { loading: eventLoading } = useEvent();

  useEffect(() => {
    if (!eventLoading && !me) navigate("/employee/register", { replace: true });
  }, [eventLoading, me, navigate]);

  if (loading || !me)
    return (
      <EmployeeShell hideNav>
        <div />
      </EmployeeShell>
    );

  return (
    <EmployeeShell>
      <ScreamPanel me={me} />
    </EmployeeShell>
  );
}
