import { NavLink } from "react-router-dom";
import { ArrowLeftRight, LayoutDashboard, MapPin, QrCode, Trophy, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/employee/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/employee/qr", label: "My QR", icon: QrCode },
  { to: "/employee/attendance", label: "Attend", icon: MapPin },
  { to: "/employee/scream", label: "Scream", icon: Volume2 },
  { to: "/employee/tradeoff", label: "Trade", icon: ArrowLeftRight },
  { to: "/employee/leaderboard", label: "Ranks", icon: Trophy },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
