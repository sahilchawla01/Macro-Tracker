import type { Per100gNutrients } from '@/src/nutrition/calculations';

/**
 * USDA FoodData Central nutrient ids (see FDC documentation).
 * 1008 Energy (kcal), 1062 Energy (kJ), 1003 Protein, 1005 Carbohydrate by difference,
 * 1004 Total lipid (fat), 1079 Fiber total dietary.
 */
const N_ENERGY_KCAL = 1008;
const N_ENERGY_KJ = 1062;
const N_PROTEIN = 1003;
const N_CARB = 1005;
const N_FAT = 1004;
const N_FIBER = 1079;

export type UsdaIngredientHit = {
  fdcId: number;
  label: string;
  subtitle?: string;
  per100g: Per100gNutrients;
};

const FDC_BASE = 'https://api.nal.usda.gov/fdc/v1';

function collectNutrientMap(rows: unknown): Map<number, number> {
  const m = new Map<number, number>();
  if (!Array.isArray(rows)) return m;
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const amount =
      typeof r.amount === 'number'
        ? r.amount
        : typeof r.value === 'number'
          ? r.value
          : null;
    if (amount === null || Number.isNaN(amount)) continue;

    let id: number | undefined;
    if (r.nutrient && typeof r.nutrient === 'object') {
      const n = r.nutrient as Record<string, unknown>;
      if (typeof n.id === 'number') id = n.id;
    }
    if (id === undefined && typeof r.nutrientId === 'number') id = r.nutrientId;
    if (id !== undefined) m.set(id, amount);
  }
  return m;
}

/** Branded items often report nutrients per package serving (grams); SR Legacy/Foundation are per 100 g. */
function perServingToPer100gFactor(food: Record<string, unknown>): number {
  const dt = food.dataType;
  const size = food.servingSize;
  const unit = food.servingSizeUnit;
  if (dt === 'Branded' && typeof size === 'number' && size > 0) {
    if (unit === 'g' || unit === 'ml') {
      return 100 / size;
    }
  }
  return 1;
}

function mapToPer100g(
  nutrientMap: Map<number, number>,
  factor: number
): Per100gNutrients {
  const scaled = (id: number) => (nutrientMap.get(id) ?? 0) * factor;

  let calories = scaled(N_ENERGY_KCAL);
  if (calories <= 0 && nutrientMap.has(N_ENERGY_KJ)) {
    calories = (nutrientMap.get(N_ENERGY_KJ) ?? 0) * factor * (1 / 4.184);
  }

  return {
    calories: Math.round(calories * 10) / 10,
    protein_g: Math.round(scaled(N_PROTEIN) * 10) / 10,
    carb_g: Math.round(scaled(N_CARB) * 10) / 10,
    fat_g: Math.round(scaled(N_FAT) * 10) / 10,
    fiber_g: Math.round(scaled(N_FIBER) * 10) / 10,
  };
}

/** Parse a single FDC `GET /food/{fdcId}` JSON body into a hit, or null if invalid. */
export function parseFdcFoodToHit(food: unknown): UsdaIngredientHit | null {
  if (!food || typeof food !== 'object') return null;
  const f = food as Record<string, unknown>;
  const fdcId = typeof f.fdcId === 'number' ? f.fdcId : Number(f.fdcId);
  if (!Number.isFinite(fdcId)) return null;

  const description =
    typeof f.description === 'string' ? f.description.trim() : '';
  if (!description) return null;

  const brand =
    typeof f.brandOwner === 'string' && f.brandOwner.trim()
      ? f.brandOwner.trim()
      : typeof f.brandName === 'string' && f.brandName.trim()
        ? f.brandName.trim()
        : undefined;

  const dataType = typeof f.dataType === 'string' ? f.dataType : '';
  const subtitle = [brand, dataType].filter(Boolean).join(' · ') || undefined;

  const factor = perServingToPer100gFactor(f);
  const nutrientMap = collectNutrientMap(f.foodNutrients);
  const per100g = mapToPer100g(nutrientMap, factor);

  return {
    fdcId,
    label: description,
    subtitle,
    per100g,
  };
}

export class UsdaSearchError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'UsdaSearchError';
  }
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new UsdaSearchError('Invalid JSON from USDA API', res.status);
  }
  if (!res.ok) {
    const msg =
      typeof body === 'object' &&
      body &&
      'message' in body &&
      typeof (body as { message: string }).message === 'string'
        ? (body as { message: string }).message
        : `HTTP ${res.status}`;
    throw new UsdaSearchError(msg, res.status);
  }
  return body;
}

/** Up to 3 curated hits for the query (search + parallel food detail). */
export async function searchUsdaIngredients(
  apiKey: string,
  query: string
): Promise<UsdaIngredientHit[]> {
  const q = query.trim();
  if (!q) return [];

  const key = apiKey.trim();
  if (!key) {
    throw new UsdaSearchError('Missing USDA API key (set EXPO_PUBLIC_USDA_API_KEY).');
  }

  const searchUrl = `${FDC_BASE}/foods/search?api_key=${encodeURIComponent(key)}`;
  const searchBody = await fetchJson(searchUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query: q,
      pageSize: 3,
      pageNumber: 1,
    }),
  });

  if (!searchBody || typeof searchBody !== 'object') return [];
  const foods = (searchBody as { foods?: unknown }).foods;
  if (!Array.isArray(foods)) return [];

  const ids: number[] = [];
  for (const item of foods) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as { fdcId?: number }).fdcId;
    if (typeof id === 'number' && Number.isFinite(id)) ids.push(id);
    if (ids.length >= 3) break;
  }

  const details = await Promise.all(
    ids.map((fdcId) =>
      fetchJson(
        `${FDC_BASE}/food/${fdcId}?api_key=${encodeURIComponent(key)}`
      )
    )
  );

  const hits: UsdaIngredientHit[] = [];
  for (const detail of details) {
    const hit = parseFdcFoodToHit(detail);
    if (hit) hits.push(hit);
  }
  return hits;
}
