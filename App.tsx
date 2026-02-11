import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import AnimatedBackground from './src/components/AnimatedBackground';
import { COLORS } from './src/theme/glassMorphism';

const App: React.FC = () => {
  return (
    <View style={styles.container}>
      <AnimatedBackground />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

export default App;
