import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import LiquidGlassCard from '../components/LiquidGlassCard';
import { COLORS, SPACING } from '../theme/glassMorphism';
import { tripManager, StoredTrip } from '../services/trip/TripManager';
import { msToKmh, metersToKm } from '../services/gps/SpeedEngine';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const HistoryScreen: React.FC = () => {
  const [trips, setTrips] = useState<StoredTrip[]>([]);

  useEffect(() => {
    tripManager.getTripHistory().then(setTrips);
  }, []);

  const renderTrip = ({ item }: { item: StoredTrip }) => (
    <LiquidGlassCard style={styles.tripCard}>
      <Text style={styles.tripDate}>{formatDate(item.startTime)}</Text>
      <View style={styles.tripDetails}>
        <View style={styles.tripStat}>
          <Text style={styles.statValue}>
            {formatDuration(item.duration)}
          </Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.tripStat}>
          <Text style={styles.statValue}>
            {msToKmh(item.avgSpeed).toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Avg km/h</Text>
        </View>
        <View style={styles.tripStat}>
          <Text style={styles.statValue}>
            {metersToKm(item.distance).toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>km</Text>
        </View>
        <View style={styles.tripStat}>
          <Text style={styles.statValue}>
            {msToKmh(item.maxSpeed).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Max km/h</Text>
        </View>
      </View>
    </LiquidGlassCard>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={renderTrip}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No trips yet</Text>
            <Text style={styles.emptySubtext}>
              Start your first trip from the Dashboard
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
  },
  tripCard: {
    marginBottom: SPACING.md,
  },
  tripDate: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 20,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});

export default HistoryScreen;
