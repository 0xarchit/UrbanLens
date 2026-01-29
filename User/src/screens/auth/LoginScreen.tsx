import React from "react";
import { View, Text, StyleSheet, Dimensions, StatusBar, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { colors, spacing, typography, borderRadius } from "../../theme";

const { width, height } = Dimensions.get("window");

export function LoginScreen() {
  const { signInWithGoogle, continueWithDevMode, loading, configError } =
    useAuth();

  return (
    <LinearGradient
      colors={[
        colors.background.primary, // #F8FAFC
        "#F1F5F9", // Slate-100
        colors.background.secondary, // #E2E8F0
      ]}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />

      {/* Decorative Blur Circles */}
      <View style={[styles.decorCircle, { top: -100, right: -100, backgroundColor: colors.primary.main + "08", width: 400, height: 400, borderRadius: 200 }]} />
      <View style={[styles.decorCircle, { bottom: 0, left: -50, backgroundColor: colors.secondary.main + "08", width: 300, height: 300, borderRadius: 150 }]} />

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
             <LinearGradient
              colors={[colors.primary.main, colors.primary.dark]}
              style={styles.logoBadge}
            >
              <Text style={styles.logoText}>U</Text>
            </LinearGradient>
            <View>
              <Text style={styles.brandTitle}>Urban<Text style={{color: colors.primary.main}}>Lens</Text></Text>
              <Text style={styles.brandSubtitle}>City Issue Reporter</Text>
            </View>
          </View>

          <Text style={styles.heroText}>
            Building a Better City,{"\n"}
            <Text style={{color: colors.primary.main}}>Together.</Text>
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureItem 
            icon="camera" 
            color={colors.primary.main} 
            title="Snap & Report" 
            desc="Take a photo, AI handles the details" 
          />
          <FeatureItem 
            icon="flash" 
            color="#F59E0B" 
            title="Instant Routing" 
            desc="Auto-assigned to the right team" 
          />
          <FeatureItem 
            icon="shield-checkmark" 
            color="#10B981" 
            title="Verified Resolution" 
            desc="Track progress in real-time" 
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue with Google"
          onPress={signInWithGoogle}
          loading={loading}
          disabled={!!configError}
          fullWidth
          size="lg"
          variant="primary"
          style={styles.googleButton}
          icon={
            <Ionicons
              name="logo-google"
              size={20}
              color="#FFF"
            />
          }
        />

        <Button
          title="Continue with Dev Mode"
          variant="ghost"
          onPress={continueWithDevMode}
          fullWidth
          size="sm"
          style={{ marginTop: spacing.md }}
          textStyle={{ color: colors.text.tertiary }}
        />

        <Text style={styles.versionText}>
          v1.2.0 • UrbanLens Public Beta
        </Text>
      </View>
    </LinearGradient>
  );
}

const FeatureItem = ({ icon, color, title, desc }: any) => (
  <View style={styles.feature}>
    <View style={[styles.featureIcon, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon as any} size={24} color={color} />
    </View>
    <View style={styles.featureText}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorCircle: {
    position: "absolute",
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 80, // Increased top padding
  },
  headerSection: {
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text.primary,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  heroText: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.text.primary,
    lineHeight: 40,
    letterSpacing: -1,
  },
  features: {
    gap: spacing.lg,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xl,
  },
  googleButton: {
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  versionText: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
