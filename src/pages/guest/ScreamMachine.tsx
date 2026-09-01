import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMyGuest } from "@/hooks/useGuest";
import { GuestShell } from "@/components/GuestShell";
import { ScreamPanel } from "@/components/ScreamPanel";

export default function GuestScream() {
  const navigate = useNavigate();
  const { session, me, loading } = useMyGuest();

  useEffect(() => {
    if (!session) navigate("/guest/login", { replace: true });
  }, [session, navigate]);

  if (loading || !me)
    return (
      <GuestShell hideNav>
        <div />
      </GuestShell>
    );

  return (
    <GuestShell>
      <ScreamPanel me={me} />
    </GuestShell>
  );
}
