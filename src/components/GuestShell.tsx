import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, MapPin, QrCode, Trophy, Volume2 } from "lucide-react";
import { BrandTitle } from "@/components/BrandTitle";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { forgetGuest } from "@/hooks/useGuest";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/guest/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/guest/qr", label: "My QR", icon: QrCode },
  { to: "/guest/attendance", label: "Attend", icon: MapPin },
  { to: "/guest/scream", label: "Scream", icon: Volume2 },
  { to: "/guest/leaderboard", label: "Ranks", icon: Trophy },
];

export function GuestShell({ children, hideNav = false }: { children: React.ReactNode; hideNav?: boolean }) {
  const navigate = useNavigate();
  const [confirmLeave, setConfirmLeave] = useState(false);

  function leave() {
    forgetGuest();
    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass-bar sticky top-0 z-20 border-b border-border/60">
        <div className="mx-auto flex max-w-md items-center px-4 py-3">
          <BrandTitle />
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              GUEST
            </span>
            <ThemeToggle />
            {!hideNav && (
              <Button variant="ghost" size="icon" onClick={() => setConfirmLeave(true)} aria-label="Leave">
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-4">{children}</main>
      <Footer className={hideNav ? "" : "pb-24"} />

      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-md items-stretch justify-around">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
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
      )}

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Leave?</DialogTitle>
            <DialogDescription>You'll be signed out on this device. You can rejoin anytime.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmLeave(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={leave}>
              Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
