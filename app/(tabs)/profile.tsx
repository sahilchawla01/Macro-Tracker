import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NeonButton } from '@/src/components/NeonButton';
import { NeonCard } from '@/src/components/NeonCard';
import { useDatabase } from '@/src/context/DatabaseContext';
import {
  clearFoodLibrary,
  exportCustomFoodsJson,
  getGoals,
  getProfile,
  getWeightLogs,
  importFoodLibraryMerge,
  importSavedMealsMerge,
  insertWeightLog,
  deleteWeightLog,
  profileBmi,
  recomputeGoalsFromProfile,
  resetOnboardingState,
  saveProfile,
  type FoodLibraryRow,
  type ProfileRow,
  type SavedMealWithIngredients,
} from '@/src/db/repo';
import { kgToLb, lbToKg } from '@/src/nutrition/calculations';
import { retro } from '@/src/theme/retro';
import { retroFonts } from '@/src/theme/retro';
import { todayLocalISO } from '@/src/utils/date';

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { db: sqlite, tick: dbTick, refresh: dbRefresh } = useDatabase();

  const profile = useMemo(() => getProfile(sqlite), [sqlite, dbTick]);
  const goals = useMemo(() => getGoals(sqlite), [sqlite, dbTick]);
  const weights = useMemo(() => getWeightLogs(sqlite), [sqlite, dbTick]);

  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(String(profile.age));
  const [heightCm, setHeightCm] = useState(String(profile.height_cm));
  const [weightIn, setWeightIn] = useState(
    profile.unit_pref === 'imperial'
      ? String(Math.round(kgToLb(profile.weight_kg) * 10) / 10)
      : String(Math.round(profile.weight_kg * 10) / 10)
  );
  const [unitPref, setUnitPref] = useState(profile.unit_pref);
  const [creatine, setCreatine] = useState(profile.creatine);
  const [sex, setSex] = useState(profile.sex);

  const [wDate, setWDate] = useState(todayLocalISO());
  const [wVal, setWVal] = useState(
    profile.unit_pref === 'imperial'
      ? String(Math.round(kgToLb(profile.weight_kg) * 10) / 10)
      : String(Math.round(profile.weight_kg * 10) / 10)
  );

  useEffect(() => {
    const p = getProfile(sqlite);
    setName(p.name);
    setAge(String(p.age));
    setHeightCm(String(Math.round(p.height_cm * 10) / 10));
    setWeightIn(
      p.unit_pref === 'imperial'
        ? String(Math.round(kgToLb(p.weight_kg) * 10) / 10)
        : String(Math.round(p.weight_kg * 10) / 10)
    );
    setUnitPref(p.unit_pref);
    setCreatine(p.creatine);
    setSex(p.sex);
    setWVal(
      p.unit_pref === 'imperial'
        ? String(Math.round(kgToLb(p.weight_kg) * 10) / 10)
        : String(Math.round(p.weight_kg * 10) / 10)
    );
  }, [sqlite, dbTick]);

  const bmiVal = profileBmi(profile);

  const chartData = useMemo(() => {
    return weights.map((w) => ({
      value:
        unitPref === 'imperial'
          ? Math.round(kgToLb(w.weight_kg) * 10) / 10
          : Math.round(w.weight_kg * 10) / 10,
      label: w.date.slice(5),
    }));
  }, [weights, unitPref]);

  const saveProfilePress = () => {
    const wParsed = parseFloat(weightIn.replace(',', '.'));
    const wKg =
      Number.isFinite(wParsed) && wParsed > 0
        ? unitPref === 'imperial'
          ? lbToKg(wParsed)
          : wParsed
        : profile.weight_kg;
    const p: ProfileRow = {
      name: name.trim() || profile.name,
      sex,
      age: Math.max(14, Math.min(100, parseInt(age, 10) || profile.age)),
      height_cm: parseFloat(heightCm.replace(',', '.')) || profile.height_cm,
      weight_kg: wKg,
      unit_pref: unitPref,
      creatine,
    };
    saveProfile(sqlite, p);
    recomputeGoalsFromProfile(
      sqlite,
      p,
      goals.goal_type,
      goals.goal_type === 'recomp' ? 0 : goals.weekly_lbs,
      goals.activity_level
    );
    dbRefresh();
    Alert.alert('Saved', 'Profile and targets updated.');
  };

  const exportJson = async () => {
    const payload = exportCustomFoodsJson(sqlite);
    const body = JSON.stringify(payload, null, 2);

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const blob = new Blob([body], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'macro-tracker-foods.json';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      return;
    }

    const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!base) {
      Alert.alert('Export failed', 'No cache directory available.');
      return;
    }
    const path = `${base}macro-tracker-foods.json`;
    await FileSystem.writeAsStringAsync(path, body);
    const can = await Sharing.isAvailableAsync();
    if (can) {
      await Sharing.shareAsync(path, {
        mimeType: 'application/json',
        dialogTitle: 'Export custom foods',
      });
    } else {
      Alert.alert('Exported', path);
    }
  };

  const importJson = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const uri = res.assets[0].uri;
    const raw = await FileSystem.readAsStringAsync(uri);
    const data = JSON.parse(raw) as {
      version?: number;
      items?: FoodLibraryRow[];
      meals?: SavedMealWithIngredients[];
    };
    const hasItems = Array.isArray(data.items);
    const hasMeals = Array.isArray(data.meals);
    if (!hasItems && !hasMeals) {
      Alert.alert('Invalid file', 'Expected an items and/or meals array.');
      return;
    }
    let libAdded = 0;
    let mealAdded = 0;
    if (hasItems && data.items!.length > 0) {
      libAdded = importFoodLibraryMerge(sqlite, data.items!);
    }
    if (hasMeals && data.meals!.length > 0) {
      mealAdded = importSavedMealsMerge(sqlite, data.meals!);
    }
    if (libAdded === 0 && mealAdded === 0) {
      Alert.alert('Nothing to import', 'Arrays were empty or all IDs already exist.');
      dbRefresh();
      return;
    }
    dbRefresh();
    Alert.alert(
      'Import complete',
      `Library +${libAdded} · Meals +${mealAdded} (existing IDs skipped).`
    );
  };

  const resetGoal = () => {
    Alert.alert(
      'Reset goal',
      'You will go through onboarding again. Your data stays on device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            resetOnboardingState(sqlite);
            dbRefresh();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const confirmClearFoodLibrary = () => {
    Alert.alert(
      'Clear custom foods?',
      'This permanently deletes every item in your custom food library. Saved meals, today’s log, and history are not removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear library',
          style: 'destructive',
          onPress: () => {
            clearFoodLibrary(sqlite);
            dbRefresh();
          },
        },
      ]
    );
  };

  const addWeight = () => {
    const n = parseFloat(wVal.replace(',', '.'));
    if (Number.isNaN(n) || n <= 0) return;
    const kg = unitPref === 'imperial' ? lbToKg(n) : n;
    insertWeightLog(sqlite, {
      id: Crypto.randomUUID(),
      date: wDate,
      weight_kg: kg,
    });
    dbRefresh();
    Alert.alert('Logged', `Weight saved for ${wDate}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.brand}>PROFILE</Text>

        <NeonCard style={{ marginBottom: 14 }}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={retro.textMuted}
          />
          <Text style={styles.label}>Sex</Text>
          <View style={styles.row}>
            {(['male', 'female'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setSex(s)}
                style={[styles.chip, sex === s && styles.chipOn]}>
                <Text style={styles.chipTxt}>{s}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholderTextColor={retro.textMuted}
          />
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="decimal-pad"
            placeholderTextColor={retro.textMuted}
          />
          <Text style={styles.label}>Display / entry units</Text>
          <View style={styles.row}>
            <Pressable
              onPress={() => setUnitPref('metric')}
              style={[styles.chip, unitPref === 'metric' && styles.chipOn]}>
              <Text style={styles.chipTxt}>kg</Text>
            </Pressable>
            <Pressable
              onPress={() => setUnitPref('imperial')}
              style={[styles.chip, unitPref === 'imperial' && styles.chipOn]}>
              <Text style={styles.chipTxt}>lb</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>
            Weight ({unitPref === 'metric' ? 'kg' : 'lb'})
          </Text>
          <TextInput
            style={styles.input}
            value={weightIn}
            onChangeText={setWeightIn}
            keyboardType="decimal-pad"
            placeholderTextColor={retro.textMuted}
          />
          <Pressable
            style={[styles.chip, creatine && styles.chipOn, { marginTop: 8 }]}
            onPress={() => setCreatine(!creatine)}>
            <Text style={styles.chipTxt}>Creatine (extra water target)</Text>
          </Pressable>
          <Text style={styles.bmi}>
            BMI: {bmiVal} (optional reference)
          </Text>
          <NeonButton title="Save profile & recalc targets" onPress={saveProfilePress} />
        </NeonCard>

        <Text style={styles.section}>Weight history</Text>
        <NeonCard style={{ marginBottom: 14 }}>
          <Text style={styles.muted}>
            Unit: {unitPref === 'imperial' ? 'lb' : 'kg'}
          </Text>
          {chartData.length > 0 ? (
            <LineChart
              data={chartData}
              width={Math.max(280, width - 64)}
              height={200}
              spacing={Math.min(56, Math.max(36, (width - 80) / Math.max(chartData.length, 1)))}
              initialSpacing={10}
              color={retro.neonCyan}
              thickness={2}
              hideDataPoints={chartData.length > 8}
              dataPointsColor={retro.neonPink}
              textColor1={retro.textMuted}
              xAxisColor={retro.textMuted}
              yAxisColor={retro.textMuted}
              rulesColor="rgba(255,255,255,0.08)"
              yAxisTextStyle={{
                color: retro.textMuted,
                fontSize: 10,
                fontFamily: retroFonts.mono,
              }}
              xAxisLabelTextStyle={{
                color: retro.textMuted,
                fontSize: 9,
                fontFamily: retroFonts.mono,
              }}
              noOfSections={4}
            />
          ) : (
            <Text style={styles.muted}>Log weight below to see the graph.</Text>
          )}
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={wDate}
            onChangeText={setWDate}
            placeholderTextColor={retro.textMuted}
          />
          <Text style={styles.label}>
            Weight ({unitPref === 'imperial' ? 'lb' : 'kg'})
          </Text>
          <TextInput
            style={styles.input}
            value={wVal}
            onChangeText={setWVal}
            keyboardType="decimal-pad"
            placeholderTextColor={retro.textMuted}
          />
          <NeonButton title="Log weight" variant="secondary" onPress={addWeight} />
          {weights.length > 0 && (
            <View style={{ marginTop: 12 }}>
              {weights.map((w) => (
                <View key={w.id} style={styles.wRow}>
                  <Text style={styles.chipTxt}>
                    {w.date} —{' '}
                    {unitPref === 'imperial'
                      ? kgToLb(w.weight_kg).toFixed(1)
                      : w.weight_kg.toFixed(1)}{' '}
                    {unitPref === 'imperial' ? 'lb' : 'kg'}
                  </Text>
                  <Pressable onPress={() => {
                    deleteWeightLog(sqlite, w.id);
                    dbRefresh();
                  }}>
                    <Text style={styles.del}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </NeonCard>

        <Text style={styles.section}>Custom foods</Text>
        <NeonCard style={{ marginBottom: 14 }}>
          <NeonButton title="Export JSON" onPress={exportJson} />
          <View style={styles.foodBtnSpacer} />
          <NeonButton
            title="Import JSON (merge)"
            variant="secondary"
            onPress={importJson}
          />
          <View style={styles.foodBtnSpacer} />
          <NeonButton
            title="Clear food library"
            variant="ghost"
            onPress={confirmClearFoodLibrary}
          />
        </NeonCard>

        <NeonButton title="Reset goal (onboarding)" variant="ghost" onPress={resetGoal} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: retro.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  brand: {
    fontFamily: retroFonts.display,
    fontSize: 22,
    color: retro.neonPink,
    marginBottom: 16,
    letterSpacing: 2,
  },
  section: {
    fontFamily: retroFonts.display,
    color: retro.neonCyan,
    fontSize: 16,
    marginBottom: 8,
  },
  label: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 12,
    marginTop: 8,
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
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: retro.textMuted,
  },
  chipOn: {
    borderColor: retro.neonPink,
    backgroundColor: 'rgba(255,42,109,0.12)',
  },
  chipTxt: { fontFamily: retroFonts.mono, color: retro.text },
  bmi: {
    fontFamily: retroFonts.mono,
    color: retro.neonYellow,
    marginVertical: 10,
  },
  muted: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  wRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  del: {
    fontFamily: retroFonts.mono,
    color: retro.neonPink,
    padding: 8,
    fontSize: 16,
  },
  foodBtnSpacer: { height: 14 },
});
