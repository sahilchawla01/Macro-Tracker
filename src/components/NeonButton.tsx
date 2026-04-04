import { retro, retroFonts } from '@/src/theme/retro';
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type Props = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function NeonButton({
  title,
  variant = 'primary',
  style,
  textStyle,
  ...rest
}: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}>
      <Text
        allowFontScaling={false}
        style={[
          styles.text,
          variant === 'ghost' && styles.textGhost,
          textStyle,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  primary: {
    backgroundColor: 'rgba(255, 42, 109, 0.2)',
    borderColor: retro.neonPink,
  },
  secondary: {
    backgroundColor: 'rgba(5, 217, 232, 0.15)',
    borderColor: retro.neonCyan,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: retro.textMuted,
  },
  pressed: { opacity: 0.85 },
  text: {
    fontFamily: retroFonts.display,
    color: retro.text,
    fontSize: 14,
    letterSpacing: 1,
  },
  textGhost: {
    fontFamily: retroFonts.display,
    color: retro.textMuted,
    fontSize: 13,
    letterSpacing: 0.8,
  },
});
