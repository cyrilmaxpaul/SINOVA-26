import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  attendanceAwardsCol,
  attendanceCol,
  screamLevelsCol,
  screamResultsCol,
  screamStateDoc,
  tradesCol,
} from "@/lib/firestore";
import type {
  AttendanceAward,
  AttendanceRecord,
  ScreamLevel,
  ScreamResult,
  ScreamState,
  Trade,
} from "@/lib/types";

/** Live attendance check-ins + awards. */
export function useAttendance(): { records: AttendanceRecord[]; awards: AttendanceAward[] } {
  const { authReady, uid } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [awards, setAwards] = useState<AttendanceAward[]>([]);

  useEffect(() => {
    if (!authReady || !uid) return;
    const onErr = (name: string) => (err: unknown) =>
      console.error(`[useAttendance] ${name} listener error`, err);
    const u1 = onSnapshot(
      attendanceCol,
      (s) => setRecords(s.docs.map((d) => ({ ...(d.data() as AttendanceRecord), id: d.id }))),
      onErr("records")
    );
    const u2 = onSnapshot(
      attendanceAwardsCol,
      (s) => setAwards(s.docs.map((d) => ({ ...(d.data() as AttendanceAward), id: d.id }))),
      onErr("awards")
    );
    return () => {
      u1();
      u2();
    };
  }, [authReady, uid]);

  return { records, awards };
}

/** Live scream session state, streamed levels, and locked-in results. */
export function useScream(): {
  state: ScreamState | null;
  levels: ScreamLevel[];
  results: ScreamResult[];
} {
  const { authReady, uid } = useAuth();
  const [state, setState] = useState<ScreamState | null>(null);
  const [levels, setLevels] = useState<ScreamLevel[]>([]);
  const [results, setResults] = useState<ScreamResult[]>([]);

  useEffect(() => {
    if (!authReady || !uid) return;
    const onErr = (name: string) => (err: unknown) =>
      console.error(`[useScream] ${name} listener error`, err);
    const u1 = onSnapshot(
      screamStateDoc,
      (s) =>
        setState(s.exists() ? (s.data() as ScreamState) : { activeTeam: null, recording: false, startedAt: null }),
      onErr("state")
    );
    const u2 = onSnapshot(
      screamLevelsCol,
      (s) => setLevels(s.docs.map((d) => ({ ...(d.data() as ScreamLevel), id: d.id }))),
      onErr("levels")
    );
    const u3 = onSnapshot(
      screamResultsCol,
      (s) => setResults(s.docs.map((d) => ({ ...(d.data() as ScreamResult), id: d.id }))),
      onErr("results")
    );
    return () => {
      u1();
      u2();
      u3();
    };
  }, [authReady, uid]);

  return { state, levels, results };
}

/** Live completed trades. */
export function useTrades(): Trade[] {
  const { authReady, uid } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    if (!authReady || !uid) return;
    const u = onSnapshot(
      tradesCol,
      (s) => setTrades(s.docs.map((d) => ({ ...(d.data() as Trade), id: d.id }))),
      (err) => console.error("[useTrades] listener error", err)
    );
    return () => u();
  }, [authReady, uid]);

  return trades;
}
