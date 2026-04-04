import type * as SQLite from 'expo-sqlite';
import type { ActivityLevel, GoalType, Sex } from '@/src/nutrition/calculations';
import {
  bmi,
  bmrMifflinStJeor,
  calorieTargetFromGoal,
  macroTargetsGrams,
  tdeeFromBmr,
  waterGoalMl,
} from '@/src/nutrition/calculations';

export type ProfileRow = {
  name: string;
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  unit_pref: 'metric' | 'imperial';
  creatine: boolean;
};

export type GoalsRow = {
  goal_type: GoalType;
  weekly_lbs: number;
  activity_level: ActivityLevel;
  calorie_target: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
  water_goal_ml: number;
};

export type FoodLibraryRow = {
  id: string;
  name: string;
  cal_per_100g: number;
  protein_per_100g: number;
  carb_per_100g: number;
  fat_per_100g: number;
  created_at: string;
};

export type FoodLogEntryRow = {
  id: string;
  date: string;
  library_id: string | null;
  meal_id: string | null;
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
};

export type SavedMealRow = {
  id: string;
  name: string;
  recipe_servings: number;
  created_at: string;
};

export type MealIngredientRow = {
  id: string;
  meal_id: string;
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
};

export type SavedMealWithIngredients = SavedMealRow & {
  ingredients: MealIngredientRow[];
};

export type WeightLogRow = {
  id: string;
  date: string;
  weight_kg: number;
};

