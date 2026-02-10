import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import LiquidGlassCard from '../components/LiquidGlassCard';
import { COLORS, SPACING } from '../theme/glassMorphism';
import { tripManager, StoredTrip } from '../services/trip/TripManager';
import { msToKmh, metersToKm } from '../services/gps/SpeedEngine';
import { useSpeedStore } from '../store/useSpeedStore';

const StatsScreen: React.FC = () => {
  const [trips, setTrips] = useState<StoredTrip[]>([]);
  const { speedHistory, isTracking } = useSpeedStore();

  useEffect(() => {
    tripManager.getTripHistory().then(setTrips);
  }, []);

  const totalTrips = trips.length;
  const totalDistance = trips.reduce((sum, t) => sum + t.distance, 0);
  const avgOfAverages =
    totalTrips > 0
      ? trips.reduce((sum, t) => sum + t.avgSpeed, 0) / totalTrips
      : 0;

  // Simple sparkline from speed history
  const maxHist = Math.max(...(speedHistory.length > 0 ? speedHistory : [1]));

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Statistics</Text>

        {/* Live speed chart (sparkline) */}
        <LiquidGlassCard style={styles.chartCard}>
          <Text style={styles.cardTitle}>
            {isTracking ? 'Live Speed' : 'Last Trip Speed'}
          </Text>
          <View style={styles.sparkline}>
            {speedHistory.slice(-30).map((val, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: Math.max(2, (val / (maxHist || 1)) * 80),
                    backgroundColor:
                      val / (maxHist || 1) > 0.7
                        ? COLORS.speedHigh
                        : val / (maxHist || 1) > 0.4
                        ? COLORS.speedModerate
                        : COLORS.speedSafe,
                  },
                ]}
              />
            ))}
          </View>
        </LiquidGlassCard>

        {/* Summary stats */}
        <View style={styles.statsRow}>
          <LiquidGlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </LiquidGlassCard>

          <LiquidGlassCard style={styles.statCard}>
            <Text style={styles.statValue}>
              {metersToKm(totalDistance).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Total km</Text>
          </LiquidGlassCard>
        </View>

        <View style={styles.statsRow}>
          <LiquidGlassCard style={styles.statCard}>
            <Text style={styles.statValue}>
              {msToKmh(avgOfAverages).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Avg Speed (km/h)</Text>
          </LiquidGlassCard>
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
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  chartCard: {
    marginBottom: SPACING.md,
    minHeight: 140,
  },
  cardTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default StatsScreen;
