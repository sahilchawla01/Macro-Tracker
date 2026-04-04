import { retro } from '@/src/theme/retro';
import { StyleSheet, View, type ViewProps } from 'react-native';

export function NeonCard({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: retro.bgPanel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: retro.neonCyan,
    padding: 16,
    shadowColor: retro.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});
