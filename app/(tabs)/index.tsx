import * as Crypto from 'expo-crypto';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NeonButton } from '@/src/components/NeonButton';
import { NeonCard } from '@/src/components/NeonCard';
import {
  NeonProgressTrack,
  RetroProgressBar,
} from '@/src/components/RetroProgressBar';
import { useDatabase } from '@/src/context/DatabaseContext';
import {
  addWater,
  clearFoodLogForDate,
  deleteFoodLogEntry,
  ensureWaterRow,
  getFoodLogForDate,
  getGoals,
  getMealIngredients,
  getWaterForDate,
  insertSavedMealWithIngredients,
  logSavedMealServings,
  searchSavedMeals,
  setWater,
  sumFoodLogForDate,
  sumIngredientTotals,
  type FoodLogEntryRow,
  type SavedMealRow,
} from '@/src/db/repo';
import { retro } from '@/src/theme/retro';
import { retroFonts } from '@/src/theme/retro';
import { todayLocalISO } from '@/src/utils/date';

const ML_PER_GLASS = 250;

type DraftIngredient = {
  id: string;
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
};

export default function HomeScreen() {
  const { db, tick, refresh } = useDatabase();
  const date = todayLocalISO();

  const goals = useMemo(() => getGoals(db), [db, tick]);
  const totals = useMemo(() => sumFoodLogForDate(db, date), [db, date, tick]);
  const entries = useMemo(() => getFoodLogForDate(db, date), [db, date, tick]);

  const waterMl = useMemo(() => {
    ensureWaterRow(db, date);
    return getWaterForDate(db, date);
  }, [db, date, tick]);

  const spentCal = Math.round(totals.calories);
  const budgetCal = goals.calorie_target;
  const remainingCal = Math.max(0, budgetCal - spentCal);

  const targetGlasses = Math.max(
    1,
    Math.ceil(goals.water_goal_ml / ML_PER_GLASS)
  );
  const glassesDrunk = waterMl / ML_PER_GLASS;

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchResults = useMemo(
    () => (search.trim() ? searchSavedMeals(db, search) : []),
    [db, search, tick]
  );
  const showDropdown = searchFocused && search.trim().length > 0;

  const [servingsOpen, setServingsOpen] = useState(false);
  const [mealPick, setMealPick] = useState<SavedMealRow | null>(null);
  const [servingsStr, setServingsStr] = useState('1');

  const [addMealOpen, setAddMealOpen] = useState(false);
  const [mealName, setMealName] = useState('');
  const [recipeServingsStr, setRecipeServingsStr] = useState('1');
  const [ingMode, setIngMode] = useState<'ai' | 'custom'>('custom');
  const [cName, setCName] = useState('');
  const [cCal, setCCal] = useState('');
  const [cGrams, setCGrams] = useState('');
  const [cP, setCP] = useState('');
  const [cC, setCC] = useState('');
  const [cF, setCF] = useState('');
  const [cFiber, setCFiber] = useState('');
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);

  const ingTotals = useMemo(() => sumIngredientTotals(ingredients), [ingredients]);

  const mealLogPreview = useMemo(() => {
    if (!mealPick) return null;
    const ings = getMealIngredients(db, mealPick.id);
    const totals = sumIngredientTotals(ings);
    const rs = mealPick.recipe_servings > 0 ? mealPick.recipe_servings : 1;
    const per = {
      calories: totals.calories / rs,
      protein_g: totals.protein_g / rs,
      carb_g: totals.carb_g / rs,
      fat_g: totals.fat_g / rs,
      fiber_g: totals.fiber_g / rs,
      grams: totals.grams / rs,
    };
    const s = parseFloat(servingsStr.replace(',', '.'));
    const sv = Number.isFinite(s) && s > 0 ? s : 1;
    const mult = sv;
    return {
      per,
      logged: {
        calories: Math.round(per.calories * mult * 10) / 10,
        protein_g: Math.round(per.protein_g * mult * 10) / 10,
        carb_g: Math.round(per.carb_g * mult * 10) / 10,
        fat_g: Math.round(per.fat_g * mult * 10) / 10,
        fiber_g: Math.round(per.fiber_g * mult * 10) / 10,
        grams: Math.round(per.grams * mult * 10) / 10,
      },
      recipeTotals: totals,
      recipeServings: rs,
    };
  }, [mealPick, servingsStr, db, tick]);

  const openServingsFor = (m: SavedMealRow) => {
    setMealPick(m);
    setServingsStr('1');
    setServingsOpen(true);
    setSearch('');
    setSearchFocused(false);
  };

  const confirmLogServings = () => {
    if (!mealPick) return;
    const s = parseFloat(servingsStr.replace(',', '.'));
    if (Number.isNaN(s) || s <= 0) return;
    logSavedMealServings(db, date, Crypto.randomUUID(), mealPick.id, s);
    refresh();
    setServingsOpen(false);
    setMealPick(null);
  };

  const addDraftIngredient = () => {
    if (ingMode !== 'custom') return;
    const name = cName.trim();
    const cal = parseFloat(cCal.replace(',', '.'));
    const grams = parseFloat(cGrams.replace(',', '.'));
    const p = parseFloat(cP.replace(',', '.'));
    const c = parseFloat(cC.replace(',', '.'));
    const f = parseFloat(cF.replace(',', '.'));
    const fib = parseFloat(cFiber.replace(',', '.'));
    if (!name || [cal, grams, p, c, f, fib].some((n) => Number.isNaN(n))) return;
    setIngredients((prev) => [
      ...prev,
      {
        id: Crypto.randomUUID(),
        name,
        grams,
        calories: cal,
        protein_g: p,
        carb_g: c,
        fat_g: f,
        fiber_g: fib,
      },
    ]);
    setCName('');
    setCCal('');
    setCGrams('');
    setCP('');
    setCC('');
    setCF('');
    setCFiber('');
  };

  const removeDraftIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((x) => x.id !== id));
  };

  const resetAddMealForm = () => {
    setMealName('');
    setRecipeServingsStr('1');
    setIngMode('custom');
    setIngredients([]);
    setCName('');
    setCCal('');
    setCGrams('');
    setCP('');
    setCC('');
    setCF('');
    setCFiber('');
  };

  const saveNewMeal = () => {
    const n = mealName.trim();
    const rs = parseFloat(recipeServingsStr.replace(',', '.'));
    if (!n || Number.isNaN(rs) || rs <= 0) {
      Alert.alert('Missing info', 'Enter a meal name and recipe serving size.');
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert(
        'Add ingredients',
        'Add at least one ingredient in Custom mode (AI search is coming soon).'
      );
      return;
    }
    const mealId = Crypto.randomUUID();
    insertSavedMealWithIngredients(
      db,
      { id: mealId, name: n, recipe_servings: rs },
      ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        grams: i.grams,
        calories: i.calories,
        protein_g: i.protein_g,
        carb_g: i.carb_g,
        fat_g: i.fat_g,
        fiber_g: i.fiber_g,
      }))
    );
    refresh();
    setAddMealOpen(false);
    resetAddMealForm();
    Alert.alert(
      '✨ Meal saved',
      'Meal is saved — search for it on the dashboard to log it.'
    );
  };

  const removeEntry = useCallback(
    (id: string) => {
      deleteFoodLogEntry(db, id);
      refresh();
    },
    [db, refresh]
  );

  const bumpWaterGlass = (delta: number) => {
    ensureWaterRow(db, date);
    const next = Math.max(0, waterMl + delta * ML_PER_GLASS);
    setWater(db, date, next);
    refresh();
  };

  const resetTodayLogs = () => {
    Alert.alert(
      'Reset today?',
      'Clears all food logged today and resets water to 0 ml.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            clearFoodLogForDate(db, date);
            setWater(db, date, 0);
            refresh();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <Text style={styles.brand}>✨ DASHBOARD</Text>
          <Pressable
            style={styles.resetDayBtn}
            onPress={resetTodayLogs}
            accessibilityLabel="Reset today logs">
            <Text style={styles.resetDayTxt}>↺ Reset day</Text>
          </Pressable>
        </View>

        <NeonCard style={styles.cardSpaced}>
          <View style={styles.rowBetween}>
            <Text style={styles.calTitle}>🔥 Calories</Text>
            <Text style={styles.monoStat}>
              {spentCal} / {budgetCal} kcal
            </Text>
          </View>
          <NeonProgressTrack
            value={spentCal}
            max={budgetCal}
            color={retro.neonPink}
          />
          <Text style={styles.remaining}>
            {remainingCal} kcal remaining
          </Text>
        </NeonCard>

        <NeonCard style={styles.cardSpaced}>
          <View style={styles.rowBetween}>
            <Text style={styles.calTitle}>💧 Water</Text>
            <Text style={styles.monoStat}>
              {Math.round(waterMl)} / {goals.water_goal_ml} ml
            </Text>
          </View>
          <NeonProgressTrack
            value={waterMl}
            max={goals.water_goal_ml}
            color={retro.neonCyan}
          />
          <View style={styles.waterGlassesRow}>
            <Text style={styles.glassesText}>
              🥤{' '}
              {Math.abs(glassesDrunk - Math.round(glassesDrunk)) < 1e-6
                ? String(Math.round(glassesDrunk))
                : glassesDrunk.toFixed(1)}{' '}
              / {targetGlasses} glasses
            </Text>
            <View style={styles.glassBtns}>
              <Pressable
                style={styles.glassBtn}
                onPress={() => bumpWaterGlass(-1)}
                accessibilityLabel="Remove one glass">
                <Text style={styles.glassBtnTxt}>−</Text>
              </Pressable>
              <Pressable
                style={styles.glassBtn}
                onPress={() => bumpWaterGlass(1)}
                accessibilityLabel="Add one glass">
                <Text style={styles.glassBtnTxt}>＋</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.glassHint}>
            Each glass = {ML_PER_GLASS} ml
          </Text>
        </NeonCard>

        <Text style={styles.section}>⚡ Macros</Text>
        <NeonCard style={styles.cardSpaced}>
          <RetroProgressBar
            label="🥩 Protein"
            value={totals.protein_g}
            max={goals.protein_g}
            unit="g"
            color={retro.neonYellow}
          />
          <RetroProgressBar
            label="🍞 Carbs"
            value={totals.carb_g}
            max={goals.carb_g}
            unit="g"
            color={retro.neonCyan}
          />
          <RetroProgressBar
            label="🧈 Fat"
            value={totals.fat_g}
            max={goals.fat_g}
            unit="g"
            color={retro.neonPink}
          />
          <RetroProgressBar
            label="🌿 Fiber"
            value={totals.fiber_g}
            max={goals.fiber_g}
            unit="g"
            color={retro.success}
          />
        </NeonCard>

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            placeholder="Search saved Foods"
            placeholderTextColor={retro.textMuted}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 350)}
          />
          <Pressable
            style={styles.plusBtn}
            onPress={() => setAddMealOpen(true)}
            accessibilityLabel="Add new meal">
            <Text style={styles.plusTxt}>＋</Text>
          </Pressable>
        </View>

        {showDropdown && searchResults.length > 0 && (
          <View style={styles.dropdown}>
            <ScrollView
              style={styles.dropdownScroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled>
              {searchResults.map((m) => (
                <Pressable
                  key={m.id}
                  style={styles.dropdownRow}
                  onPress={() => openServingsFor(m)}>
                  <Text style={styles.dropdownName}>{m.name}</Text>
                  <Text style={styles.dropdownMeta}>
                    {m.recipe_servings} recipe serving
                    {m.recipe_servings === 1 ? '' : 's'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {showDropdown && search.trim() && searchResults.length === 0 && (
          <View style={styles.dropdownEmpty}>
            <Text style={styles.muted}>No saved meals match.</Text>
          </View>
        )}

        <Text style={styles.section}>🍽️ Today&apos;s log</Text>
        <NeonCard>
          {entries.length === 0 ? (
            <Text style={styles.muted}>Nothing logged yet.</Text>
          ) : (
            entries.map((e: FoodLogEntryRow) => (
              <View key={e.id} style={styles.entryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName}>{e.name}</Text>
                  <Text style={styles.muted}>
                    {e.grams}g · {Math.round(e.calories)} kcal · P{e.protein_g}{' '}
                    C{e.carb_g} F{e.fat_g} · Fiber {e.fiber_g}g
                  </Text>
                </View>
                <Pressable onPress={() => removeEntry(e.id)}>
                  <Text style={styles.del}>✕</Text>
                </Pressable>
              </View>
            ))
          )}
        </NeonCard>
      </ScrollView>

      <Modal visible={servingsOpen} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🍽️ Log meal</Text>
            <Text style={styles.modalBody}>{mealPick?.name}</Text>
            {mealLogPreview && (
              <View style={styles.nutritionBox}>
                <Text style={styles.nutritionTitle}>Per 1 serving</Text>
                <Text style={styles.nutritionLine}>
                  {Math.round(mealLogPreview.per.calories)} kcal ·{' '}
                  {mealLogPreview.per.grams.toFixed(0)}g · P
                  {mealLogPreview.per.protein_g.toFixed(1)} C
                  {mealLogPreview.per.carb_g.toFixed(1)} F
                  {mealLogPreview.per.fat_g.toFixed(1)} · Fiber{' '}
                  {mealLogPreview.per.fiber_g.toFixed(1)}g
                </Text>
                <Text style={styles.nutritionTitle}>For this log</Text>
                <Text style={styles.nutritionLineBold}>
                  {Math.round(mealLogPreview.logged.calories)} kcal ·{' '}
                  {mealLogPreview.logged.grams.toFixed(0)}g · P
                  {mealLogPreview.logged.protein_g.toFixed(1)} C
                  {mealLogPreview.logged.carb_g.toFixed(1)} F
                  {mealLogPreview.logged.fat_g.toFixed(1)} · Fiber{' '}
                  {mealLogPreview.logged.fiber_g.toFixed(1)}g
                </Text>
              </View>
            )}
            <Text style={styles.label}>Servings</Text>
            <TextInput
              style={styles.input}
              value={servingsStr}
              onChangeText={setServingsStr}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={retro.textMuted}
            />
            <NeonButton title="Add to log" onPress={confirmLogServings} />
            <View style={styles.btnSpacer} />
            <NeonButton
              title="Cancel"
              variant="ghost"
              onPress={() => {
                setServingsOpen(false);
                setMealPick(null);
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={addMealOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.addMealCard]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>ADD NEW MEAL</Text>
              <Text style={styles.label}>Meal name</Text>
              <TextInput
                style={styles.input}
                value={mealName}
                onChangeText={setMealName}
                placeholder="Post-workout bowl"
                placeholderTextColor={retro.textMuted}
              />
              <Text style={styles.label}>Serving size (recipe yields)</Text>
              <Text style={styles.hint}>
                e.g. 2 = ingredients below are for 2 servings total
              </Text>
              <TextInput
                style={styles.input}
                value={recipeServingsStr}
                onChangeText={setRecipeServingsStr}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor={retro.textMuted}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>🤖 AI Web Search</Text>
                <Switch
                  value={ingMode === 'custom'}
                  onValueChange={(v) => setIngMode(v ? 'custom' : 'ai')}
                  trackColor={{
                    false: retro.bg,
                    true: retro.neonPink,
                  }}
                  thumbColor={retro.text}
                />
                <Text style={styles.switchLabel}>✏️ Custom</Text>
              </View>
              <View style={styles.btnSpacer} />

              {ingMode === 'ai' ? (
                <View style={styles.aiPlaceholder}>
                  <Text style={styles.aiPlaceholderText}>
                    🔮 AI ingredient search with web grounding will plug in here
                    (OpenAI / search API). Use Custom for now.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.subSection}>Add ingredient</Text>
                  <Text style={styles.fieldLabel}>Ingredient name</Text>
                  <TextInput
                    style={styles.input}
                    value={cName}
                    onChangeText={setCName}
                    placeholder="e.g. Chicken breast"
                    placeholderTextColor={retro.textMuted}
                  />
                  <Text style={styles.fieldLabel}>Calories (for this amount)</Text>
                  <TextInput
                    style={styles.input}
                    value={cCal}
                    onChangeText={setCCal}
                    keyboardType="decimal-pad"
                    placeholder="kcal"
                    placeholderTextColor={retro.textMuted}
                  />
                  <Text style={styles.fieldLabel}>Amount (grams)</Text>
                  <TextInput
                    style={styles.input}
                    value={cGrams}
                    onChangeText={setCGrams}
                    keyboardType="decimal-pad"
                    placeholder="g"
                    placeholderTextColor={retro.textMuted}
                  />
                  <Text style={styles.fieldLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={cP}
                    onChangeText={setCP}
                    keyboardType="decimal-pad"
                    placeholder="g"
                    placeholderTextColor={retro.textMuted}
                  />
                  <Text style={styles.fieldLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={cC}
                    onChangeText={setCC}
                    keyboardType="decimal-pad"
                    placeholder="g"
                    placeholderTextColor={retro.textMuted}
                  />
                  <Text style={styles.fieldLabel}>Fat (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={cF}
                    onChangeText={setCF}
                    keyboardType="decimal-pad"
                    placeholder="g"
                    placeholderTextColor={retro.textMuted}
                  />
                  <Text style={styles.fieldLabel}>Fiber (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={cFiber}
                    onChangeText={setCFiber}
                    keyboardType="decimal-pad"
                    placeholder="g"
                    placeholderTextColor={retro.textMuted}
                  />
                  <View style={styles.btnSpacer} />
                  <NeonButton
                    title="Add ingredient"
                    variant="secondary"
                    onPress={addDraftIngredient}
                  />
                </>
              )}

              {ingredients.length > 0 && (
                <View style={styles.ingList}>
                  <Text style={styles.subSection}>📋 Ingredients</Text>
                  {ingredients.map((ing) => (
                    <View key={ing.id} style={styles.ingRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.foodName}>{ing.name}</Text>
                        <Text style={styles.muted}>
                          {ing.grams}g · {ing.calories} kcal · P{ing.protein_g}{' '}
                          C{ing.carb_g} F{ing.fat_g} · Fiber {ing.fiber_g}g
                        </Text>
                      </View>
                      <Pressable onPress={() => removeDraftIngredient(ing.id)}>
                        <Text style={styles.del}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                  <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>Total (full recipe)</Text>
                    <Text style={styles.totalVals}>
                      {ingTotals.calories} kcal · P{ingTotals.protein_g} C
                      {ingTotals.carb_g} F{ingTotals.fat_g} · Fiber{' '}
                      {ingTotals.fiber_g}g · {ingTotals.grams}g
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.btnSpacer} />
              <NeonButton title="Save meal" onPress={saveNewMeal} />
              <View style={styles.btnSpacer} />
              <NeonButton
                title="Close"
                variant="ghost"
                onPress={() => {
                  setAddMealOpen(false);
                  resetAddMealForm();
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: retro.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  brand: {
    flex: 1,
    fontFamily: retroFonts.display,
    fontSize: 22,
    color: retro.neonPink,
    letterSpacing: 2,
  },
  resetDayBtn: {
    borderWidth: 1,
    borderColor: retro.neonCyan,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(5,217,232,0.12)',
  },
  resetDayTxt: {
    fontFamily: retroFonts.mono,
    color: retro.neonCyan,
    fontSize: 12,
  },
  cardSpaced: { marginBottom: 16 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calTitle: {
    fontFamily: retroFonts.display,
    color: retro.neonCyan,
    fontSize: 17,
    letterSpacing: 1,
  },
  monoStat: {
    fontFamily: retroFonts.mono,
    color: retro.text,
    fontSize: 14,
  },
  remaining: {
    fontFamily: retroFonts.display,
    color: retro.neonYellow,
    fontSize: 16,
    letterSpacing: 1,
    marginTop: 10,
  },
  waterGlassesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  glassesText: {
    fontFamily: retroFonts.mono,
    color: retro.text,
    fontSize: 14,
    flex: 1,
  },
  glassBtns: { flexDirection: 'row', gap: 8 },
  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: retro.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,217,232,0.12)',
  },
  glassBtnTxt: {
    fontFamily: retroFonts.mono,
    color: retro.neonCyan,
    fontSize: 22,
  },
  glassHint: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
  section: {
    fontFamily: retroFonts.display,
    color: retro.neonCyan,
    fontSize: 16,
    marginBottom: 8,
    letterSpacing: 1,
  },
  searchWrap: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    zIndex: 2,
  },
  search: {
    flex: 1,
    fontFamily: retroFonts.mono,
    borderWidth: 1,
    borderColor: retro.neonCyan,
    borderRadius: 8,
    padding: 12,
    color: retro.text,
    backgroundColor: retro.bgPanel,
  },
  plusBtn: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: retro.neonPink,
    backgroundColor: 'rgba(255,42,109,0.15)',
  },
  plusTxt: {
    fontFamily: retroFonts.mono,
    color: retro.neonPink,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: retro.neonCyan,
    borderRadius: 8,
    backgroundColor: retro.bgPanel,
    maxHeight: 220,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownScroll: { maxHeight: 220 },
  dropdownEmpty: {
    padding: 12,
    borderWidth: 1,
    borderColor: retro.textMuted,
    borderRadius: 8,
    marginBottom: 16,
  },
  dropdownRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  dropdownName: {
    fontFamily: retroFonts.mono,
    color: retro.text,
    fontSize: 15,
  },
  dropdownMeta: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  muted: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  foodName: {
    fontFamily: retroFonts.mono,
    color: retro.text,
    fontSize: 15,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  del: {
    fontFamily: retroFonts.mono,
    color: retro.neonPink,
    fontSize: 18,
    padding: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: retro.bgPanel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: retro.neonCyan,
    padding: 16,
  },
  addMealCard: { maxHeight: '92%' },
  modalTitle: {
    fontFamily: retroFonts.display,
    color: retro.neonPink,
    fontSize: 18,
    marginBottom: 8,
    letterSpacing: 1,
  },
  modalBody: {
    fontFamily: retroFonts.mono,
    color: retro.text,
    marginBottom: 12,
    fontSize: 15,
  },
  input: {
    fontFamily: retroFonts.mono,
    borderWidth: 1,
    borderColor: retro.neonCyan,
    borderRadius: 8,
    padding: 10,
    color: retro.text,
    marginBottom: 8,
    backgroundColor: retro.bg,
  },
  label: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontFamily: retroFonts.mono,
    color: retro.neonCyan,
    fontSize: 12,
    marginBottom: 4,
    marginTop: 4,
  },
  btnSpacer: { height: 14 },
  nutritionBox: {
    borderWidth: 1,
    borderColor: retro.neonPink,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255,42,109,0.08)',
  },
  nutritionTitle: {
    fontFamily: retroFonts.display,
    color: retro.neonPink,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 4,
  },
  nutritionLine: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  nutritionLineBold: {
    fontFamily: retroFonts.mono,
    color: retro.text,
    fontSize: 13,
    lineHeight: 20,
  },
  hint: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
    gap: 8,
  },
  switchLabel: {
    fontFamily: retroFonts.mono,
    color: retro.text,
    fontSize: 12,
    flex: 1,
  },
  aiPlaceholder: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: retro.neonYellow,
    backgroundColor: 'rgba(249,240,2,0.08)',
    marginBottom: 12,
  },
  aiPlaceholderText: {
    fontFamily: retroFonts.mono,
    color: retro.neonYellow,
    fontSize: 13,
    lineHeight: 20,
  },
  subSection: {
    fontFamily: retroFonts.display,
    color: retro.neonCyan,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 6,
    letterSpacing: 1,
  },
  ingList: { marginTop: 12 },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  totalBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: retro.neonPink,
    backgroundColor: 'rgba(255,42,109,0.08)',
  },
  totalLabel: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  totalVals: {
    fontFamily: retroFonts.mono,
    color: retro.text,
    fontSize: 14,
  },
});
