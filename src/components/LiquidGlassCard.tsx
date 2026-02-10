import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { GLASS, COLORS } from '../theme/glassMorphism';

interface LiquidGlassCardProps {
  children: React.ReactNode;
  cornerRadius?: number;
  blurAmount?: number;
  style?: ViewStyle;
  padding?: number;
  tintColor?: string;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  cornerRadius = GLASS.cornerRadius,
  style,
  padding = 16,
  tintColor,
  onPress,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withTiming(0.98, { duration: 150 });
    }
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 200 });
  };

  const containerStyle: ViewStyle = {
    borderRadius: cornerRadius,
    padding,
    backgroundColor: tintColor
      ? `${tintColor}18`
      : `rgba(255,255,255,${GLASS.backgroundOpacity})`,
    borderWidth: 1,
    borderColor: `rgba(255,255,255,${GLASS.borderOpacity})`,
    overflow: 'hidden',
  };

  const content = (
    <>
      {/* Highlight gradient overlay */}
      <View style={[styles.highlight, { borderRadius: cornerRadius }]} />
      {/* Inner shadow for depth */}
      <View style={[styles.innerShadow, { borderRadius: cornerRadius }]} />
      {children}
    </>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[containerStyle, animatedStyle, style]}>
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={[containerStyle, animatedStyle, style]}>
      {content}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  highlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `rgba(255,255,255,${GLASS.highlightOpacity})`,
    opacity: 0.5,
    zIndex: -1,
  },
  innerShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
    zIndex: -1,
  },
});

export default LiquidGlassCard;
