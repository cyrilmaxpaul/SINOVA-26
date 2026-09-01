import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useMyGuest } from "@/hooks/useGuest";
import { GuestShell } from "@/components/GuestShell";
import { EmployeeDashboardView } from "@/components/EmployeeDashboardView";
import { CardSkeleton } from "@/components/Skeletons";

export default function GuestDashboard() {
  const navigate = useNavigate();
  const { session, me, loading } = useMyGuest();

  useEffect(() => {
    if (!session) navigate("/guest/login", { replace: true });
  }, [session, navigate]);

  if (loading || !session || !me) {
    return (
      <GuestShell>
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </GuestShell>
    );
  }

  const banner = (
    <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
      <Heart className="h-4 w-4 shrink-0 text-primary" />
      <span>
        You joined as <b>{me.relationship}</b>
        {me.linkedEmployeeName ? (
          <>
            {" "}
            of <b>{me.linkedEmployeeName}</b>
          </>
        ) : null}
      </span>
    </div>
  );

  return (
    <GuestShell>
      <EmployeeDashboardView employee={me} qrFullScreenPath="/guest/qr" banner={banner} />
    </GuestShell>
  );
}
