import { parseFdcFoodToHit } from './usdaIngredientSearch';

describe('parseFdcFoodToHit', () => {
  it('parses SR Legacy style food as per 100 g', () => {
    const hit = parseFdcFoodToHit({
      fdcId: 168872,
      description: 'Oat bran, raw',
      dataType: 'SR Legacy',
      foodNutrients: [
        {
          type: 'FoodNutrient',
          nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' },
          amount: 246,
        },
        {
          type: 'FoodNutrient',
          nutrient: { id: 1003, name: 'Protein', unitName: 'g' },
          amount: 17.3,
        },
        {
          type: 'FoodNutrient',
          nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' },
          amount: 66.22,
        },
        {
          type: 'FoodNutrient',
          nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' },
          amount: 7.03,
        },
        {
          type: 'FoodNutrient',
          nutrient: { id: 1079, name: 'Fiber, total dietary', unitName: 'g' },
          amount: 15.4,
        },
      ],
    });
    expect(hit).not.toBeNull();
    expect(hit!.label).toBe('Oat bran, raw');
    expect(hit!.per100g.calories).toBe(246);
    expect(hit!.per100g.protein_g).toBe(17.3);
    expect(hit!.per100g.carb_g).toBe(66.2);
    expect(hit!.per100g.fat_g).toBe(7);
    expect(hit!.per100g.fiber_g).toBe(15.4);
  });

  it('scales branded nutrients from per-serving to per 100 g', () => {
    const hit = parseFdcFoodToHit({
      fdcId: 2187885,
      description: 'CHICKEN BREAST',
      dataType: 'Branded',
      brandOwner: 'Test Brand',
      servingSize: 284,
      servingSizeUnit: 'g',
      foodNutrients: [
        {
          nutrient: { id: 1008, unitName: 'kcal' },
          amount: 165,
        },
        {
          nutrient: { id: 1003, unitName: 'g' },
          amount: 31,
        },
        {
          nutrient: { id: 1005, unitName: 'g' },
          amount: 1.06,
        },
        {
          nutrient: { id: 1004, unitName: 'g' },
          amount: 8.1,
        },
        {
          nutrient: { id: 1079, unitName: 'g' },
          amount: 0,
        },
      ],
    });
    expect(hit).not.toBeNull();
    const f = 100 / 284;
    expect(hit!.per100g.calories).toBeCloseTo(165 * f, 1);
    expect(hit!.per100g.protein_g).toBeCloseTo(31 * f, 1);
  });

  it('uses kJ for energy when kcal missing', () => {
    const hit = parseFdcFoodToHit({
      fdcId: 1,
      description: 'Test',
      dataType: 'SR Legacy',
      foodNutrients: [
        { nutrient: { id: 1062, unitName: 'kJ' }, amount: 418.4 },
        { nutrient: { id: 1003 }, amount: 10 },
        { nutrient: { id: 1005 }, amount: 20 },
        { nutrient: { id: 1004 }, amount: 5 },
        { nutrient: { id: 1079 }, amount: 2 },
      ],
    });
    expect(hit!.per100g.calories).toBeCloseTo(100, 0);
  });

  it('returns null for invalid payload', () => {
    expect(parseFdcFoodToHit(null)).toBeNull();
    expect(parseFdcFoodToHit({})).toBeNull();
    expect(parseFdcFoodToHit({ fdcId: 1, description: '' })).toBeNull();
  });
});