export function getMeta(db: SQLite.SQLiteDatabase, key: string): string | null {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export function setMeta(db: SQLite.SQLiteDatabase, key: string, value: string): void {
  db.runSync(
    'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export function isOnboardingComplete(db: SQLite.SQLiteDatabase): boolean {
  return getMeta(db, 'onboarding_complete') === '1';
}

export function setOnboardingComplete(db: SQLite.SQLiteDatabase, done: boolean): void {
  setMeta(db, 'onboarding_complete', done ? '1' : '0');
}

export function getProfile(db: SQLite.SQLiteDatabase): ProfileRow {
  const row = db.getFirstSync<{
    name: string;
    sex: string;
    age: number;
    height_cm: number;
    weight_kg: number;
    unit_pref: string;
    creatine: number;
  }>('SELECT * FROM profile WHERE id = 1');
  if (!row) {
    return {
      name: '',
      sex: 'male',
      age: 30,
      height_cm: 170,
      weight_kg: 70,
      unit_pref: 'metric',
      creatine: false,
    };
  }
  return {
    name: row.name,
    sex: row.sex === 'female' ? 'female' : 'male',
    age: row.age,
    height_cm: row.height_cm,
    weight_kg: row.weight_kg,
    unit_pref: row.unit_pref === 'imperial' ? 'imperial' : 'metric',
    creatine: row.creatine === 1,
  };
}

export function saveProfile(db: SQLite.SQLiteDatabase, p: ProfileRow): void {
  db.runSync(
    `UPDATE profile SET name = ?, sex = ?, age = ?, height_cm = ?, weight_kg = ?, unit_pref = ?, creatine = ? WHERE id = 1`,
    [
      p.name,
      p.sex,
      p.age,
      p.height_cm,
      p.weight_kg,
      p.unit_pref,
      p.creatine ? 1 : 0,
    ]
  );
}

export function getGoals(db: SQLite.SQLiteDatabase): GoalsRow {
  const row = db.getFirstSync<{
    goal_type: string;
    weekly_lbs: number;
    activity_level: string;
    calorie_target: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
    fiber_g: number | null;
    water_goal_ml: number;
  }>('SELECT * FROM goals WHERE id = 1');
  if (!row) {
    return {
      goal_type: 'lose',
      weekly_lbs: 1,
      activity_level: 'moderate',
      calorie_target: 2000,
      protein_g: 150,
      carb_g: 200,
      fat_g: 60,
      fiber_g: 28,
      water_goal_ml: 2500,
    };
  }
  return {
    goal_type: row.goal_type as GoalType,
    weekly_lbs: row.weekly_lbs,
    activity_level: row.activity_level as ActivityLevel,
    calorie_target: row.calorie_target,
    protein_g: row.protein_g,
    carb_g: row.carb_g,
    fat_g: row.fat_g,
    fiber_g: row.fiber_g ?? 28,
    water_goal_ml: row.water_goal_ml,
  };
}

export function saveGoals(db: SQLite.SQLiteDatabase, g: GoalsRow): void {
  db.runSync(
    `UPDATE goals SET goal_type = ?, weekly_lbs = ?, activity_level = ?, calorie_target = ?, protein_g = ?, carb_g = ?, fat_g = ?, fiber_g = ?, water_goal_ml = ? WHERE id = 1`,
    [
      g.goal_type,
      g.weekly_lbs,
      g.activity_level,
      g.calorie_target,
      g.protein_g,
      g.carb_g,
      g.fat_g,
      g.fiber_g,
      g.water_goal_ml,
    ]
  );
}

/** Recompute goals table from profile + goal selections (call after FTU or profile edit). */
export function recomputeGoalsFromProfile(
  db: SQLite.SQLiteDatabase,
  profile: ProfileRow,
  goalType: GoalType,
  weeklyLbs: number,
  activity: ActivityLevel
): { clampedToFloor: boolean } {
  const bmr = bmrMifflinStJeor(
    profile.weight_kg,
    profile.height_cm,
    profile.age,
    profile.sex
  );
  const maintenance = tdeeFromBmr(bmr, activity);
  const { target: calorie_target, clampedToFloor } = calorieTargetFromGoal(
    maintenance,
    goalType,
    weeklyLbs,
    profile.sex
  );
  const macros = macroTargetsGrams(
    profile.weight_kg,
    calorie_target,
    goalType
  );
  const water_goal_ml = waterGoalMl(profile.weight_kg, profile.creatine);
  saveGoals(db, {
    goal_type: goalType,
    weekly_lbs: weeklyLbs,
    activity_level: activity,
    calorie_target,
    protein_g: macros.proteinG,
    carb_g: macros.carbG,
    fat_g: macros.fatG,
    fiber_g: macros.fiberG,
    water_goal_ml,
  });
  return { clampedToFloor };
}

export function searchFoodLibrary(
  db: SQLite.SQLiteDatabase,
  q: string
): FoodLibraryRow[] {
  const term = `%${q.trim()}%`;
  return db.getAllSync<FoodLibraryRow>(
    `SELECT * FROM food_library WHERE name LIKE ? ORDER BY name COLLATE NOCASE LIMIT 50`,
    [term]
  );
}

export function insertFoodLibrary(
  db: SQLite.SQLiteDatabase,
  row: Omit<FoodLibraryRow, 'created_at'> & { created_at?: string }
): void {
  const created = row.created_at ?? new Date().toISOString();
  db.runSync(
    `INSERT OR REPLACE INTO food_library (id, name, cal_per_100g, protein_per_100g, carb_per_100g, fat_per_100g, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.name,
      row.cal_per_100g,
      row.protein_per_100g,
      row.carb_per_100g,
      row.fat_per_100g,
      created,
    ]
  );
}

export function insertFoodLibraryIfNotExists(
  db: SQLite.SQLiteDatabase,
  row: FoodLibraryRow
): void {
  const existing = db.getFirstSync<{ id: string }>(
    'SELECT id FROM food_library WHERE id = ?',
    [row.id]
  );
  if (existing) return;
  insertFoodLibrary(db, row);
}

export function scaleFromPer100g(
  cal: number,
  p: number,
  c: number,
  f: number,
  grams: number
): { calories: number; protein_g: number; carb_g: number; fat_g: number } {
  const factor = grams / 100;
  return {
    calories: Math.round(cal * factor * 10) / 10,
    protein_g: Math.round(p * factor * 10) / 10,
    carb_g: Math.round(c * factor * 10) / 10,
    fat_g: Math.round(f * factor * 10) / 10,
  };
}

export function addFoodLogEntry(
  db: SQLite.SQLiteDatabase,
  entry: Omit<FoodLogEntryRow, 'id'> & { id: string }
): void {
  db.runSync(
    `INSERT INTO food_log_entries (id, date, library_id, meal_id, name, grams, calories, protein_g, carb_g, fat_g, fiber_g)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.date,
      entry.library_id ?? null,
      entry.meal_id ?? null,
      entry.name,
      entry.grams,
      entry.calories,
      entry.protein_g,
      entry.carb_g,
      entry.fat_g,
      entry.fiber_g ?? 0,
    ]
  );
}

export function deleteFoodLogEntry(db: SQLite.SQLiteDatabase, id: string): void {
  db.runSync('DELETE FROM food_log_entries WHERE id = ?', [id]);
}

export function clearFoodLogForDate(db: SQLite.SQLiteDatabase, date: string): void {
  db.runSync('DELETE FROM food_log_entries WHERE date = ?', [date]);
}

export function getFoodLogForDate(
  db: SQLite.SQLiteDatabase,
  date: string
): FoodLogEntryRow[] {
  const rows = db.getAllSync<{
    id: string;
    date: string;
    library_id: string | null;
    meal_id: string | null;
    name: string;
    grams: number;
    calories: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
    fiber_g: number | null;
  }>('SELECT * FROM food_log_entries WHERE date = ? ORDER BY rowid DESC', [date]);
  return rows.map((r) => ({
    ...r,
    meal_id: r.meal_id ?? null,
    library_id: r.library_id ?? null,
    fiber_g: r.fiber_g ?? 0,
  }));
}

export function sumFoodLogForDate(
  db: SQLite.SQLiteDatabase,
  date: string
): {
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
} {
  const row = db.getFirstSync<{
    calories: number | null;
    protein_g: number | null;
    carb_g: number | null;
    fat_g: number | null;
    fiber_g: number | null;
  }>(
    `SELECT 
      SUM(calories) as calories,
      SUM(protein_g) as protein_g,
      SUM(carb_g) as carb_g,
      SUM(fat_g) as fat_g,
      SUM(fiber_g) as fiber_g
     FROM food_log_entries WHERE date = ?`,
    [date]
  );
  return {
    calories: row?.calories ?? 0,
    protein_g: row?.protein_g ?? 0,
    carb_g: row?.carb_g ?? 0,
    fat_g: row?.fat_g ?? 0,
    fiber_g: row?.fiber_g ?? 0,
  };
}

export function getWaterForDate(db: SQLite.SQLiteDatabase, date: string): number {
  const row = db.getFirstSync<{ water_ml: number }>(
    'SELECT water_ml FROM daily_water WHERE date = ?',
    [date]
  );
  return row?.water_ml ?? 0;
}

export function ensureWaterRow(db: SQLite.SQLiteDatabase, date: string): void {
  db.runSync(
    'INSERT OR IGNORE INTO daily_water (date, water_ml) VALUES (?, 0)',
    [date]
  );
}

export function addWater(db: SQLite.SQLiteDatabase, date: string, deltaMl: number): void {
  ensureWaterRow(db, date);
  db.runSync(
    'UPDATE daily_water SET water_ml = water_ml + ? WHERE date = ?',
    [deltaMl, date]
  );
}

export function setWater(
  db: SQLite.SQLiteDatabase,
  date: string,
  waterMl: number
): void {
  ensureWaterRow(db, date);
  db.runSync('UPDATE daily_water SET water_ml = ? WHERE date = ?', [
    Math.max(0, waterMl),
    date,
  ]);
}

export function getWeightLogs(db: SQLite.SQLiteDatabase): WeightLogRow[] {
  return db.getAllSync<WeightLogRow>(
    'SELECT * FROM weight_logs ORDER BY date ASC, rowid ASC'
  );
}

export function insertWeightLog(
  db: SQLite.SQLiteDatabase,
  row: WeightLogRow
): void {
  db.runSync(
    'INSERT OR REPLACE INTO weight_logs (id, date, weight_kg) VALUES (?, ?, ?)',
    [row.id, row.date, row.weight_kg]
  );
}

export function deleteWeightLog(db: SQLite.SQLiteDatabase, id: string): void {
  db.runSync('DELETE FROM weight_logs WHERE id = ?', [id]);
}

export function getAllFoodLibrary(db: SQLite.SQLiteDatabase): FoodLibraryRow[] {
  return db.getAllSync<FoodLibraryRow>(
    'SELECT * FROM food_library ORDER BY name COLLATE NOCASE'
  );
}

/** Removes every row from the custom food library (saved meals and logs are unchanged). */
export function clearFoodLibrary(db: SQLite.SQLiteDatabase): void {
  db.runSync('DELETE FROM food_library');
}

export function searchSavedMeals(
  db: SQLite.SQLiteDatabase,
  q: string
): SavedMealRow[] {
  const term = `%${q.trim()}%`;
  return db.getAllSync<SavedMealRow>(
    `SELECT * FROM saved_meals WHERE name LIKE ? ORDER BY name COLLATE NOCASE LIMIT 50`,
    [term]
  );
}

export function getMealIngredients(
  db: SQLite.SQLiteDatabase,
  mealId: string
): MealIngredientRow[] {
  const rows = db.getAllSync<
    Omit<MealIngredientRow, 'fiber_g'> & { fiber_g: number | null }
  >(
    'SELECT * FROM meal_ingredients WHERE meal_id = ? ORDER BY rowid ASC',
    [mealId]
  );
  return rows.map((r) => ({ ...r, fiber_g: r.fiber_g ?? 0 }));
}

export function sumIngredientTotals(
  ingredients: Pick<
    MealIngredientRow,
    'calories' | 'protein_g' | 'carb_g' | 'fat_g' | 'fiber_g' | 'grams'
  >[]
): {
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
  grams: number;
} {
  let calories = 0;
  let protein_g = 0;
  let carb_g = 0;
  let fat_g = 0;
  let fiber_g = 0;
  let grams = 0;
  for (const i of ingredients) {
    calories += i.calories;
    protein_g += i.protein_g;
    carb_g += i.carb_g;
    fat_g += i.fat_g;
    fiber_g += i.fiber_g ?? 0;
    grams += i.grams;
  }
  return {
    calories: Math.round(calories * 10) / 10,
    protein_g: Math.round(protein_g * 10) / 10,
    carb_g: Math.round(carb_g * 10) / 10,
    fat_g: Math.round(fat_g * 10) / 10,
    fiber_g: Math.round(fiber_g * 10) / 10,
    grams: Math.round(grams * 10) / 10,
  };
}

export function insertSavedMealWithIngredients(
  db: SQLite.SQLiteDatabase,
  meal: { id: string; name: string; recipe_servings: number },
  ingredients: Array<{
    id: string;
    name: string;
    grams: number;
    calories: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
    fiber_g: number;
  }>
): void {
  const created = new Date().toISOString();
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO saved_meals (id, name, recipe_servings, created_at) VALUES (?, ?, ?, ?)`,
      [meal.id, meal.name.trim(), Math.max(0.25, meal.recipe_servings), created]
    );
    for (const ing of ingredients) {
      db.runSync(
        `INSERT INTO meal_ingredients (id, meal_id, name, grams, calories, protein_g, carb_g, fat_g, fiber_g)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ing.id,
          meal.id,
          ing.name.trim(),
          ing.grams,
          ing.calories,
          ing.protein_g,
          ing.carb_g,
          ing.fat_g,
          ing.fiber_g ?? 0,
        ]
      );
    }
  });
}

