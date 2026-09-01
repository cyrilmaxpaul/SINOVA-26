import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { loginOrRegisterGuest, RegistrationError } from "@/lib/firestore";
import { rememberGuest, useMyGuest } from "@/hooks/useGuest";
import { EmployeeShell } from "@/components/EmployeeShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GuestRelationship } from "@/lib/types";

const RELATIONSHIPS: GuestRelationship[] = ["Husband", "Wife", "Son", "Daughter"];

export default function GuestLogin() {
  const navigate = useNavigate();
  const { uid } = useAuth();
  const { session, me } = useMyGuest();

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<GuestRelationship>("Wife");
  const [employeeId, setEmployeeId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already a guest on this device → go to guest dashboard.
  useEffect(() => {
    if (session && me) navigate("/guest/dashboard", { replace: true });
  }, [session, me, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    if (!name.trim() || !employeeId.trim()) {
      toast.error("Please enter your name and the Employee ID.");
      return;
    }
    setSubmitting(true);
    try {
      const { participantId, team, resumed } = await loginOrRegisterGuest({
        name,
        relationship,
        linkedEmployeeId: employeeId,
        authUid: uid,
      });
      rememberGuest({
        participantId,
        name: name.trim(),
        relationship,
        linkedEmployeeId: employeeId.trim(),
      });
      toast.success(resumed ? "Welcome back! 🎉" : `Welcome to ${team}! 🎉`, { duration: 4000 });
      navigate("/guest/dashboard", { replace: true });
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold">Guest Sign-In</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join as a guest player — you'll get your own team and QR. Enter the Employee ID of who you came with.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="gname">Your Name</Label>
                <Input
                  id="gname"
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rel">Relationship to Employee</Label>
                <Select
                  id="rel"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as GuestRelationship)}
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eid">Employee ID</Label>
                <Input
                  id="eid"
                  placeholder="e.g. EMP012"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  autoCapitalize="characters"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enter Event"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </EmployeeShell>
  );
}
