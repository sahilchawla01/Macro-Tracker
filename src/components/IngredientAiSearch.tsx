import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { NeonButton } from '@/src/components/NeonButton';
import { scaleNutrientsFromPer100g } from '@/src/nutrition/calculations';
import { getUsdaApiKey } from '@/src/services/usdaConfig';
import {
  searchUsdaIngredients,
  UsdaSearchError,
  type UsdaIngredientHit,
} from '@/src/services/usdaIngredientSearch';
import { retro } from '@/src/theme/retro';
import { retroFonts } from '@/src/theme/retro';

export type AiIngredientAppend = {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
};

type Props = {
  onAppend: (payload: AiIngredientAppend) => void;
};

export function IngredientAiSearch({ onAppend }: Props) {
  const apiKey = useMemo(() => getUsdaApiKey(), []);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<UsdaIngredientHit[]>([]);
  const [selected, setSelected] = useState<UsdaIngredientHit | null>(null);
  const [gramsStr, setGramsStr] = useState('100');

  const runSearch = useCallback(async () => {
    setError(null);
    setHits([]);
    setSelected(null);
    if (!apiKey) {
      setError(
        'Add EXPO_PUBLIC_USDA_API_KEY to a .env file in the project root (see README), then restart Expo.'
      );
      return;
    }
    const q = query.trim();
    if (!q) {
      setError('Enter a food to search.');
      return;
    }
    setLoading(true);
    try {
      const list = await searchUsdaIngredients(apiKey, q);
      setHits(list);
      if (list.length === 0) {
        setError('No USDA results for that search. Try another term.');
      }
    } catch (e) {
      const msg =
        e instanceof UsdaSearchError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Search failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [apiKey, query]);

  const gramsParsed = parseFloat(gramsStr.replace(',', '.'));
  const portion = useMemo(() => {
    if (!selected || !Number.isFinite(gramsParsed) || gramsParsed <= 0) {
      return null;
    }
    return scaleNutrientsFromPer100g(selected.per100g, gramsParsed);
  }, [selected, gramsParsed]);

  const addSelected = () => {
    if (!selected || !portion) return;
    onAppend({
      name: selected.label,
      grams: gramsParsed,
      calories: portion.calories,
      protein_g: portion.protein_g,
      carb_g: portion.carb_g,
      fat_g: portion.fat_g,
      fiber_g: portion.fiber_g,
    });
    setSelected(null);
    setGramsStr('100');
  };

  return (
    <View>
      <Text style={styles.hint}>
        Search USDA FoodData Central (up to 3 matches). Macros scale from per
        100 g.
      </Text>
      <Text style={styles.fieldLabel}>Search</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="e.g. chicken breast, oats"
        placeholderTextColor={retro.textMuted}
        onSubmitEditing={runSearch}
        returnKeyType="search"
      />
      <View style={styles.btnSpacer} />
      <NeonButton
        title={loading ? 'Searching…' : 'Search USDA'}
        variant="secondary"
        onPress={runSearch}
        disabled={loading}
      />
      {loading && (
        <ActivityIndicator
          color={retro.neonCyan}
          style={{ marginTop: 12 }}
        />
      )}
      {error ? <Text style={styles.err}>{error}</Text> : null}

      {hits.length > 0 && !selected ? (
        <View style={{ marginTop: 14 }}>
          <Text style={styles.subSection}>Results (max 3)</Text>
          {hits.map((h) => (
            <Pressable
              key={h.fdcId}
              style={styles.hitRow}
              onPress={() => {
                setSelected(h);
                setGramsStr('100');
              }}>
              <Text style={styles.hitTitle}>{h.label}</Text>
              {h.subtitle ? (
                <Text style={styles.hitSub}>{h.subtitle}</Text>
              ) : null}
              <Text style={styles.hitNut}>
                per 100g: {h.per100g.calories} kcal · P{h.per100g.protein_g} C
                {h.per100g.carb_g} F{h.per100g.fat_g} · Fiber{' '}
                {h.per100g.fiber_g}g
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {selected ? (
        <View style={styles.adjustBox}>
          <Text style={styles.subSection}>Selected</Text>
          <Text style={styles.hitTitle}>{selected.label}</Text>
          <Text style={styles.fieldLabel}>Amount (grams)</Text>
          <TextInput
            style={styles.input}
            value={gramsStr}
            onChangeText={setGramsStr}
            keyboardType="decimal-pad"
            placeholder="100"
            placeholderTextColor={retro.textMuted}
          />
          {portion ? (
            <Text style={styles.preview}>
              For {gramsParsed}g: {portion.calories} kcal · P{portion.protein_g}{' '}
              C{portion.carb_g} F{portion.fat_g} · Fiber {portion.fiber_g}g
            </Text>
          ) : (
            <Text style={styles.err}>Enter a positive gram amount.</Text>
          )}
          <View style={styles.btnSpacer} />
          <NeonButton
            title="Add ingredient"
            variant="secondary"
            onPress={addSelected}
            disabled={!portion}
          />
          <View style={styles.btnSpacer} />
          <NeonButton
            title="Pick another result"
            variant="ghost"
            onPress={() => setSelected(null)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 18,
  },
  fieldLabel: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    fontFamily: retroFonts.mono,
    borderWidth: 1,
    borderColor: retro.neonCyan,
    borderRadius: 8,
    padding: 10,
    color: retro.text,
    backgroundColor: retro.bgPanel,
  },
  btnSpacer: { height: 14 },
  err: {
    fontFamily: retroFonts.mono,
    color: retro.danger,
    fontSize: 12,
    marginTop: 10,
  },
  subSection: {
    fontFamily: retroFonts.display,
    color: retro.neonYellow,
    fontSize: 14,
    marginBottom: 8,
    letterSpacing: 1,
  },
  hitRow: {
    borderWidth: 1,
    borderColor: 'rgba(5,217,232,0.35)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: 'rgba(26,11,46,0.6)',
  },
  hitTitle: {
    fontFamily: retroFonts.mono,
    color: retro.text,
    fontSize: 14,
  },
  hitSub: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  hitNut: {
    fontFamily: retroFonts.mono,
    color: retro.neonCyan,
    fontSize: 11,
    marginTop: 6,
  },
  adjustBox: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  preview: {
    fontFamily: retroFonts.mono,
    color: retro.neonYellow,
    fontSize: 13,
    marginTop: 10,
  },
});
