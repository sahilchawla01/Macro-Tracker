import type { FoodLibraryRow } from '@/src/db/repo';

/**
 * v1: local SQLite only. Replace implementation later with OpenAI + structured JSON.
 */
export async function searchIngredientsRemote(
  _query: string
): Promise<FoodLibraryRow[]> {
  return [];
}
