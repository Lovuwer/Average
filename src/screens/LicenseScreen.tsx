import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import { COLORS, SPACING } from '../theme/glassMorphism';
import { licenseService } from '../services/license/LicenseService';

const LicenseScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatKey = (text: string): string => {
    const clean = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const groups = clean.match(/.{1,4}/g) || [];
    return groups.join('-').substring(0, 19); // XXXX-XXXX-XXXX-XXXX
  };

  const handleKeyChange = (text: string) => {
    setLicenseKey(formatKey(text));
    setError(null);
  };

  const isValidFormat = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey);

  const handleActivate = async () => {
    setLoading(true);
    setError(null);
    try {
      await licenseService.activateLicense(licenseKey);
      navigation.replace('Main');
    } catch (err: any) {
      setError(err.message || 'Invalid license key');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueFree = () => {
    navigation.replace('Main');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activate License</Text>
      <Text style={styles.subtitle}>Enter your license key to unlock all features</Text>

      <LiquidGlassCard style={styles.card}>
        <TextInput
          style={styles.input}
          value={licenseKey}
          onChangeText={handleKeyChange}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          placeholderTextColor="rgba(255,255,255,0.3)"
          autoCapitalize="characters"
          maxLength={19}
          testID="license-input"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.buttonContainer}>
          <LiquidGlassButton
            label={loading ? 'Activating...' : 'Activate'}
            variant="primary"
            onPress={handleActivate}
            disabled={!isValidFormat || loading}
          />
        </View>

        {loading && <ActivityIndicator color={COLORS.primary} style={styles.loader} />}
      </LiquidGlassCard>

      <View style={styles.freeButton}>
        <LiquidGlassButton
          label="Continue with Free Tier"
          variant="secondary"
          onPress={handleContinueFree}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  card: {
    padding: SPACING.lg,
  },
  input: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 2,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    fontVariant: ['tabular-nums'],
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  buttonContainer: {
    marginTop: SPACING.lg,
  },
  loader: {
    marginTop: SPACING.md,
  },
  freeButton: {
    marginTop: SPACING.lg,
  },
});

export default LicenseScreen;
