import * as SQLite from 'expo-sqlite';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { getSQLite } from '@/src/db/client';

type Ctx = {
  db: SQLite.SQLiteDatabase;
  ready: boolean;
  tick: number;
  refresh: () => void;
};

const DatabaseContext = createContext<Ctx | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const db = useMemo(() => getSQLite(), []);
  const [ready, setReady] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const value = useMemo(
    () => ({ db, ready, tick, refresh }),
    [db, ready, tick, refresh]
  );

  if (!ready) {
    return null;
  }

  return (
    <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>
  );
}

export function useDatabase(): Ctx {
  const ctx = useContext(DatabaseContext);
  if (!ctx) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return ctx;
}
