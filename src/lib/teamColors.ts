/**
 * Teams are created dynamically by the admin, who picks a color key from this palette.
 * TeamColorBadge and charts resolve visuals from the stored `color` key.
 */

export interface TeamColor {
  key: string;
  label: string;
  badge: string; // tailwind bg for badges/dots
  text: string; // readable text on badge
  bar: string; // hex for recharts / inline styles
  soft: string; // soft bg for cards/rows
  ring: string; // ring/border accent
}

export const TEAM_COLORS: TeamColor[] = [
  { key: "green", label: "Green", badge: "bg-green-500", text: "text-white", bar: "#22c55e", soft: "bg-green-500/10", ring: "ring-green-500/40" },
  { key: "purple", label: "Purple", badge: "bg-purple-500", text: "text-white", bar: "#a855f7", soft: "bg-purple-500/10", ring: "ring-purple-500/40" },
  { key: "blue", label: "Blue", badge: "bg-blue-500", text: "text-white", bar: "#3b82f6", soft: "bg-blue-500/10", ring: "ring-blue-500/40" },
  { key: "teal", label: "Teal", badge: "bg-teal-500", text: "text-white", bar: "#14b8a6", soft: "bg-teal-500/10", ring: "ring-teal-500/40" },
  { key: "orange", label: "Orange", badge: "bg-orange-500", text: "text-white", bar: "#f97316", soft: "bg-orange-500/10", ring: "ring-orange-500/40" },
  { key: "pink", label: "Pink", badge: "bg-pink-500", text: "text-white", bar: "#ec4899", soft: "bg-pink-500/10", ring: "ring-pink-500/40" },
  { key: "amber", label: "Amber", badge: "bg-amber-500", text: "text-black", bar: "#f59e0b", soft: "bg-amber-500/10", ring: "ring-amber-500/40" },
  { key: "red", label: "Red", badge: "bg-red-500", text: "text-white", bar: "#ef4444", soft: "bg-red-500/10", ring: "ring-red-500/40" },
  { key: "cyan", label: "Cyan", badge: "bg-cyan-500", text: "text-white", bar: "#06b6d4", soft: "bg-cyan-500/10", ring: "ring-cyan-500/40" },
  { key: "indigo", label: "Indigo", badge: "bg-indigo-500", text: "text-white", bar: "#6366f1", soft: "bg-indigo-500/10", ring: "ring-indigo-500/40" },
];

const FALLBACK: TeamColor = {
  key: "slate",
  label: "Slate",
  badge: "bg-slate-500",
  text: "text-white",
  bar: "#64748b",
  soft: "bg-slate-500/10",
  ring: "ring-slate-500/40",
};

export function resolveColor(key: string | undefined): TeamColor {
  return TEAM_COLORS.find((c) => c.key === key) ?? FALLBACK;
}

/** Deterministic color for a team name when no explicit color key is stored. */
export function colorForName(name: string): TeamColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TEAM_COLORS[hash % TEAM_COLORS.length];
}
