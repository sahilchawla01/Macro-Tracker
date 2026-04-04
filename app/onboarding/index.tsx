import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NeonButton } from '@/src/components/NeonButton';
import { useDatabase } from '@/src/context/DatabaseContext';
import { inchesToCm, kgToLb, lbToKg } from '@/src/nutrition/calculations';
import type { ActivityLevel, GoalType, Sex } from '@/src/nutrition/calculations';
import {
  getGoals,
  getProfile,
  recomputeGoalsFromProfile,
  saveProfile,
  setOnboardingComplete,
  type ProfileRow,
} from '@/src/db/repo';
import { retro, retroFonts } from '@/src/theme/retro';

const LOSE_RATES = [0.5, 1, 1.5, 2] as const;
const GAIN_RATES = [0.25, 0.5, 0.75, 1] as const;

const ACTIVITY_OPTIONS: { key: ActivityLevel; label: string }[] = [
  { key: 'sedentary', label: 'Sedentary' },
  { key: 'light', label: 'Light (1–3 d/wk)' },
  { key: 'moderate', label: 'Moderate (3–5 d/wk)' },
  { key: 'very', label: 'Very active (6–7 d/wk)' },
  { key: 'extra', label: 'Extra (intense daily)' },
];

function activityLabel(level: ActivityLevel): string {
  return ACTIVITY_OPTIONS.find((o) => o.key === level)?.label ?? level;
}

