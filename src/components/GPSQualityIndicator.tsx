import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

interface GPSQualityIndicatorProps {
  accuracy: number | null;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
}

const GPSQualityIndicator: React.FC<GPSQualityIndicatorProps> = ({
  accuracy,
  quality,
}) => {
  const [showAccuracy, setShowAccuracy] = React.useState(false);

  const getBars = (): number => {
    switch (quality) {
      case 'excellent': return 4;
      case 'good': return 3;
      case 'fair': return 2;
      case 'poor': return 1;
      default: return 0;
    }
  };

  const getColor = (): string => {
    switch (quality) {
      case 'excellent':
      case 'good':
        return '#44FF88';
      case 'fair':
        return '#FFCC00';
      case 'poor':
        return '#FF4444';
      default:
        return '#666666';
    }
  };

  const bars = getBars();
  const color = getColor();

  return (
    <Pressable
      onLongPress={() => setShowAccuracy(!showAccuracy)}
      style={styles.container}
      testID="gps-quality-indicator">
      <View style={styles.barsContainer}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            testID={`gps-bar-${i}`}
            style={[
              styles.bar,
              {
                height: 4 + i * 4,
                backgroundColor: i <= bars ? color : '#333333',
              },
            ]}
          />
        ))}
      </View>
      {showAccuracy && accuracy !== null && (
        <Text style={styles.accuracyText}>{Math.round(accuracy)}m</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
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
  accuracyText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 4,
  },
});

export default GPSQualityIndicator;
