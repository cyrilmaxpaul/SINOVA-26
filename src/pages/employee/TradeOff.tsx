import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeftRight, Crown, HandCoins, ScanLine } from "lucide-react";
import { useEvent } from "@/context/EventContext";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { useTrades } from "@/hooks/useModuleData";
import { tradeableIndividuals } from "@/lib/trade";
import { tsToDate } from "@/lib/firestore";
import { EmployeeShell } from "@/components/EmployeeShell";
import { TradeScanner } from "@/components/TradeScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmployeeTradeOff() {
  const navigate = useNavigate();
  const { me, loading } = useMyEmployee();
  const { teams, employees, games, results, loading: eventLoading } = useEvent();
  const trades = useTrades();
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!eventLoading && !me) navigate("/employee/register", { replace: true });
  }, [eventLoading, me, navigate]);

  const myTeam = useMemo(() => (me ? teams.find((t) => t.name === me.team) : undefined), [teams, me]);
  const isCaptain = !!me && myTeam?.captainId === me.id;

  const individuals = useMemo(
    () => tradeableIndividuals(employees, games, results, trades),
    [employees, games, results, trades]
  );
  const myStatus = me ? individuals.find((i) => i.emp.id === me.id) : undefined;
  const received = me ? trades.filter((t) => t.receivingTeam === me.team) : [];
  const tradedSourceTeams = new Set(received.map((t) => t.sourceTeam));

  if (loading || !me)
    return (
      <EmployeeShell hideNav>
        <div />
      </EmployeeShell>
    );

  return (
    <EmployeeShell>
      <div className="space-y-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <ArrowLeftRight className="h-6 w-6 text-primary" /> Trade-off
          </h1>
          <p className="text-sm text-muted-foreground">
            Convince a rival's individual point holder to share — your team gains half their points.
          </p>
        </div>

        {me.isGuest ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Trade-off is for employees only.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* My own tradeable status */}
            {myStatus && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex items-center gap-3 p-4">
                  <HandCoins className="h-6 w-6 text-primary" />
                  <div className="text-sm">
                    <p className="font-semibold">You're an individual point holder.</p>
                    {myStatus.trade ? (
                      <p className="text-muted-foreground">
                        You've traded {myStatus.credit} pts to{" "}
                        <span className="font-medium text-foreground">{myStatus.trade.receivingTeam}</span>.
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        A rival captain can scan your QR <span className="font-medium">once</span> to gain{" "}
                        <span className="font-medium text-foreground">{myStatus.credit} pts</span>. Your team keeps
                        its points.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Captain scanner */}
            {isCaptain ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Crown className="h-4 w-4 text-amber-500" /> Captain — collect a trade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scanning ? (
                    <>
                      <TradeScanner
                        receivingTeamId={myTeam!.id}
                        receivingTeamName={myTeam!.name}
                        by={`captain:${me.id}`}
                        onDone={() => setScanning(false)}
                      />
                      <Button variant="outline" className="w-full" onClick={() => setScanning(false)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button className="w-full" size="lg" onClick={() => setScanning(true)}>
                        <ScanLine className="h-5 w-5" /> Scan an individual's QR
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        One trade per rival team. You've already traded with:{" "}
                        {tradedSourceTeams.size ? [...tradedSourceTeams].join(", ") : "no one yet"}.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Only your team captain can scan to collect trades. Ask{" "}
                  <span className="font-medium text-foreground">{myTeam?.captainName ?? "your captain"}</span> to
                  scan the individual's QR.
                </CardContent>
              </Card>
            )}

            {/* Received trades */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{me.team} — points gained</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {received.length === 0 && (
                  <p className="py-3 text-center text-sm text-muted-foreground">No trades yet.</p>
                )}
                {received.map((t) => {
                  const d = tsToDate(t.at);
                  return (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border p-2.5">
                      <div className="text-sm">
                        <div className="font-medium">{t.individualName}</div>
                        <div className="text-xs text-muted-foreground">
                          from {t.sourceTeam}
                          {d && ` · ${format(d, "h:mm a")}`}
                        </div>
                      </div>
                      <span className="font-bold text-green-600 dark:text-green-400">+{t.points}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </EmployeeShell>
  );
}
