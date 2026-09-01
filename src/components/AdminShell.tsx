import { NavLink, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  BarChart3,
  Gamepad2,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  Play,
  ScanLine,
  Users,
  UsersRound,
  Volume2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { BrandTitle } from "@/components/BrandTitle";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin/play", label: "Play", icon: Play },
  { to: "/admin/scanner", label: "Scanner", icon: ScanLine },
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/leaderboard", label: "Leaderboard", icon: BarChart3 },
  { to: "/admin/games", label: "Games", icon: Gamepad2 },
  { to: "/admin/teams", label: "Teams", icon: UsersRound },
  { to: "/admin/attendance", label: "Attendance", icon: MapPin },
  { to: "/admin/scream", label: "Scream", icon: Volume2 },
  { to: "/admin/tradeoff", label: "Trade-off", icon: ArrowLeftRight },
  { to: "/admin/employees", label: "Employees", icon: Users },
  { to: "/admin/roster", label: "Roster", icon: ListChecks },
  { to: "/admin/history", label: "History", icon: History },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin, logoutAdmin } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logoutAdmin();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass-bar sticky top-0 z-30 border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <BrandTitle subtitle="Event Intelligence Dashboard" />
          <div className="ml-auto flex items-center gap-2">
            {admin && (
              <Badge variant="secondary" className="hidden capitalize sm:inline-flex">
                {admin.role}
              </Badge>
            )}
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
        {/* Scrollable tab nav — mobile friendly */}
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <Footer />
    </div>
  );
}
