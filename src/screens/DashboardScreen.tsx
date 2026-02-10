import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSpeed } from '../hooks/useSpeed';
import SpeedDisplay from '../components/SpeedDisplay';
import SpeedGauge from '../components/SpeedGauge';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import GPSQualityIndicator from '../components/GPSQualityIndicator';
import { COLORS, SPACING } from '../theme/glassMorphism';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m
    .toString()
    .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const DashboardScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const {
    currentSpeed,
    averageSpeed,
    maxSpeed,
    distance,
    duration,
    isTracking,
    isPaused,
    unitLabel,
    distanceLabel,
    startTrip,
    stopTrip,
    pauseTrip,
    resumeTrip,
    toggleUnit,
  } = useSpeed();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Top bar: GPS quality + HUD button */}
        <View style={styles.topBar}>
          <GPSQualityIndicator accuracy={null} quality="none" />
          {isTracking && (
            <Pressable
              onPress={() => navigation?.navigate('HUD')}
              style={styles.hudButton}
              testID="hud-button">
              <Text style={styles.hudButtonText}>HUD</Text>
            </Pressable>
          )}
        </View>

        {/* Trip timer */}
        <Text style={styles.timer}>{formatDuration(duration)}</Text>

        {/* Speed gauge + display */}
        <View style={styles.gaugeContainer}>
          <SpeedGauge speed={currentSpeed} />
          <View style={styles.speedOverlay}>
            <SpeedDisplay
              speed={currentSpeed}
              unitLabel={unitLabel}
              onToggleUnit={toggleUnit}
            />
          </View>
        </View>

        {/* Metric cards */}
        <View style={styles.metricsRow}>
          <LiquidGlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg</Text>
            <Text style={styles.metricValue}>
              {averageSpeed.toFixed(1)}
            </Text>
            <Text style={styles.metricUnit}>{unitLabel}</Text>
          </LiquidGlassCard>

          <LiquidGlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Max</Text>
            <Text style={styles.metricValue}>
              {maxSpeed.toFixed(1)}
            </Text>
            <Text style={styles.metricUnit}>{unitLabel}</Text>
          </LiquidGlassCard>
        </View>

        <View style={styles.metricsRow}>
          <LiquidGlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Distance</Text>
            <Text style={styles.metricValue}>
              {distance.toFixed(2)}
            </Text>
            <Text style={styles.metricUnit}>{distanceLabel}</Text>
          </LiquidGlassCard>

          <View style={styles.metricCard}>
            {!isTracking ? (
              <LiquidGlassButton
                label="START"
                icon="▶"
                variant="primary"
                onPress={startTrip}
              />
            ) : isPaused ? (
              <View style={styles.buttonGroup}>
                <LiquidGlassButton
                  label="RESUME"
                  variant="primary"
                  onPress={resumeTrip}
                />
                <View style={styles.buttonSpacer} />
                <LiquidGlassButton
                  label="STOP"
                  variant="secondary"
                  onPress={stopTrip}
                />
              </View>
            ) : (
              <View style={styles.buttonGroup}>
                <LiquidGlassButton
                  label="PAUSE"
                  icon="⏸"
                  variant="secondary"
                  onPress={pauseTrip}
                />
                <View style={styles.buttonSpacer} />
                <LiquidGlassButton
                  label="STOP"
                  icon="⏹"
                  variant="secondary"
                  onPress={stopTrip}
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.sm,
  },
  hudButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  hudButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  timer: {
    fontSize: 20,
    fontWeight: '300',
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
    marginBottom: SPACING.md,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.lg,
  },
  speedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  metricUnit: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  buttonGroup: {
    width: '100%',
    gap: 8,
  },
  buttonSpacer: {
    height: 4,
  },
});

export default DashboardScreen;
