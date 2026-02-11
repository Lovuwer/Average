import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '../theme/glassMorphism';

interface SensorStatusIndicatorProps {
  gpsAccuracy: number | null;
  confidence: 'low' | 'medium' | 'high';
  motionState: string;
  primarySource: string;
  sensorHealth: {
    gps: boolean;
    accelerometer: boolean;
    gyroscope: boolean;
    pedometer: boolean;
    barometer: boolean;
  };
}

const SensorStatusIndicator: React.FC<SensorStatusIndicatorProps> = ({
  gpsAccuracy,
  confidence,
  motionState,
  primarySource,
  sensorHealth,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getGpsBars = (): number => {
    if (gpsAccuracy === null || !sensorHealth.gps) return 0;
    if (gpsAccuracy < 5) return 4;
    if (gpsAccuracy < 10) return 3;
    if (gpsAccuracy < 20) return 2;
    if (gpsAccuracy < 50) return 1;
    return 0;
  };

  const getGpsColor = (): string => {
    const bars = getGpsBars();
    if (bars >= 3) return COLORS.speedSafe;
    if (bars >= 2) return COLORS.speedModerate;
    return COLORS.speedDanger;
  };

  const getConfidenceColor = (): string => {
    switch (confidence) {
      case 'high': return COLORS.speedSafe;
      case 'medium': return COLORS.speedModerate;
      case 'low': return COLORS.speedDanger;
      default: return COLORS.speedDanger;
    }
  };

  const bars = getGpsBars();
  const gpsColor = getGpsColor();
  const showPedometer = (motionState === 'walking' || motionState === 'running') && sensorHealth.pedometer;

  return (
    <Pressable
      onLongPress={() => setShowDetails(!showDetails)}
      testID="sensor-status-indicator"
    >
      <View style={styles.container}>
        {/* GPS Signal Bars */}
        <View style={styles.barsContainer} testID="gps-bars">
          {[1, 2, 3, 4].map((level) => (
            <View
              key={level}
              style={[
                styles.bar,
                { height: 4 + level * 3 },
                { backgroundColor: level <= bars ? gpsColor : 'rgba(255,255,255,0.15)' },
              ]}
            />
          ))}
        </View>

        {/* Sensor dots */}
        <View style={styles.dotsContainer}>
          {sensorHealth.accelerometer && (
            <View
              style={[styles.sensorDot, { backgroundColor: COLORS.speedSafe }]}
              testID="accel-dot"
            />
          )}
          {showPedometer && (
            <View
              style={[styles.sensorDot, { backgroundColor: COLORS.speedSafe }]}
              testID="pedometer-dot"
            />
          )}
        </View>

        {/* Confidence indicator */}
        <View
          style={[styles.confidenceDot, { backgroundColor: getConfidenceColor() }]}
          testID="confidence-dot"
        />
      </View>

      {/* Debug info on long press */}
      {showDetails && (
        <View style={styles.detailsContainer} testID="details-panel">
          <Text style={styles.detailText}>
            {gpsAccuracy !== null ? `${gpsAccuracy.toFixed(0)}m` : 'No GPS'} • {primarySource}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 4,
    borderRadius: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 2,
  },
  sensorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
  },
  detailsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 100,
  },
  detailText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});

export default SensorStatusIndicator;
