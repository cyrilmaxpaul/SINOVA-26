import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Loader2, PartyPopper } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEvent } from "@/context/EventContext";
import { loginOrRegisterEmployee, RegistrationError } from "@/lib/firestore";
import { rememberEmployee, useMyEmployee } from "@/hooks/useMyEmployee";
import { EmployeeShell } from "@/components/EmployeeShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Register() {
  const navigate = useNavigate();
  const { uid } = useAuth();
  const { teams } = useEvent();
  const { me } = useMyEmployee();

  const [empId, setEmpId] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already registered on this device → go straight to dashboard.
  useEffect(() => {
    if (me) navigate("/employee/dashboard", { replace: true });
  }, [me, navigate]);

  const noTeams = teams.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    const id = empId.trim();
    if (!id || !name.trim()) {
      toast.error("Please enter both your Employee ID and name.");
      return;
    }
    setSubmitting(true);
    try {
      const { id: resolvedId, team, resumed } = await loginOrRegisterEmployee({
        empId: id,
        name,
        authUid: uid,
      });
      rememberEmployee(resolvedId);
      toast.success(resumed ? "Welcome back! 🎉" : `Welcome to ${team}! 🎉`, { duration: 4000 });
      navigate("/employee/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof RegistrationError) toast.error(err.message);
      else {
        console.error(err);
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <EmployeeShell hideNav>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <PartyPopper className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold">Join the Event</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your details — we'll assign you to a team automatically.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Details</CardTitle>
          </CardHeader>
          <CardContent>
            {noTeams && (
              <p className="mb-4 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
                Registration isn't open yet — no teams are available. Please ask an organizer.
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="empId">Employee ID</Label>
                <Input
                  id="empId"
                  placeholder="e.g. EMP012"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  autoCapitalize="characters"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={submitting || noTeams}>
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Join Event"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </EmployeeShell>
  );
}
