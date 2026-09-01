import { Crown, Trophy } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useEvent } from "@/context/EventContext";
import { resolveColor } from "@/lib/teamColors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  isPublic?: boolean;
  highlightTeam?: string;
  title?: string;
  description?: string;
}

/** Shared ranked leaderboard used by both employee and admin. */
export function LiveLeaderboard({
  isPublic = false,
  highlightTeam,
  title = "Team Championship Rankings",
  description = "Live standings automatically updated as check-ins are verified.",
}: Props) {
  const { teams } = useEvent();
  const maxPoints = Math.max(1, ...teams.map((t) => t.points));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {title}
          </span>
          {!isPublic && (
            <span className="text-xs font-normal text-muted-foreground">
              Updated {format(new Date(), "h:mm:ss a")}
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {teams.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No teams yet. An organizer needs to create teams first.
          </p>
        )}
        {teams.map((team, i) => {
          const color = resolveColor(team.color);
          const isLeader = i === 0 && team.points > 0;
          const highlighted = highlightTeam === team.name;
          return (
            <motion.div
              key={team.id}
              layout
              className={cn(
                "relative overflow-hidden rounded-xl border p-3",
                highlighted ? cn("ring-2", color.ring) : "border-border",
                color.soft
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/70 text-sm font-bold">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2.5 w-2.5 rounded-full", color.badge)} />
                    <span className="truncate font-semibold">{team.name}</span>
                    {isLeader && <Crown className="h-4 w-4 text-amber-400" />}
                    {highlighted && (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        YOUR TEAM
                      </span>
                    )}
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background/60">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color.bar }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(team.points / maxPoints) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold tabular-nums">{team.points}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {team.members}/{team.maxMembers} players
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
