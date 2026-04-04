import { retro, retroFonts } from '@/src/theme/retro';
import { StyleSheet, Text, View } from 'react-native';

type TrackProps = {
  value: number;
  max: number;
  color?: string;
};

/** Bar only — headers/footers handled by the screen. */
export function NeonProgressTrack({
  value,
  max,
  color = retro.neonCyan,
}: TrackProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(1, Math.max(0, value / safeMax));

  return (
    <View style={trackStyles.track}>
      <View
        style={[
          trackStyles.fill,
          { width: `${pct * 100}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

type Props = {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: string;
};

export function RetroProgressBar({
  label,
  value,
  max,
  unit = '',
  color = retro.neonCyan,
}: Props) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(1, Math.max(0, value / safeMax));

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.numbers}>
          {formatNum(value)}
          {unit ? ` ${unit}` : ''} / {formatNum(max)}
          {unit ? ` ${unit}` : ''}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

const trackStyles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: retro.neonCyan,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: retroFonts.mono,
    color: retro.textMuted,
    fontSize: 13,
  },
  numbers: {
    fontFamily: retroFonts.mono,
    color: retro.text,
    fontSize: 13,
    fontWeight: '600',
  },
  track: {
    height: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: retro.neonCyan,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
