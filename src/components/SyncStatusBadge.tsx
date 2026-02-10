import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

interface SyncStatusBadgeProps {
  pending: number;
  isOnline: boolean;
  lastSyncAt: number | null;
  onPress?: () => void;
}

const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  pending,
  isOnline,
  lastSyncAt,
  onPress,
}) => {
  const getColor = (): string => {
    if (!isOnline) return '#FF4444';
    if (pending > 0) return '#FFCC00';
    return '#44FF88';
  };

  const getLabel = (): string => {
    if (!isOnline) return 'Offline';
    if (pending > 0) return `${pending} pending`;
    return 'Synced';
  };

  return (
    <Pressable onPress={onPress} style={styles.container} testID="sync-status-badge">
      <View style={[styles.dot, { backgroundColor: getColor() }]} />
      <Text style={styles.label}>{getLabel()}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
});

export default SyncStatusBadge;
