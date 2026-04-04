import {
  ACTIVITY_FACTORS,
  LB_PER_KG,
  bmi,
  bmrMifflinStJeor,
  calorieTargetFromGoal,
  cmToInches,
  fiberTargetG,
  inchesToCm,
  kgToLb,
  lbToKg,
  macroTargetsGrams,
  tdeeFromBmr,
  waterGoalMl,
} from './calculations';

describe('bmrMifflinStJeor', () => {
  it('matches known male example shape', () => {
    const bmr = bmrMifflinStJeor(80, 180, 30, 'male');
    expect(bmr).toBeGreaterThan(1600);
    expect(bmr).toBeLessThan(2000);
  });

  it('female BMR is lower than male for same stats', () => {
    const m = bmrMifflinStJeor(70, 170, 28, 'male');
    const f = bmrMifflinStJeor(70, 170, 28, 'female');
    expect(f).toBeLessThan(m);
  });
});

describe('tdeeFromBmr', () => {
  it('scales by activity', () => {
    const bmr = 1700;
    expect(tdeeFromBmr(bmr, 'sedentary')).toBeCloseTo(bmr * ACTIVITY_FACTORS.sedentary);
    expect(tdeeFromBmr(bmr, 'extra')).toBeCloseTo(bmr * ACTIVITY_FACTORS.extra);
  });
});

describe('calorieTargetFromGoal', () => {
  it('applies ~500 kcal/day deficit for 1 lb/week loss', () => {
    const tdee = 2500;
    const { target } = calorieTargetFromGoal(tdee, 'lose', 1, 'male');
    expect(target).toBeCloseTo(2500 - 500, -1);
  });

  it('applies surplus for gain', () => {
    const tdee = 2500;
    const { target } = calorieTargetFromGoal(tdee, 'gain', 0.5, 'male');
    expect(target).toBeGreaterThan(tdee);
  });

  it('recomp uses 95% of maintenance', () => {
    const tdee = 2000;
    const { target, clampedToFloor } = calorieTargetFromGoal(tdee, 'recomp', 0, 'male');
    expect(target).toBe(1900);
    expect(clampedToFloor).toBe(false);
  });

  it('clamps aggressive female loss to floor', () => {
    const { target, clampedToFloor } = calorieTargetFromGoal(1200, 'lose', 2, 'female');
    expect(target).toBe(1200);
    expect(clampedToFloor).toBe(true);
  });
});

describe('fiberTargetG', () => {
  it('scales with calories and rounds', () => {
    expect(fiberTargetG(2000)).toBe(28);
    expect(fiberTargetG(1500)).toBe(21);
  });

  it('clamps to minimum 20g for low calorie targets', () => {
    expect(fiberTargetG(1000)).toBe(20);
  });

  it('clamps to maximum 45g for high calorie targets', () => {
    expect(fiberTargetG(4000)).toBe(45);
  });
});

describe('macroTargetsGrams', () => {
  it('returns positive macros summing under calorie budget', () => {
    const m = macroTargetsGrams(80, 2200, 'lose');
    expect(m.proteinG).toBeGreaterThan(0);
    expect(m.fatG).toBeGreaterThan(0);
    expect(m.carbG).toBeGreaterThan(0);
    expect(m.fiberG).toBeGreaterThanOrEqual(20);
    const kcal = m.proteinG * 4 + m.carbG * 4 + m.fatG * 9;
    expect(kcal).toBeLessThanOrEqual(2200 + 1);
  });

  it('uses higher protein per kg for lose vs gain', () => {
    const lose = macroTargetsGrams(80, 2500, 'lose');
    const gain = macroTargetsGrams(80, 2500, 'gain');
    expect(lose.proteinG).toBe(160);
    expect(gain.proteinG).toBe(144);
  });

  it('fiber matches fiberTargetG for same calorie target', () => {
    const ct = 2300;
    const m = macroTargetsGrams(75, ct, 'recomp');
    expect(m.fiberG).toBe(fiberTargetG(ct));
  });
});

describe('waterGoalMl', () => {
  it('adds extra when creatine', () => {
    const w = 80;
    expect(waterGoalMl(w, true)).toBeGreaterThan(waterGoalMl(w, false));
  });

  it('base is weight times 35 ml/kg rounded', () => {
    expect(waterGoalMl(100, false)).toBe(3500);
    expect(waterGoalMl(100, true)).toBe(4250);
  });
});

describe('bmi', () => {
  it('computes standard formula', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.9, 0);
  });
});

describe('lbToKg', () => {
  it('converts', () => {
    expect(lbToKg(220)).toBeCloseTo(99.79, 1);
  });
});

describe('kgToLb', () => {
  it('is inverse of lbToKg for round trip', () => {
    const kg = 72.5;
    expect(lbToKg(kgToLb(kg))).toBeCloseTo(kg, 5);
  });

  it('matches LB_PER_KG constant', () => {
    expect(kgToLb(1)).toBeCloseTo(LB_PER_KG, 5);
  });
});

describe('cmToInches / inchesToCm', () => {
  it('converts 2.54 cm to one inch', () => {
    expect(cmToInches(2.54)).toBeCloseTo(1, 5);
  });

  it('round trips', () => {
    expect(inchesToCm(cmToInches(173))).toBeCloseTo(173, 5);
  });
});
