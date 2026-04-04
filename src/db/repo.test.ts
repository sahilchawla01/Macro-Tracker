import type { SQLiteDatabase } from 'expo-sqlite';
import {
  clearFoodLibrary,
  getMeta,
  isOnboardingComplete,
  profileBmi,
  scaleFromPer100g,
  setMeta,
  setOnboardingComplete,
  sumIngredientTotals,
  type ProfileRow,
} from './repo';

function mockDb(meta: Record<string, string>) {
  const runSync = jest.fn();
  return {
    getFirstSync: <T,>(_sql: string, params?: unknown[]): T | null => {
      const key = params?.[0];
      if (typeof key !== 'string') return null;
      const value = meta[key];
      if (value === undefined) return null;
      return { value } as T;
    },
    runSync,
  } as unknown as SQLiteDatabase & { runSync: jest.Mock };
}

describe('sumIngredientTotals', () => {
  it('returns zeros for empty list', () => {
    expect(sumIngredientTotals([])).toEqual({
      calories: 0,
      protein_g: 0,
      carb_g: 0,
      fat_g: 0,
      fiber_g: 0,
      grams: 0,
    });
  });

  it('sums macros; missing fiber coerces to 0 at runtime', () => {
    const withFiber = {
      grams: 100,
      calories: 200,
      protein_g: 10,
      carb_g: 20,
      fat_g: 5,
      fiber_g: 3,
    };
    const legacy = {
      grams: 50,
      calories: 75,
      protein_g: 5,
      carb_g: 8,
      fat_g: 2,
    };
    const t = sumIngredientTotals([
      withFiber,
      // Older rows / loose JSON may omit fiber_g; runtime uses ?? 0
      legacy as typeof withFiber,
    ]);
    expect(t.calories).toBe(275);
    expect(t.protein_g).toBe(15);
    expect(t.carb_g).toBe(28);
    expect(t.fat_g).toBe(7);
    expect(t.fiber_g).toBe(3);
    expect(t.grams).toBe(150);
  });

  it('rounds totals to one decimal', () => {
    const t = sumIngredientTotals([
      {
        grams: 33.33,
        calories: 11.11,
        protein_g: 1.11,
        carb_g: 2.22,
        fat_g: 0.33,
        fiber_g: 0.44,
      },
      {
        grams: 33.33,
        calories: 11.11,
        protein_g: 1.11,
        carb_g: 2.22,
        fat_g: 0.33,
        fiber_g: 0.44,
      },
    ]);
    expect(t.calories).toBe(22.2);
    expect(t.grams).toBe(66.7);
  });
});

describe('scaleFromPer100g', () => {
  it('scales linearly from per-100g values', () => {
    expect(scaleFromPer100g(400, 30, 40, 10, 100)).toEqual({
      calories: 400,
      protein_g: 30,
      carb_g: 40,
      fat_g: 10,
    });
  });

  it('halves macros for half portion', () => {
    expect(scaleFromPer100g(200, 10, 20, 9, 50)).toEqual({
      calories: 100,
      protein_g: 5,
      carb_g: 10,
      fat_g: 4.5,
    });
  });
});

describe('profileBmi', () => {
  it('delegates to height and weight', () => {
    const p: ProfileRow = {
      name: '',
      sex: 'male',
      age: 30,
      height_cm: 175,
      weight_kg: 70,
      unit_pref: 'metric',
      creatine: false,
    };
    expect(profileBmi(p)).toBeCloseTo(22.9, 1);
  });
});

describe('clearFoodLibrary', () => {
  it('deletes all rows from food_library', () => {
    const db = mockDb({});
    clearFoodLibrary(db);
    expect(db.runSync).toHaveBeenCalledWith('DELETE FROM food_library');
  });
});

describe('app_meta helpers', () => {
  it('getMeta returns stored value', () => {
    const db = mockDb({ foo: 'bar' });
    expect(getMeta(db, 'foo')).toBe('bar');
    expect(getMeta(db, 'missing')).toBeNull();
  });

  it('setMeta issues upsert', () => {
    const db = mockDb({});
    setMeta(db, 'k', 'v');
    expect(db.runSync).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      ['k', 'v']
    );
  });

  it('isOnboardingComplete reads onboarding_complete flag', () => {
    expect(isOnboardingComplete(mockDb({ onboarding_complete: '1' }))).toBe(
      true
    );
    expect(isOnboardingComplete(mockDb({ onboarding_complete: '0' }))).toBe(
      false
    );
    expect(isOnboardingComplete(mockDb({}))).toBe(false);
  });

  it('setOnboardingComplete writes 1 or 0', () => {
    const db = mockDb({});
    setOnboardingComplete(db, true);
    expect(db.runSync).toHaveBeenLastCalledWith(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      ['onboarding_complete', '1']
    );
    setOnboardingComplete(db, false);
    expect(db.runSync).toHaveBeenLastCalledWith(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      ['onboarding_complete', '0']
    );
  });
});