export function logSavedMealServings(
  db: SQLite.SQLiteDatabase,
  date: string,
  logEntryId: string,
  mealId: string,
  servingsConsumed: number
): void {
  const meal = db.getFirstSync<SavedMealRow>(
    'SELECT * FROM saved_meals WHERE id = ?',
    [mealId]
  );
  if (!meal) return;
  const ings = getMealIngredients(db, mealId);
  const totals = sumIngredientTotals(ings);
  const rs = meal.recipe_servings > 0 ? meal.recipe_servings : 1;
  const per = 1 / rs;
  const s = Math.max(0.25, servingsConsumed);
  const scale = per * s;
  addFoodLogEntry(db, {
    id: logEntryId,
    date,
    library_id: null,
    meal_id: mealId,
    name: `${meal.name} (${s} serving${s === 1 ? '' : 's'})`,
    grams: Math.round(totals.grams * scale * 10) / 10,
    calories: Math.round(totals.calories * scale * 10) / 10,
    protein_g: Math.round(totals.protein_g * scale * 10) / 10,
    carb_g: Math.round(totals.carb_g * scale * 10) / 10,
    fat_g: Math.round(totals.fat_g * scale * 10) / 10,
    fiber_g: Math.round(totals.fiber_g * scale * 10) / 10,
  });
}

