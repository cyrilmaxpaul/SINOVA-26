import { useEvent } from "@/context/EventContext";
import { colorForName, resolveColor } from "@/lib/teamColors";
import { cn } from "@/lib/utils";

interface Props {
  team: string;
  className?: string;
  showDot?: boolean;
}

/** Colored badge for a team. Resolves color from the team's stored `color` key. */
export function TeamColorBadge({ team, className, showDot = false }: Props) {
  const { teamByName } = useEvent();
  const t = teamByName(team);
  const color = t ? resolveColor(t.color) : colorForName(team);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        color.badge,
        color.text,
        className
      )}
    >
      {showDot && <span className="h-1.5 w-1.5 rounded-full bg-white/80" />}
      {team}
    </span>
  );
}
