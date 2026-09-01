import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { TeamColorBadge } from "@/components/TeamColorBadge";
import { Button } from "@/components/ui/button";
import type { Employee, EmployeeQRPayload } from "@/lib/types";

/** Full-screen personal QR for a participant (employee or guest). */
export function PersonalQRView({ employee }: { employee: Employee }) {
  const navigate = useNavigate();
  const payload: EmployeeQRPayload = { empId: employee.id, name: employee.name, team: employee.team };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center pt-4"
    >
      <Button variant="ghost" size="sm" className="self-start" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <h1 className="mt-4 text-xl font-bold">{employee.name}</h1>
      <div className="mt-2">
        <TeamColorBadge team={employee.team} showDot />
      </div>

      <div className="mt-6 rounded-3xl bg-white p-6 shadow-xl">
        <QRCodeSVG value={JSON.stringify(payload)} size={260} level="M" />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ID: <span className="font-semibold text-foreground">{employee.id}</span>
      </p>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Show this code to an admin during games to receive points.
      </p>
    </motion.div>
  );
}
