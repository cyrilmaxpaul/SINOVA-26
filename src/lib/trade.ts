import { TRADE_OFF_RATE } from "@/lib/constants";
import type { Employee, Game, GameResult, Trade } from "@/lib/types";

export interface TradeableIndividual {
  emp: Employee;
  earned: number; // trade-off points the individual holds (counted to their own team)
  credit: number; // points a receiving team gains on a trade (half of earned)
  trade?: Trade; // the completed trade, if already traded
}

/**
 * Derive who is a tradeable "individual point holder": anyone awarded points in a
 * game flagged `isTradeOff`. Their points already count to their own team; a trade
 * grants the receiving team half, once, with no deduction.
 */
export function tradeableIndividuals(
  employees: Employee[],
  games: Game[],
  results: GameResult[],
  trades: Trade[]
): TradeableIndividual[] {
  const tradeOffGameIds = new Set(games.filter((g) => g.isTradeOff).map((g) => g.id));
  if (tradeOffGameIds.size === 0) return [];

  const earnedByEmp = new Map<string, number>();
  for (const r of results) {
    if (tradeOffGameIds.has(r.gameId) && r.employeeId) {
      earnedByEmp.set(r.employeeId, (earnedByEmp.get(r.employeeId) ?? 0) + r.points);
    }
  }

  const tradeByEmp = new Map(trades.map((t) => [t.individualId, t] as const));

  const out: TradeableIndividual[] = [];
  for (const [empId, earned] of earnedByEmp) {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) continue;
    out.push({ emp, earned, credit: earned * TRADE_OFF_RATE, trade: tradeByEmp.get(empId) });
  }
  return out.sort((a, b) => a.emp.name.localeCompare(b.emp.name));
}
