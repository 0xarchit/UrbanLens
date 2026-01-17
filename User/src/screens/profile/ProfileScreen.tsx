import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors, spacing, typography, borderRadius } from '../../theme';

export function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const menuItems: { iconName: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; value?: string }[] = [
    { iconName: 'notifications-outline', label: 'Notifications', onPress: () => {} },
    { iconName: 'moon-outline', label: 'Dark Mode', onPress: () => {}, value: 'On' },
    { iconName: 'location-outline', label: 'Location Settings', onPress: () => Linking.openSettings() },
    { iconName: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
    { iconName: 'document-text-outline', label: 'Terms of Service', onPress: () => {} },
    { iconName: 'lock-closed-outline', label: 'Privacy Policy', onPress: () => {} },
  ];

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary]}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user?.user_metadata?.avatar_url ? (
              <Image 
                source={{ uri: user.user_metadata.avatar_url }} 
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={colors.text.tertiary} />
              </View>
            )}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={14} color={colors.primary.contrast} />
            </View>
          </View>
          
          <Text style={styles.userName}>
            {user?.user_metadata?.full_name || 'Citizen'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Reports</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>95%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
        </View>
        
        <Card variant="gradient" style={styles.badgeCard}>
          <View style={styles.badgeCardContent}>
            <View style={styles.badgeInfo}>
              <Ionicons name="trophy" size={32} color={colors.status.warning} />
              <View style={styles.badgeTextContainer}>
                <Text style={styles.badgeTitle}>Civic Champion</Text>
                <Text style={styles.badgeSubtitle}>Top 10% contributor in your area</Text>
              </View>
            </View>
          </View>
        </Card>
        
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Card>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && styles.menuItemBorder,
                ]}
                onPress={item.onPress}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name={item.iconName} size={20} color={colors.text.secondary} />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </View>
                <View style={styles.menuRight}>
                  {item.value ? (
                    <Text style={styles.menuValue}>{item.value}</Text>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        </View>
        
        <View style={styles.signOutSection}>
          <Button
            title="Sign Out"
            variant="outline"
            onPress={handleSignOut}
            fullWidth
          />
        </View>
        
        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary.main,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary.main,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background.primary,
  },
  userName: {
    ...typography.h2,
    color: colors.text.primary,
  },
  userEmail: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.primary.main,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
  },
  badgeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  badgeCardContent: {},
  badgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badgeTextContainer: {
    flex: 1,
  },
  badgeTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  badgeSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  menuSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuValue: {
    ...typography.body,
    color: colors.text.secondary,
  },
  signOutSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  version: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
});
