import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { config } from '../../config/env';

// Define navigation types since we are using useNavigation
type RootStackParamList = {
  Capture: undefined;
  MyIssues: undefined;
  Profile: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UserStats {
  total_reported: number;
  resolved: number;
  impact_score: number;
}

export function DashboardScreen() {
  const { user, signOut, session } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/issues/user/stats`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const StatCard = ({ label, value, icon, color }: { label: string, value: string | number, icon: any, color: string }) => (
    <View style={[styles.statCardContainer, { borderColor: color + '40' }]}>
      <BlurView intensity={20} tint="dark" style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </BlurView>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.background.gradient}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.username}>{user?.user_metadata?.full_name?.split(' ')[0] || 'User'}</Text>
            </View>
            <TouchableOpacity onPress={signOut} style={styles.profileButton}>
               <BlurView intensity={30} tint="dark" style={styles.profileIconBlur}>
                 <Ionicons name="person" size={20} color={colors.primary.light} />
               </BlurView>
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard 
              label="Impact Score" 
              value={stats?.impact_score || 0} 
              icon="flash" 
              color={colors.secondary.main} 
            />
            <StatCard 
              label="Issues Fixed" 
              value={stats?.resolved || 0} 
              icon="checkmark-circle" 
              color={colors.status.success} 
            />
             <StatCard 
              label="Reported" 
              value={stats?.total_reported || 0} 
              icon="megaphone" 
              color={colors.primary.main} 
            />
          </View>

          {/* Main Action - REPORT */}
          <TouchableOpacity 
            style={styles.mainAction}
            onPress={() => navigation.navigate('Capture')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.secondary.main, colors.secondary.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <Ionicons name="camera" size={32} color="white" />
              <Text style={styles.actionText}>Report New Issue</Text>
              <Ionicons name="arrow-forward" size={24} color="white" style={styles.actionArrow} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Links */}
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickLinks}>
            <TouchableOpacity 
              style={styles.linkCard} 
              onPress={() => navigation.navigate('MyIssues')}
            >
               <BlurView intensity={20} tint="dark" style={styles.linkContent}>
                  <Ionicons name="time" size={24} color={colors.primary.light} />
                  <Text style={styles.linkText}>History</Text>
               </BlurView>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkCard}
              onPress={() => navigation.navigate('Profile')}
            >
               <BlurView intensity={20} tint="dark" style={styles.linkContent}>
                  <Ionicons name="settings" size={24} color={colors.text.tertiary} />
                  <Text style={styles.linkText}>Settings</Text>
               </BlurView>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.caption,
    fontSize: 14,
    color: colors.text.secondary,
  },
  username: {
    ...typography.h1,
    fontSize: 28,
  },
  profileButton: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  profileIconBlur: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCardContainer: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
  },
  statCard: {
    padding: spacing.md,
    alignItems: 'center',
    height: 110,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h2,
    fontSize: 20,
    marginBottom: 2,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
    textAlign: 'center',
  },
  mainAction: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadows.glow,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingVertical: spacing.xl,
  },
  actionText: {
    ...typography.h3,
    color: 'white',
    flex: 1,
    marginLeft: spacing.md,
  },
  actionArrow: {
    opacity: 0.8,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    marginBottom: spacing.md,
    color: colors.text.secondary,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  linkCard: {
    flex: 1,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.accent,
  },
  linkContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
  },
  linkText: {
    ...typography.button,
    color: colors.text.primary,
  },
});