export function getAllSavedMealsWithIngredients(
  db: SQLite.SQLiteDatabase
): SavedMealWithIngredients[] {
  const meals = db.getAllSync<SavedMealRow>(
    'SELECT * FROM saved_meals ORDER BY name COLLATE NOCASE'
  );
  return meals.map((m) => ({
    ...m,
    ingredients: getMealIngredients(db, m.id),
  }));
}

export type ExportPayloadV2 = {
  version: 2;
  exportedAt: string;
  items: FoodLibraryRow[];
  meals: SavedMealWithIngredients[];
};

export function exportCustomFoodsJson(
  db: SQLite.SQLiteDatabase
): ExportPayloadV2 {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    items: getAllFoodLibrary(db),
    meals: getAllSavedMealsWithIngredients(db),
  };
}

export function importFoodLibraryMerge(
  db: SQLite.SQLiteDatabase,
  items: FoodLibraryRow[]
): number {
  let added = 0;
  for (const item of items) {
    const exists = db.getFirstSync<{ id: string }>(
      'SELECT id FROM food_library WHERE id = ?',
      [item.id]
    );
    if (!exists) {
      insertFoodLibrary(db, item);
      added += 1;
    }
  }
  return added;
}

export function importSavedMealsMerge(
  db: SQLite.SQLiteDatabase,
  meals: SavedMealWithIngredients[]
): number {
  let added = 0;
  for (const m of meals) {
    const exists = db.getFirstSync<{ id: string }>(
      'SELECT id FROM saved_meals WHERE id = ?',
      [m.id]
    );
    if (exists) continue;
    insertSavedMealWithIngredients(
      db,
      {
        id: m.id,
        name: m.name,
        recipe_servings: m.recipe_servings,
      },
      m.ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        grams: ing.grams,
        calories: ing.calories,
        protein_g: ing.protein_g,
        carb_g: ing.carb_g,
        fat_g: ing.fat_g,
        fiber_g: ing.fiber_g ?? 0,
      }))
    );
    added += 1;
  }
  return added;
}

export function profileBmi(profile: ProfileRow): number {
  return bmi(profile.weight_kg, profile.height_cm);
}

export function resetOnboardingState(db: SQLite.SQLiteDatabase): void {
  setOnboardingComplete(db, false);
}
