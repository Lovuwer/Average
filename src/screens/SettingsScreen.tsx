import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import { COLORS, SPACING } from '../theme/glassMorphism';
import { useSpeedStore } from '../store/useSpeedStore';
import { useAuthStore } from '../store/useAuthStore';

const SettingsScreen: React.FC = () => {
  const { speedUnit, toggleUnit } = useSpeedStore();
  const { user, logout } = useAuthStore();
  const [hudMode, setHudMode] = React.useState(false);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        {/* Speed unit toggle */}
        <LiquidGlassCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Speed Unit</Text>
              <Text style={styles.settingDesc}>
                Currently: {speedUnit === 'kmh' ? 'km/h' : 'mph'}
              </Text>
            </View>
            <LiquidGlassButton
              label={speedUnit === 'kmh' ? 'Switch to mph' : 'Switch to km/h'}
              variant="secondary"
              onPress={toggleUnit}
            />
          </View>
        </LiquidGlassCard>

        {/* HUD mode */}
        <LiquidGlassCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>HUD Mode</Text>
              <Text style={styles.settingDesc}>
                Mirror display for windshield reflection
              </Text>
            </View>
            <Switch
              value={hudMode}
              onValueChange={setHudMode}
              trackColor={{ false: '#333', true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </LiquidGlassCard>

        {/* Account */}
        <LiquidGlassCard style={styles.settingCard}>
          <Text style={styles.settingTitle}>Account</Text>
          <Text style={styles.settingDesc}>
            {user?.email || 'Not signed in'}
          </Text>
          {user && (
            <View style={styles.logoutButton}>
              <LiquidGlassButton
                label="Logout"
                variant="secondary"
                onPress={logout}
              />
            </View>
          )}
        </LiquidGlassCard>

        {/* About */}
        <LiquidGlassCard style={styles.settingCard}>
          <Text style={styles.settingTitle}>About</Text>
          <Text style={styles.settingDesc}>Average v0.1.0</Text>
          <Text style={styles.settingDesc}>Speed Tracking App</Text>
        </LiquidGlassCard>
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
  settingCard: {
    marginBottom: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    marginTop: SPACING.md,
  },
});

export default SettingsScreen;
