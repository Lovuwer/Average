import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, GLASS } from '../theme/glassMorphism';

interface TabItem {
  key: string;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { key: 'Dashboard', label: 'Home', icon: '🏠' },
  { key: 'Stats', label: 'Stats', icon: '📊' },
  { key: 'History', label: 'History', icon: '🕐' },
  { key: 'Settings', label: 'Settings', icon: '⚙️' },
];

interface BottomNavBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const TAB_WIDTH = 72;
const BAR_PADDING = 8;

const BottomNavBar: React.FC<BottomNavBarProps> = ({
  state,
  navigation,
}) => {
  const indicatorX = useSharedValue(state.index * TAB_WIDTH);

  React.useEffect(() => {
    indicatorX.value = withTiming(state.index * TAB_WIDTH, { duration: 250 });
  }, [state.index, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {/* Animated active indicator pill */}
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {TABS.map((tab, index) => {
          const isActive = state.index === index;
          return (
            <Pressable
              key={tab.key}
              style={styles.tab}
              onPress={() => {
                const route = state.routes[index];
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}>
              <Text style={[styles.icon, isActive && styles.iconActive]}>
                {tab.icon}
              </Text>
              <Text
                style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: `rgba(30,30,30,0.85)`,
    borderRadius: GLASS.buttonCornerRadius,
    paddingVertical: BAR_PADDING,
    paddingHorizontal: BAR_PADDING,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  indicator: {
    position: 'absolute',
    top: BAR_PADDING,
    left: BAR_PADDING,
    width: TAB_WIDTH,
    height: '100%',
    backgroundColor: `rgba(255,255,255,0.1)`,
    borderRadius: 20,
  },
  tab: {
    width: TAB_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  icon: {
    fontSize: 20,
    opacity: 0.6,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default BottomNavBar;
