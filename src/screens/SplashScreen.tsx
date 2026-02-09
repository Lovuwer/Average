import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { SecurityGate } from '../services/security/SecurityGate';
import { useAuthStore } from '../store/useAuthStore';

type SplashNav = StackNavigationProp<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashNav>();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    const initialize = async () => {
      // Run security checks
      const securityResult = SecurityGate.check();
      if (!securityResult.safe) {
        // In production, show error and close app
        console.warn('Security check failed:', securityResult.reasons);
      }

      // Check authentication state
      const isAuthenticated = await checkAuth();

      // Navigate based on auth state
      setTimeout(() => {
        if (isAuthenticated) {
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
      }, 1500);
    };

    initialize();
  }, [navigation, checkAuth]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Average</Text>
      <Text style={styles.subtitle}>Speed Tracker</Text>
      <ActivityIndicator
        size="large"
        color="#e94560"
        style={styles.loader}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f23',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
});

export default SplashScreen;