function goalTitle(g: GoalType): string {
  if (g === 'lose') return 'Lose weight';
  if (g === 'gain') return 'Gain muscle';
  return 'Lose fat / gain muscle (recomp)';
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { db, refresh } = useDatabase();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('28');
  const [heightCm, setHeightCm] = useState('175');
  const [weightInput, setWeightInput] = useState('75');
  const [unitPref, setUnitPref] = useState<'metric' | 'imperial'>('metric');
  const [heightImperial, setHeightImperial] = useState(false);

  const [creatine, setCreatine] = useState(false);
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [goalType, setGoalType] = useState<GoalType>('lose');
  const [weeklyLbs, setWeeklyLbs] = useState<number>(1);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    const p = getProfile(db);
    setName(p.name);
    setSex(p.sex);
    setAge(String(p.age));
    setHeightCm(String(Math.round(p.height_cm * 10) / 10));
    setWeightInput(
      p.unit_pref === 'imperial'
        ? String(Math.round(kgToLb(p.weight_kg) * 10) / 10)
        : String(Math.round(p.weight_kg * 10) / 10)
    );
    setUnitPref(p.unit_pref);
    setCreatine(p.creatine);
    const g = getGoals(db);
    setActivity(g.activity_level);
    setGoalType(g.goal_type);
    if (g.goal_type !== 'recomp') {
      setWeeklyLbs(g.weekly_lbs);
    }
    setHydrated(true);
  }, [db, hydrated]);

  const weightKg = (): number => {
    const n = parseFloat(weightInput.replace(',', '.'));
    if (Number.isNaN(n) || n <= 0) return 70;
    return unitPref === 'metric' ? n : lbToKg(n);
  };

  const heightCmVal = (): number => {
    const n = parseFloat(heightCm.replace(',', '.'));
    if (Number.isNaN(n) || n <= 0) return 170;
    return heightImperial ? inchesToCm(n) : n;
  };

  const finish = () => {
    const profile: ProfileRow = {
      name: name.trim() || 'Athlete',
      sex,
      age: Math.max(14, Math.min(100, parseInt(age, 10) || 30)),
      height_cm: heightCmVal(),
      weight_kg: weightKg(),
      unit_pref: unitPref,
      creatine,
    };
    saveProfile(db, profile);
    let safeWeekly = 0;
    if (goalType === 'lose') {
      safeWeekly = LOSE_RATES.includes(weeklyLbs as (typeof LOSE_RATES)[number])
        ? weeklyLbs
        : LOSE_RATES[1];
    } else if (goalType === 'gain') {
      safeWeekly = GAIN_RATES.includes(weeklyLbs as (typeof GAIN_RATES)[number])
        ? weeklyLbs
        : GAIN_RATES[1];
    }
    const { clampedToFloor } = recomputeGoalsFromProfile(
      db,
      profile,
      goalType,
      safeWeekly,
      activity
    );
    setOnboardingComplete(db, true);
    refresh();
    if (clampedToFloor) {
      Alert.alert(
        'Calorie floor',
        'Your plan hit the minimum safe calorie target for your sex. Consider a slower loss rate or see a clinician for aggressive cuts.'
      );
    }
    router.replace('/(tabs)');
  };

  const title = (t: string) => (
    <Text style={styles.title}>{t}</Text>
  );

  const body = (t: string) => <Text style={styles.body}>{t}</Text>;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>MACRO//TRACKER</Text>
          {step === 0 && (
            <View>
              {title('Your profile')}
              {body('Name, stats, and display units.')}
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={retro.textMuted}
              />
              <Text style={styles.label}>Sex (for BMR)</Text>
              <View style={styles.row}>
                {(['male', 'female'] as const).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSex(s)}
                    style={[
                      styles.chip,
                      sex === s && styles.chipOn,
                    ]}>
                    <Text style={styles.chipText}>{s}</Text>
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
              <Text style={styles.label}>Weight units</Text>
              <View style={styles.row}>
                <Pressable
                  onPress={() => setUnitPref('metric')}
                  style={[
                    styles.chip,
                    unitPref === 'metric' && styles.chipOn,
                  ]}>
                  <Text style={styles.chipText}>kg</Text>
                </Pressable>
                <Pressable
                  onPress={() => setUnitPref('imperial')}
                  style={[
                    styles.chip,
                    unitPref === 'imperial' && styles.chipOn,
                  ]}>
                  <Text style={styles.chipText}>lb</Text>
                </Pressable>
              </View>
              <Text style={styles.label}>
                Weight ({unitPref === 'metric' ? 'kg' : 'lb'})
              </Text>
              <TextInput
                style={styles.input}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholderTextColor={retro.textMuted}
              />
              <Text style={styles.label}>Height input</Text>
              <View style={styles.row}>
                <Pressable
                  onPress={() => setHeightImperial(false)}
                  style={[
                    styles.chip,
                    !heightImperial && styles.chipOn,
                  ]}>
                  <Text style={styles.chipText}>cm</Text>
                </Pressable>
                <Pressable
                  onPress={() => setHeightImperial(true)}
                  style={[
                    styles.chip,
                    heightImperial && styles.chipOn,
                  ]}>
                  <Text style={styles.chipText}>inches</Text>
                </Pressable>
              </View>
              <Text style={styles.label}>
                {heightImperial ? 'Height (in)' : 'Height (cm)'}
              </Text>
              <TextInput
                style={styles.input}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="decimal-pad"
                placeholderTextColor={retro.textMuted}
              />
              {unitPref === 'imperial' && (
                <Text style={styles.hint}>
                  ≈ {kgToLb(weightKg()).toFixed(1)} lb total mass
                </Text>
              )}
              {heightImperial && (
                <Text style={styles.hint}>
                  ≈ {heightCmVal().toFixed(1)} cm
                </Text>
              )}
            </View>
          )}

          {step === 1 && (
            <View>
              {title('Hydration')}
              {body('Creatine usually means extra water.')}
              <Pressable
                onPress={() => setCreatine(!creatine)}
                style={[styles.bigChip, creatine && styles.chipOn]}>
                <Text style={styles.chipText}>
                  I take creatine (+750 ml target)
                </Text>
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View>
              {title('Activity')}
              {body('Used for maintenance calories (TDEE).')}
              {ACTIVITY_OPTIONS.map((o) => (
                <Pressable
                  key={o.key}
                  onPress={() => setActivity(o.key)}
                  style={[
                    styles.option,
                    activity === o.key && styles.optionOn,
                  ]}>
                  <Text style={styles.optionText}>{o.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {step === 3 && (
            <View>
              {title('Goal')}
              <View style={styles.row}>
                {(
                  [
                    ['lose', 'Lose weight'],
                    ['gain', 'Gain muscle'],
                    ['recomp', 'Recomp'],
                  ] as const
                ).map(([k, lab]) => (
                  <Pressable
                    key={k}
                    onPress={() => {
                      setGoalType(k);
                      if (k === 'lose') setWeeklyLbs(1);
                      if (k === 'gain') setWeeklyLbs(0.5);
                      if (k === 'recomp') setWeeklyLbs(0);
                    }}
                    style={[
                      styles.chip,
                      goalType === k && styles.chipOn,
                    ]}>
                    <Text style={styles.chipText}>{lab}</Text>
                  </Pressable>
                ))}
              </View>
              {goalType !== 'recomp' && (
                <>
                  <Text style={styles.label}>
                    {goalType === 'lose'
                      ? 'Loss per week (lb)'
                      : 'Gain pace (lb/wk)'}
                  </Text>
                  <View style={styles.wrap}>
                    {(goalType === 'lose' ? LOSE_RATES : GAIN_RATES).map(
                      (r) => (
                        <Pressable
                          key={r}
                          onPress={() => setWeeklyLbs(r)}
                          style={[
                            styles.rateChip,
                            weeklyLbs === r && styles.chipOn,
                          ]}>
                          <Text style={styles.chipText}>{r}</Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </>
              )}
            </View>
          )}

          {step === 4 && (
            <View>
              {title('Your setup')}
              <Text style={styles.body}>
                Review your choices. Calories and macros are computed from this
                profile; everything stays on this device.
              </Text>
              <View style={styles.summaryCard}>
                <Text style={[styles.summarySection, styles.summarySectionFirst]}>
                  Profile
                </Text>
                <SummaryRow
                  label="Name"
                  value={name.trim() || 'Athlete'}
                />
                <SummaryRow
                  label="Sex / age"
                  value={`${sex === 'male' ? 'Male' : 'Female'} · ${Math.max(14, Math.min(100, parseInt(age, 10) || 30))} yrs`}
                />
                <SummaryRow
                  label="Height"
                  value={
                    heightImperial
                      ? `${heightCm} in (≈ ${heightCmVal().toFixed(1)} cm)`
                      : `${heightCmVal().toFixed(1)} cm`
                  }
                />
                <SummaryRow
                  label="Weight"
                  value={
                    unitPref === 'imperial'
                      ? `${weightInput} lb (≈ ${weightKg().toFixed(1)} kg)`
                      : `${weightKg().toFixed(1)} kg`
                  }
                />
                <SummaryRow
                  label="Units in app"
                  value={
                    unitPref === 'imperial'
                      ? 'Pounds (lb) for weight'
                      : 'Kilograms (kg) for weight'
                  }
                />
                <Text style={styles.summarySection}>Hydration</Text>
                <SummaryRow
                  label="Creatine"
                  value={creatine ? 'Yes (+750 ml water target)' : 'No'}
                />
                <Text style={styles.summarySection}>Training & goal</Text>
                <SummaryRow label="Activity" value={activityLabel(activity)} />
                <SummaryRow label="Goal" value={goalTitle(goalType)} />
                {goalType !== 'recomp' ? (
                  <SummaryRow
                    label={goalType === 'lose' ? 'Weekly loss' : 'Weekly gain'}
                    value={`${weeklyLbs} lb / week`}
                  />
                ) : (
                  <SummaryRow
                    label="Calorie approach"
                    value="Slight deficit (~5% below maintenance)"
                  />
                )}
              </View>
            </View>
          )}

          <View style={styles.nav}>
            {step > 0 ? (
              <NeonButton
                title="Back"
                variant="ghost"
                onPress={() => setStep((s) => s - 1)}
                style={{ flex: 1 }}
              />
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {step < 4 ? (
              <NeonButton
                title="Next"
                onPress={() => setStep((s) => s + 1)}
                style={{ flex: 1, marginLeft: 12 }}
              />
            ) : (
              <NeonButton
                title="Get Fit!"
                onPress={finish}
                style={{ flex: 1, marginLeft: 12 }}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: retro.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  brand: {
    fontFamily: retroFonts.display,
    color: retro.neonPink,
    fontSize: 22,
    marginBottom: 20,
    letterSpacing: 2,
  },
  title: {
    fontFamily: retroFonts.display,
    color: retro.neonCyan,
    fontSize: 20,
    marginBottom: 8,
  },
  body: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    marginBottom: 16,
    lineHeight: 22,
  },
  label: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
  },
  input: {
    fontFamily: retroFonts.mono,
    borderWidth: 1,
    borderColor: retro.neonCyan,
    borderRadius: 8,
    padding: 12,
    color: retro.text,
    backgroundColor: retro.bgPanel,
  },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: retro.textMuted,
  },
  chipOn: {
    borderColor: retro.neonPink,
    backgroundColor: 'rgba(255,42,109,0.15)',
  },
  bigChip: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: retro.textMuted,
    marginTop: 8,
  },
  chipText: {
    fontFamily: retroFonts.mono,
    color: retro.text,
    textTransform: 'capitalize',
  },
  option: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: retro.neonCyan,
    marginBottom: 10,
    backgroundColor: retro.bgPanel,
  },
  optionOn: {
    borderColor: retro.neonPink,
    backgroundColor: 'rgba(255,42,109,0.12)',
  },
  optionText: { fontFamily: retroFonts.mono, color: retro.text },
  rateChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: retro.textMuted,
  },
  nav: {
    flexDirection: 'row',
    marginTop: 28,
    alignItems: 'center',
  },
  hint: {
    fontFamily: retroFonts.mono,
    color: retro.neonYellow,
    marginTop: 8,
    fontSize: 12,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: retro.neonCyan,
    borderRadius: 12,
    padding: 14,
    backgroundColor: retro.bgPanel,
  },
  summarySection: {
    fontFamily: retroFonts.display,
    color: retro.neonPink,
    fontSize: 14,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 6,
  },
  summarySectionFirst: {
    marginTop: 0,
  },
  summaryRow: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(5, 217, 232, 0.25)',
  },
  summaryLabel: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: retroFonts.mono,
    color: retro.text,
    fontSize: 15,
    lineHeight: 20,
  },
});
