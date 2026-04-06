/**
 * BMR: Mifflin–St Jeor equation (commonly used in clinical/nutrition calculators).
 * Reference: Medscape Mifflin-St Jeor calculator / sports nutrition literature.
 */
export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'very'
  | 'extra';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

export type GoalType = 'lose' | 'gain' | 'recomp';

export function bmrMifflinStJeor(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function tdeeFromBmr(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activity];
}

/** ~3500 kcal per lb adipose tissue per week (rule of thumb). */
const KCAL_PER_LB_PER_WEEK = 3500;

export function calorieTargetFromGoal(
  maintenanceTdee: number,
  goal: GoalType,
  weeklyLbsChange: number,
  sex: Sex
): { target: number; clampedToFloor: boolean } {
  let raw: number;
  if (goal === 'lose') {
    const dailyDeficit = (weeklyLbsChange * KCAL_PER_LB_PER_WEEK) / 7;
    raw = maintenanceTdee - dailyDeficit;
  } else if (goal === 'gain') {
    const dailySurplus = (weeklyLbsChange * KCAL_PER_LB_PER_WEEK) / 7;
    raw = maintenanceTdee + dailySurplus;
  } else {
    raw = maintenanceTdee * 0.95;
  }

  const floor = sex === 'male' ? 1500 : 1200;
  let clampedToFloor = false;
  if (goal === 'lose' && raw < floor) {
    raw = floor;
    clampedToFloor = true;
  }

  return { target: Math.round(raw), clampedToFloor };
}

/**
 * Fiber target from USDA Adequate Intake style rule: ~14 g per 1000 kcal, bounded for adults.
 */
export function fiberTargetG(calorieTarget: number): number {
  const fromCal = (14 / 1000) * calorieTarget;
  return Math.max(20, Math.min(45, Math.round(fromCal)));
}

/**
 * Protein/fat from g/kg bands; carbs fill remaining kcal (4/9 kcal per g).
 */
export function macroTargetsGrams(
  weightKg: number,
  calorieTarget: number,
  goal: GoalType
): { proteinG: number; fatG: number; carbG: number; fiberG: number } {
  const proteinPerKg =
    goal === 'lose' ? 2.0 : goal === 'gain' ? 1.8 : 2.0;
  const proteinG = round1(weightKg * proteinPerKg);
  const fatPerKg = 0.7;
  const fatG = round1(weightKg * fatPerKg);
  const fromProteinFat = proteinG * 4 + fatG * 9;
  const carbCal = Math.max(0, calorieTarget - fromProteinFat);
  const carbG = round1(carbCal / 4);
  return {
    proteinG,
    fatG,
    carbG,
    fiberG: fiberTargetG(calorieTarget),
  };
}

export function waterGoalMl(weightKg: number, creatine: boolean): number {
  const base = Math.round(weightKg * 35);
  return base + (creatine ? 750 : 0);
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export type Per100gNutrients = {
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
};

/** Scale USDA-style per-100 g values to a portion in grams (same rounding as food scaling in repo). */
export function scaleNutrientsFromPer100g(
  per100g: Per100gNutrients,
  grams: number
): Per100gNutrients {
  const factor = grams / 100;
  return {
    calories: round1(per100g.calories * factor),
    protein_g: round1(per100g.protein_g * factor),
    carb_g: round1(per100g.carb_g * factor),
    fat_g: round1(per100g.fat_g * factor),
    fiber_g: round1(per100g.fiber_g * factor),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export const LB_PER_KG = 2.2046226218;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function cmToInches(cm: number): number {
  return cm / 2.54;
}

export function inchesToCm(inches: number): number {
  return inches * 2.54;
}
