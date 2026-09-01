import { useEffect } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useScream } from "@/hooks/useModuleData";
import { useMicLevel } from "@/hooks/useMicLevel";
import { pushScreamLevel } from "@/lib/firestore";
import { ScreamMeter } from "@/components/ScreamMeter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Employee } from "@/lib/types";

/** Scream Machine recorder shared by employee and guest logins. */
export function ScreamPanel({ me }: { me: Employee }) {
  const { state } = useScream();
  const mic = useMicLevel({
    sampleMs: 250,
    onSample: (level, peak, db) => {
      pushScreamLevel({ emp: me, level, peak, db }).catch(() => {});
    },
  });

  const myTurn = state?.activeTeam === me.team && !!state?.recording;

  // Stop recording as soon as the organizer ends our team's round.
  useEffect(() => {
    if (!myTurn && mic.running) mic.stop();
  }, [myTurn, mic.running, mic]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <Volume2 className="h-6 w-6 text-primary" /> Scream Machine
        </h1>
        <p className="text-sm text-muted-foreground">
          When it's your team's turn, scream as loud as you can into your phone!
        </p>
      </div>

      {myTurn ? (
        <Card className="border-primary/40">
          <CardContent className="space-y-4 p-5">
            <p className="text-center text-sm font-semibold text-primary">
              🔊 {me.team} is LIVE — go!
            </p>
            <ScreamMeter
              level={mic.running ? mic.level : 0}
              peak={mic.peak}
              db={mic.running ? mic.db : undefined}
              label="Your loudness"
            />
            {mic.error && <p className="text-sm text-destructive">{mic.error}</p>}
            {mic.running ? (
              <Button variant="destructive" className="w-full" size="lg" onClick={mic.stop}>
                <MicOff className="h-5 w-5" /> Stop
              </Button>
            ) : (
              <Button className="w-full" size="lg" onClick={mic.start}>
                <Mic className="h-5 w-5" /> Start screaming
              </Button>
            )}
            <p className="text-center text-[11px] text-muted-foreground">
              Loudness is a relative 0–100 meter (not calibrated decibels).
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <MicOff className="h-10 w-10 text-muted-foreground" />
            {state?.activeTeam && state.activeTeam !== me.team ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{state.activeTeam}</span> is up right now. Wait for your team's turn.
              </p>
            ) : state?.activeTeam === me.team && !state?.recording ? (
              <p className="text-sm text-muted-foreground">Get ready — your round is about to start.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Waiting for the organizer to start your team's round.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
