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
import { franchiseFor, type FranchiseKit } from "./sport-catalog";

const STORAGE_KEY = "lockgm_sport_v1";

type SportContextValue = {
  sportId: SportId;
  sport: SportConfig;
  franchise: FranchiseKit;
  setSportId: (id: SportId) => void;
};

const SportContext = createContext<SportContextValue | null>(null);

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [sportId, setSportIdState] = useState<SportId>(DEFAULT_SPORT_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw && isSportId(raw)) setSportIdState(raw);
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

  const value = useMemo<SportContextValue>(() => {
    const sport = sportById(sportId);
    return {
      sportId,
      sport,
      franchise: franchiseFor(sportId),
      setSportId,
    };
  }, [sportId, setSportId]);

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
