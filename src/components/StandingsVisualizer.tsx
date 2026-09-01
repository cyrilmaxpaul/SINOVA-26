import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { useEvent } from "@/context/EventContext";
import { resolveColor } from "@/lib/teamColors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Round Y-axis ticks to clean multiples (0, 5, 10, …) instead of Recharts' 0/3/6. */
function niceTicks(max: number): { ticks: number[]; niceMax: number } {
  const step = max <= 20 ? 5 : max <= 50 ? 10 : max <= 100 ? 20 : max <= 250 ? 25 : 50;
  const niceMax = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= niceMax; v += step) ticks.push(v);
  return { ticks, niceMax };
}

export function StandingsVisualizer() {
  const { teams } = useEvent();
  const data = teams.map((t) => ({
    name: t.name,
    points: t.points,
    fill: resolveColor(t.color).bar,
  }));
  const maxPoints = data.reduce((m, d) => Math.max(m, d.points), 0);
  const { ticks, niceMax } = niceTicks(maxPoints);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Standings Visualizer
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          A visual weight comparison across the tech ecosystem.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {data.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-muted-foreground">
            No teams to visualize yet.
          </p>
        ) : (
          <div className="min-h-[260px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, niceMax]}
                  ticks={ticks}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="points" radius={[6, 6, 0, 0]} maxBarSize={64}>
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Scores are aggregated in real time from team transactions.
        </p>
      </CardContent>
    </Card>
  );
}
