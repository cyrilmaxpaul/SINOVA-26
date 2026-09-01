import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onSnapshot, orderBy, query } from "firebase/firestore";
import { backgroundDoc, employeesCol, gamesCol, resultsCol, settingsDoc, teamsCol } from "@/lib/firestore";
import { useAuth } from "@/context/AuthContext";
import type { AppSettings, Employee, Game, GameResult, Team } from "@/lib/types";

interface EventContextValue {
  teams: Team[]; // sorted by points desc (ranked)
  games: Game[];
  employees: Employee[]; // includes guest participants
  guests: Employee[]; // employees where isGuest === true
  results: GameResult[];
  settings: AppSettings;
  bgImage: string;
  loading: boolean;
  activeGames: Game[];
  teamByName: (name: string) => Team | undefined;
  teamRank: (name: string) => number; // 1-based, 0 if not found
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [results, setResults] = useState<GameResult[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ eventName: "SINOVA'26", logoUrl: "" });
  const [bgImage, setBgImage] = useState("");
  const [loaded, setLoaded] = useState({ teams: false, games: false, employees: false });

  // Only subscribe once auth is ready (a valid token exists). Re-subscribe when the
  // signed-in user changes (anonymous employee <-> admin) so listeners always carry a
  // token that satisfies the security rules. Without this gate, the first listen fires
  // before anonymous sign-in completes, gets permission-denied, and the listener dies.
  const { authReady, uid } = useAuth();

  useEffect(() => {
    if (!authReady || !uid) return;

    const onErr = (name: string) => (err: unknown) =>
      console.error(`[EventContext] ${name} listener error`, err);

    const unsubTeams = onSnapshot(
      teamsCol,
      (snap) => {
        setTeams(snap.docs.map((d) => ({ ...(d.data() as Team), id: d.id })));
        setLoaded((s) => ({ ...s, teams: true }));
      },
      onErr("teams")
    );
    const unsubGames = onSnapshot(
      gamesCol,
      (snap) => {
        setGames(snap.docs.map((d) => ({ ...(d.data() as Game), id: d.id })));
        setLoaded((s) => ({ ...s, games: true }));
      },
      onErr("games")
    );
    const unsubEmployees = onSnapshot(
      employeesCol,
      (snap) => {
        setEmployees(snap.docs.map((d) => ({ ...(d.data() as Employee), id: d.id })));
        setLoaded((s) => ({ ...s, employees: true }));
      },
      onErr("employees")
    );
    const unsubResults = onSnapshot(
      query(resultsCol, orderBy("awardedAt", "desc")),
      (snap) => setResults(snap.docs.map((d) => ({ ...(d.data() as GameResult), id: d.id }))),
      onErr("results")
    );
    const unsubSettings = onSnapshot(
      settingsDoc,
      (snap) => {
        if (snap.exists()) setSettings(snap.data() as AppSettings);
      },
      onErr("settings")
    );
    const unsubBg = onSnapshot(
      backgroundDoc,
      (snap) => setBgImage(snap.exists() ? (snap.data().bgImage as string) || "" : ""),
      onErr("background")
    );
    return () => {
      unsubTeams();
      unsubGames();
      unsubEmployees();
      unsubResults();
      unsubSettings();
      unsubBg();
    };
  }, [authReady, uid]);

  const guests = useMemo(() => employees.filter((e) => e.isGuest), [employees]);

  const rankedTeams = useMemo(
    () => [...teams].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)),
    [teams]
  );

  const value: EventContextValue = {
    teams: rankedTeams,
    games,
    employees,
    guests,
    results,
    settings,
    bgImage,
    loading: !(loaded.teams && loaded.games && loaded.employees),
    activeGames: games.filter((g) => g.status === "active"),
    teamByName: (name) => teams.find((t) => t.name === name),
    teamRank: (name) => {
      const idx = rankedTeams.findIndex((t) => t.name === name);
      return idx === -1 ? 0 : idx + 1;
    },
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error("useEvent must be used within EventProvider");
  return ctx;
}
