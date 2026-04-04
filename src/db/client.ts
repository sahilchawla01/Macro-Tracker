import type * as SQLite from 'expo-sqlite';

import { initDatabase, openDb } from '@/src/db/database';

let instance: SQLite.SQLiteDatabase | null = null;

export function getSQLite(): SQLite.SQLiteDatabase {
  if (!instance) {
    instance = openDb();
    initDatabase(instance);
  }
  return instance;
}
