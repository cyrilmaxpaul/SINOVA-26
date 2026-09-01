import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMyGuest } from "@/hooks/useGuest";
import { GuestShell } from "@/components/GuestShell";
import { PersonalQRView } from "@/components/PersonalQRView";

export default function GuestQR() {
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
      <PersonalQRView employee={me} />
    </GuestShell>
  );
}
