import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Heart, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEvent } from "@/context/EventContext";
import { getRememberedEmployeeId, useMyEmployee } from "@/hooks/useMyEmployee";
import { getGuestSession, useMyGuest } from "@/hooks/useGuest";

export default function Landing() {
  const navigate = useNavigate();
  const { settings } = useEvent();
  const { me } = useMyEmployee();
  const { me: guestMe } = useMyGuest();

  // Auto-resume the last signed-in participant (employee/guest) so the installed
  // app continues as that user instead of showing the role chooser each launch.
  // Reads localStorage synchronously so it redirects before the chooser flashes.
  // Admins are intentionally excluded (they sign in each time).
  useEffect(() => {
    const empId = getRememberedEmployeeId();
    const guest = getGuestSession();
    if (empId) navigate("/employee/dashboard", { replace: true });
    else if (guest) navigate("/guest/dashboard", { replace: true });
  }, [navigate]);
  const resume = me
    ? { label: `Continue as ${me.name}`, path: "/employee/dashboard" }
    : guestMe
    ? { label: `Continue as ${guestMe.name} (guest)`, path: "/guest/dashboard" }
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 flex items-center gap-3"
        >
          {settings.logoUrl && (
            <img src={settings.logoUrl} alt="logo" className="h-14 w-14 rounded-2xl object-cover" />
          )}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold tracking-tight"
        >
          {settings.eventName || "SINOVA'26"}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Sparkles className="h-4 w-4 text-primary" /> Event Intelligence Platform
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10 grid w-full gap-3"
        >
          {resume && (
            <Button
              size="lg"
              className="h-14 border border-primary/40 bg-primary/15 text-base text-foreground hover:bg-primary/25"
              onClick={() => navigate(resume.path)}
            >
              <ArrowRight className="h-5 w-5" /> {resume.label}
            </Button>
          )}
          <Button size="lg" className="h-14 text-base" onClick={() => navigate("/employee/register")}>
            <QrCode className="h-5 w-5" /> I'm an Employee
            <ArrowRight className="ml-auto h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 text-base"
            onClick={() => navigate("/guest/login")}
          >
            <Heart className="h-5 w-5" /> I'm a Guest
            <ArrowRight className="ml-auto h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-12 text-base"
            onClick={() => navigate("/admin/login")}
          >
            <ShieldCheck className="h-5 w-5" /> I'm an Admin
            <ArrowRight className="ml-auto h-5 w-5" />
          </Button>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
