import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Pressable } from 'react-native';
import { useSpeedStore } from '../store/useSpeedStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { msToKmh, msToMph } from '../services/gps/SpeedEngine';

const HUDScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { currentSpeed, averageSpeed, speedUnit, primarySource } = useSpeedStore();
  const { hudColor } = useSettingsStore();
  const [lastTap, setLastTap] = useState(0);

  const convertSpeed = (ms: number) =>
    speedUnit === 'kmh' ? msToKmh(ms) : msToMph(ms);

  const unitLabel = speedUnit === 'kmh' ? 'km/h' : 'mph';
  const displaySpeed = Math.round(convertSpeed(currentSpeed));
  const displayAvg = convertSpeed(averageSpeed).toFixed(1);

  useEffect(() => {
    StatusBar.setHidden(true);
    return () => {
      StatusBar.setHidden(false);
    };
  }, []);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      navigation.goBack();
    }
    setLastTap(now);
  };

  return (
    <Pressable style={styles.container} onPress={handleTap}>
      <View style={styles.content}>
        <Text
          style={[
            styles.speed,
            { color: hudColor || '#00FF41', transform: [{ scaleX: -1 }] },
          ]}>
          {displaySpeed}
        </Text>
        <Text
          style={[
            styles.unit,
            { color: hudColor || '#00FF41', transform: [{ scaleX: -1 }] },
          ]}>
          {unitLabel}
        </Text>
        <Text
          style={[
            styles.avgSpeed,
            { transform: [{ scaleX: -1 }] },
          ]}>
          AVG {displayAvg} {unitLabel}
        </Text>
        {primarySource === 'dead_reckoning' && (
          <Text
            style={[
              styles.estLabel,
              { transform: [{ scaleX: -1 }] },
            ]}>
            EST
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  speed: {
    fontSize: 200,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 32,
    fontWeight: '400',
    marginTop: -20,
  },
  avgSpeed: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 20,
    fontWeight: '300',
  },
  estLabel: {
    fontSize: 16,
    color: '#FFD700',
    marginTop: 10,
    fontWeight: '500',
  },
});

export default HUDScreen;
