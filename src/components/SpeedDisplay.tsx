import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  useDerivedValue,
} from 'react-native-reanimated';
import { COLORS } from '../theme/glassMorphism';

interface SpeedDisplayProps {
  speed: number;
  unitLabel: string;
  onToggleUnit: () => void;
}

const SpeedDisplay: React.FC<SpeedDisplayProps> = ({
  speed,
  unitLabel,
  onToggleUnit,
}) => {
  const displaySpeed = Math.round(speed);

  const getSpeedColor = (s: number): string => {
    if (s < 60) {
      return COLORS.speedSafe;
    }
    if (s < 120) {
      return COLORS.speedModerate;
    }
    return COLORS.speedHigh;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.speed, { color: getSpeedColor(displaySpeed) }]}>
        {displaySpeed}
      </Text>
      <Pressable onPress={onToggleUnit}>
        <Text style={styles.unit}>{unitLabel}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  speed: {
    fontSize: 120,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: -8,
  },
});

export default SpeedDisplay;
