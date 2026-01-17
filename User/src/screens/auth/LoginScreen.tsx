import React from 'react';
import { View, Text, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme';

const { width, height } = Dimensions.get('window');

export function LoginScreen() {
  const { signInWithGoogle, continueWithDevMode, loading } = useAuth();

  return (
    <LinearGradient
      colors={[colors.background.primary, '#1a1a2e', colors.background.secondary]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[colors.primary.light, colors.primary.dark]}
            style={styles.logoGradient}
          >
            <Ionicons name="business" size={48} color={colors.text.primary} />
          </LinearGradient>
        </View>
        
        <Text style={styles.title}>City Issue Reporter</Text>
        <Text style={styles.subtitle}>
          Be the eyes of your city. Report issues instantly and track their resolution in real-time.
        </Text>
        
        <View style={styles.features}>
          <View style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: colors.accent.cyan + '20' }]}>
              <Ionicons name="camera" size={24} color={colors.accent.cyan} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Snap & Report</Text>
              <Text style={styles.featureDesc}>Take a photo and AI handles the rest</Text>
            </View>
          </View>
          
          <View style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: colors.secondary.main + '20' }]}>
              <Ionicons name="sparkles" size={24} color={colors.secondary.main} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>AI-Powered</Text>
              <Text style={styles.featureDesc}>Automatic classification & routing</Text>
            </View>
          </View>
          
          <View style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: colors.accent.purple + '20' }]}>
              <Ionicons name="location" size={24} color={colors.accent.purple} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Real-Time Tracking</Text>
              <Text style={styles.featureDesc}>Watch your issue get resolved live</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Button
          title="Continue with Google"
          onPress={signInWithGoogle}
          loading={loading}
          fullWidth
          size="lg"
          icon={<Ionicons name="logo-google" size={20} color={colors.primary.contrast} />}
        />
        
        <Button
          title="Continue with Dev Mode"
          variant="outline"
          onPress={continueWithDevMode}
          fullWidth
          size="md"
          style={{ marginTop: spacing.md }}
        />
        
        <Text style={styles.devNote}>
          Production Beta - Dev Mode available for testing
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary.main + '10',
    top: -100,
    right: -100,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.secondary.main + '10',
    bottom: 200,
    left: -80,
  },
  decorCircle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.accent.purple + '10',
    top: 300,
    right: -50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  features: {
    marginTop: spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  featureTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  featureDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  devNote: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
