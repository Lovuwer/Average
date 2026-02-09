import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../theme/glassMorphism';

interface SpeedGaugeProps {
  speed: number;
  maxRange?: number;
  size?: number;
}

const SpeedGauge: React.FC<SpeedGaugeProps> = ({
  speed,
  maxRange = 200,
  size = 280,
}) => {
  const progress = Math.min(speed / maxRange, 1);
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc spans 270 degrees (3/4 of circle)
  const arcLength = circumference * 0.75;
  const filledLength = arcLength * progress;

  const getGaugeColor = (): string => {
    if (progress < 0.3) {
      return COLORS.speedSafe;
    }
    if (progress < 0.6) {
      return COLORS.speedModerate;
    }
    return COLORS.speedHigh;
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background arc */}
      <View
        style={[
          styles.arcBackground,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
          },
        ]}
      />
      {/* Filled arc indicator — simplified as a border approach */}
      <View
        style={[
          styles.arcFilled,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: getGaugeColor(),
            opacity: 0.3 + progress * 0.7,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcBackground: {
    position: 'absolute',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  arcFilled: {
    position: 'absolute',
  },
});

export default SpeedGauge;
