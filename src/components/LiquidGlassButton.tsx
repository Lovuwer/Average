import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { GLASS, COLORS } from '../theme/glassMorphism';

interface LiquidGlassButtonProps {
  onPress: () => void;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  onPress,
  label,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 200 });
  };

  const isPrimary = variant === 'primary';
  const bgColor = isPrimary ? COLORS.primary : COLORS.surface;
  const textColor = isPrimary ? '#000000' : COLORS.text;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: bgColor,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>
          {icon ? `${icon} ` : ''}
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: GLASS.buttonCornerRadius,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `rgba(255,255,255,${GLASS.borderOpacity})`,
    minHeight: 52,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LiquidGlassButton;
