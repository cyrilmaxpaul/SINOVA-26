import { LiveLeaderboard } from "@/components/LiveLeaderboard";
import { StandingsVisualizer } from "@/components/StandingsVisualizer";
import { TopHackers } from "@/components/TopHackers";

export default function AdminLeaderboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Live Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          Big-screen standings — updates in real time after every awarded game.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <LiveLeaderboard />
        </div>
        <div className="lg:col-span-2">
          <StandingsVisualizer />
        </div>
      </div>
      <TopHackers limit={10} />
    </div>
  );
}
