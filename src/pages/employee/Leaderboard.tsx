import { EmployeeShell } from "@/components/EmployeeShell";
import { LiveLeaderboard } from "@/components/LiveLeaderboard";
import { StandingsVisualizer } from "@/components/StandingsVisualizer";
import { TopHackers } from "@/components/TopHackers";
import { useMyEmployee } from "@/hooks/useMyEmployee";

export default function EmployeeLeaderboard() {
  const { me } = useMyEmployee();
  return (
    <EmployeeShell>
      <div className="space-y-4">
        <h1 className="text-xl font-extrabold">Leaderboard</h1>
        <LiveLeaderboard isPublic highlightTeam={me?.team} />
        <StandingsVisualizer />
        <TopHackers limit={10} />
      </div>
    </EmployeeShell>
  );
}
