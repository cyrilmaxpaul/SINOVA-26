import { GuestShell } from "@/components/GuestShell";
import { LiveLeaderboard } from "@/components/LiveLeaderboard";
import { StandingsVisualizer } from "@/components/StandingsVisualizer";
import { TopHackers } from "@/components/TopHackers";
import { useMyGuest } from "@/hooks/useGuest";

export default function GuestLeaderboard() {
  const { me } = useMyGuest();
  return (
    <GuestShell>
      <div className="space-y-4">
        <h1 className="text-xl font-extrabold">Leaderboard</h1>
        <LiveLeaderboard isPublic highlightTeam={me?.team} />
        <StandingsVisualizer />
        <TopHackers limit={10} />
      </div>
    </GuestShell>
  );
}
