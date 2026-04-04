import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'macro_tracker.db';

export function openDb(): SQLite.SQLiteDatabase {
  return SQLite.openDatabaseSync(DB_NAME);
}

export function initDatabase(db: SQLite.SQLiteDatabase): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT '',
      sex TEXT NOT NULL DEFAULT 'male',
      age INTEGER NOT NULL DEFAULT 30,
      height_cm REAL NOT NULL DEFAULT 170,
      weight_kg REAL NOT NULL DEFAULT 70,
      unit_pref TEXT NOT NULL DEFAULT 'metric',
      creatine INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      goal_type TEXT NOT NULL DEFAULT 'lose',
      weekly_lbs REAL NOT NULL DEFAULT 1,
      activity_level TEXT NOT NULL DEFAULT 'moderate',
      calorie_target INTEGER NOT NULL DEFAULT 2000,
      protein_g REAL NOT NULL DEFAULT 150,
      carb_g REAL NOT NULL DEFAULT 200,
      fat_g REAL NOT NULL DEFAULT 60,
      fiber_g REAL NOT NULL DEFAULT 28,
      water_goal_ml INTEGER NOT NULL DEFAULT 2500
    );
    CREATE TABLE IF NOT EXISTS food_library (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      cal_per_100g REAL NOT NULL,
      protein_per_100g REAL NOT NULL,
      carb_per_100g REAL NOT NULL,
      fat_per_100g REAL NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS food_log_entries (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      library_id TEXT,
      name TEXT NOT NULL,
      grams REAL NOT NULL,
      calories REAL NOT NULL,
      protein_g REAL NOT NULL,
      carb_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      fiber_g REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS daily_water (
      date TEXT PRIMARY KEY NOT NULL,
      water_ml INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS weight_logs (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      weight_kg REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_food_log_date ON food_log_entries(date);
    CREATE INDEX IF NOT EXISTS idx_food_library_name ON food_library(name);
    CREATE INDEX IF NOT EXISTS idx_weight_date ON weight_logs(date);
    CREATE TABLE IF NOT EXISTS saved_meals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      recipe_servings REAL NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meal_ingredients (
      id TEXT PRIMARY KEY NOT NULL,
      meal_id TEXT NOT NULL,
      name TEXT NOT NULL,
      grams REAL NOT NULL,
      calories REAL NOT NULL,
      protein_g REAL NOT NULL,
      carb_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      fiber_g REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal ON meal_ingredients(meal_id);
    CREATE INDEX IF NOT EXISTS idx_saved_meals_name ON saved_meals(name);
  `);

  let logCols = db.getAllSync<{ name: string }>(
    'PRAGMA table_info(food_log_entries)'
  );
  if (!logCols.some((c) => c.name === 'meal_id')) {
    db.execSync('ALTER TABLE food_log_entries ADD COLUMN meal_id TEXT');
  }
  logCols = db.getAllSync<{ name: string }>(
    'PRAGMA table_info(food_log_entries)'
  );
  if (!logCols.some((c) => c.name === 'fiber_g')) {
    db.execSync(
      'ALTER TABLE food_log_entries ADD COLUMN fiber_g REAL NOT NULL DEFAULT 0'
    );
  }

  const goalCols = db.getAllSync<{ name: string }>('PRAGMA table_info(goals)');
  if (!goalCols.some((c) => c.name === 'fiber_g')) {
    db.execSync('ALTER TABLE goals ADD COLUMN fiber_g REAL NOT NULL DEFAULT 28');
    db.runSync(
      `UPDATE goals SET fiber_g = MAX(20, MIN(45, ROUND(14.0 * calorie_target / 1000.0))) WHERE id = 1`
    );
  }

  const mealIngCols = db.getAllSync<{ name: string }>(
    'PRAGMA table_info(meal_ingredients)'
  );
  if (!mealIngCols.some((c) => c.name === 'fiber_g')) {
    db.execSync(
      'ALTER TABLE meal_ingredients ADD COLUMN fiber_g REAL NOT NULL DEFAULT 0'
    );
  }

  const profileCount = db.getFirstSync<{ c: number }>(
    'SELECT COUNT(*) as c FROM profile'
  );
  if (profileCount && profileCount.c === 0) {
    db.runSync(
      `INSERT INTO profile (id, name, sex, age, height_cm, weight_kg, unit_pref, creatine)
       VALUES (1, '', 'male', 30, 170, 70, 'metric', 0)`
    );
  }
  const goalsCount = db.getFirstSync<{ c: number }>(
    'SELECT COUNT(*) as c FROM goals'
  );
  if (goalsCount && goalsCount.c === 0) {
    db.runSync(
      `INSERT INTO goals (id, goal_type, weekly_lbs, activity_level, calorie_target, protein_g, carb_g, fat_g, fiber_g, water_goal_ml)
       VALUES (1, 'lose', 1, 'moderate', 2000, 150, 200, 60, 28, 2500)`
    );
  }
}
