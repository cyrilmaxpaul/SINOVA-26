import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useEvent } from "@/context/EventContext";
import { useTrades } from "@/hooks/useModuleData";
import { executeTrade, TradeError } from "@/lib/firestore";
import { tradeableIndividuals } from "@/lib/trade";
import { QRScanner } from "@/components/QRScanner";
import type { EmployeeQRPayload } from "@/lib/types";

interface Props {
  /** Team that will receive the traded points. */
  receivingTeamId: string;
  receivingTeamName: string;
  /** Audit string, e.g. "captain:<id>" or an admin email. */
  by: string;
  onDone?: () => void;
}

/** Scan an individual's personal QR to credit the receiving team half their points. */
export function TradeScanner({ receivingTeamId, receivingTeamName, by, onDone }: Props) {
  const { employees, teams, games, results } = useEvent();
  const trades = useTrades();
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);

  async function handleScan(payload: EmployeeQRPayload) {
    if (lock.current || saving) return;
    lock.current = true;
    setSaving(true);
    try {
      const emp = employees.find((e) => e.id === payload.empId);
      if (!emp) {
        toast.error("Participant not found.");
        return;
      }
      const individuals = tradeableIndividuals(employees, games, results, trades);
      const info = individuals.find((t) => t.emp.id === emp.id);
      if (!info) {
        toast.error(`${emp.name} hasn't played a trade-off activity.`);
        return;
      }
      if (info.trade) {
        toast.error(`${emp.name} already traded to ${info.trade.receivingTeam}.`);
        return;
      }
      if (emp.team === receivingTeamName) {
        toast.error("You can't trade points from your own team member.");
        return;
      }
      const sourceTeam = teams.find((t) => t.name === emp.team);
      if (!sourceTeam) {
        toast.error("Source team not found.");
        return;
      }
      await executeTrade({
        individual: emp,
        receivingTeamId,
        receivingTeamName,
        sourceTeamId: sourceTeam.id,
        creditPoints: info.credit,
        by,
      });
      toast.success(`+${info.credit} to ${receivingTeamName} from ${emp.name}`);
      onDone?.();
    } catch (e) {
      if (e instanceof TradeError) toast.error(e.message);
      else {
        console.error(e);
        toast.error("Trade failed. Try again.");
      }
    } finally {
      setSaving(false);
      setTimeout(() => (lock.current = false), 900);
    }
  }

  return <QRScanner onScan={handleScan} paused={saving} />;
}
