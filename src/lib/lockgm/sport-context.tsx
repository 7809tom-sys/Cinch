"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_SPORT_ID,
  isSportId,
  sportById,
  type SportConfig,
  type SportId,
} from "./sports";
import {
  franchiseFor,
  type FranchiseKit,
  type Prospect,
} from "./sport-catalog";
import { sportIdFromPath } from "./sport-nav";

const STORAGE_KEY = "lockgm_sport_v1";
const FOOTBALL_DESK_KEY = "lockgm_football_desk_v1";

export type FootballDeskId = "college" | "free_agency";

function isFootballDeskId(value: string): value is FootballDeskId {
  return value === "college" || value === "free_agency";
}

type SportContextValue = {
  sportId: SportId;
  sport: SportConfig;
  franchise: FranchiseKit;
  setSportId: (id: SportId) => void;
  /** Football-only: college draft board vs 2027 NFL free agents. */
  footballDesk: FootballDeskId;
  setFootballDesk: (id: FootballDeskId) => void;
  /** Prospects shown on the active scouting desk. */
  boardProspects: Prospect[];
};

const SportContext = createContext<SportContextValue | null>(null);

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [sportId, setSportIdState] = useState<SportId>(DEFAULT_SPORT_ID);
  const [footballDesk, setFootballDeskState] =
    useState<FootballDeskId>("college");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const pathSport = sportIdFromPath(window.location.pathname);
      const querySport = new URLSearchParams(window.location.search).get(
        "sport",
      );
      if (pathSport) setSportIdState(pathSport);
      else if (querySport && isSportId(querySport)) setSportIdState(querySport);
      else {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw && isSportId(raw)) setSportIdState(raw);
      }
      const desk = window.localStorage.getItem(FOOTBALL_DESK_KEY);
      if (desk && isFootballDeskId(desk)) setFootballDeskState(desk);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setSportId = useCallback((id: SportId) => {
    setSportIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const setFootballDesk = useCallback((id: FootballDeskId) => {
    setFootballDeskState(id);
    try {
      window.localStorage.setItem(FOOTBALL_DESK_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<SportContextValue>(() => {
    const sport = sportById(sportId);
    const franchise = franchiseFor(sportId);
    const boardProspects =
      sportId === "football" && footballDesk === "free_agency"
        ? (franchise.freeAgents ?? franchise.prospects)
        : franchise.prospects;
    return {
      sportId,
      sport,
      franchise,
      setSportId,
      footballDesk,
      setFootballDesk,
      boardProspects,
    };
  }, [sportId, footballDesk, setSportId, setFootballDesk]);

  if (!ready) {
    return (
      <SportContext.Provider value={value}>{children}</SportContext.Provider>
    );
  }

  return (
    <SportContext.Provider value={value}>{children}</SportContext.Provider>
  );
}

export function useSport() {
  const ctx = useContext(SportContext);
  if (!ctx) throw new Error("useSport must be used within SportProvider");
  return ctx;
}
