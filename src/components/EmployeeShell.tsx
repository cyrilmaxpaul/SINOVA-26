import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
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
import { forgetEmployee } from "@/hooks/useMyEmployee";

export function EmployeeShell({
  children,
  hideNav = false,
  showLogout = false,
}: {
  children: React.ReactNode;
  hideNav?: boolean;
  showLogout?: boolean;
}) {
  const navigate = useNavigate();
  const [confirmLeave, setConfirmLeave] = useState(false);

  function leave() {
    forgetEmployee();
    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass-bar sticky top-0 z-20 border-b border-border/60">
        <div className="mx-auto flex max-w-md items-center px-4 py-3">
          <BrandTitle />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {showLogout && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmLeave(true)}
                aria-label="Leave event"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-4">{children}</main>
      <Footer className={hideNav ? "" : "pb-24"} />
      {!hideNav && <BottomNav />}

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Leave the event?</DialogTitle>
            <DialogDescription>
              You'll be signed out on this device. You can rejoin anytime with your Employee ID.
            </DialogDescription>
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
