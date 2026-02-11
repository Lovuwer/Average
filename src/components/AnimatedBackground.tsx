/**
 * AnimatedBackground.tsx
 * 
 * React Native adaptation of cnrad.dev's sun-ray background effect.
 * Reference: https://github.com/cnrad/cnrad.dev/blob/e35a4b376a15ed24874542c25c5812b24a83e8dc/src/pages/_app.tsx#L93-L129
 * 
 * Creates an elegant, subtle, ambient light-ray effect with:
 * - Horizontal gradient from subtle white on left to dark on right
 * - 3 large animated bars that slowly sway (rotate 28deg ↔ 31deg)
 * - Each bar has different animation duration (6s, 7s, 8s) for organic feel
 * - Positioned at different vertical offsets for depth
 * - Opacity 0.15 to avoid overpowering the UI
 * - Fades in from 0 → 0.15 over 2 seconds on mount
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { COLORS, ANIMATION } from '../theme/glassMorphism';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RayBarProps {
  top: number;
  height: number;
  duration: number;
}

const RayBar: React.FC<RayBarProps> = ({ top, height, duration }) => {
  const rotation = useSharedValue(28);

  useEffect(() => {
    // Sway animation: rotate between 28deg and 31deg
    rotation.value = withRepeat(
      withTiming(31, {
        duration: duration * 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [duration, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.rayBar,
        {
          top: `${top}%`,
          height,
        },
        animatedStyle,
      ]}
    />
  );
};

const AnimatedBackground: React.FC = () => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Fade in the background over 2 seconds
    opacity.value = withTiming(ANIMATION.backgroundOverlayOpacity, {
      duration: 2000,
      easing: Easing.out(Easing.ease),
    });
  }, [opacity]);

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <LinearGradient
        colors={[COLORS.rayGradientStart, COLORS.rayGradientEnd]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      >
        {/* 3 animated ray bars with different sizes and animation timings */}
        <RayBar top={20} height={40} duration={6} />
        <RayBar top={40} height={60} duration={7} />
        <RayBar top={60} height={80} duration={8} />
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -3,
  },
  gradient: {
    width: '100%',
    height: '100%',
  },
  rayBar: {
    position: 'absolute',
    width: SCREEN_WIDTH * 2, // Extends off screen
    backgroundColor: COLORS.rayColor,
    left: -SCREEN_WIDTH / 2,
  },
});

export default AnimatedBackground;
