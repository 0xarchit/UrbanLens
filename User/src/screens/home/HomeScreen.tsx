import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { IssueCard } from '../../components/issues/IssueCard';
import { useAuth } from '../../context/AuthContext';
import { issueService } from '../../services/issueService';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Issue } from '../../types';

const { width } = Dimensions.get('window');

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut, isDevMode } = useAuth();
  
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      checkLocationServices();
      fetchIssues();
    }, [user?.id, isDevMode])
  );

  const checkLocationServices = async () => {
    const enabled = await Location.hasServicesEnabledAsync();
    setLocationEnabled(enabled);
  };

  const fetchIssues = async () => {
    try {
      const userId = isDevMode ? undefined : user?.id;
      const response = await issueService.listIssues(1, 10, undefined, userId);
      setIssues(response.items);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const handleRefresh = () => {
    setRefreshing(true);
    fetchIssues();
  };

  const handleReportIssue = async () => {
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      setLocationEnabled(false);
      return;
    }
    navigation.navigate('Capture');
  };

  const handleIssuePress = (issue: Issue) => {
    navigation.navigate('IssueDetail', { issueId: issue.id });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Welcome back,</Text>
        <Text style={styles.userName}>
          {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Citizen'}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.profileButton} onPress={signOut}>
        <Ionicons name="person" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Card variant="gradient" style={styles.reportCard}>
        <View style={styles.reportCardContent}>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>Report an Issue</Text>
            <Text style={styles.reportSubtitle}>
              Capture a photo and let AI handle the rest
            </Text>
          </View>
          <Button
            title="Capture"
            onPress={handleReportIssue}
            size="md"
            icon={<Ionicons name="camera" size={18} color={colors.primary.contrast} />}
          />
        </View>
      </Card>
      
      {locationEnabled === false && (
        <Card style={styles.gpsWarning}>
          <Ionicons name="location" size={24} color={colors.status.warning} />
          <Text style={styles.gpsWarningText}>
            Location services are disabled. Enable GPS to report issues.
          </Text>
          <Button
            title="Open Settings"
            variant="outline"
            size="sm"
            onPress={() => Location.enableNetworkProviderAsync()}
          />
        </Card>
      )}
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{issues.length}</Text>
        <Text style={styles.statLabel}>My Reports</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>
          {issues.filter(i => i.state === 'resolved').length}
        </Text>
        <Text style={styles.statLabel}>Resolved</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>
          {issues.filter(i => ['assigned', 'in_progress'].includes(i.state)).length}
        </Text>
        <Text style={styles.statLabel}>In Progress</Text>
      </View>
    </View>
  );

  const renderRecentHeader = () => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Recent Reports</Text>
      <TouchableOpacity onPress={() => navigation.navigate('MyIssues')}>
        <Text style={styles.seeAllText}>See All</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <Card style={styles.emptyCard}>
      <Ionicons name="business-outline" size={48} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No Reports Yet</Text>
      <Text style={styles.emptyText}>
        Start making your city better by reporting your first issue!
      </Text>
    </Card>
  );

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary]}
      style={styles.container}
    >
      <FlatList
        data={issues.slice(0, 5)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <IssueCard issue={item} onPress={() => handleIssuePress(item)} />
        )}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderQuickActions()}
            {renderStats()}
            {issues.length > 0 && renderRecentHeader()}
          </>
        }
        ListEmptyComponent={!loading ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.xxl * 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {},
  greetingText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  userName: {
    ...typography.h2,
    color: colors.text.primary,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    marginBottom: spacing.xl,
  },
  reportCard: {
    marginBottom: spacing.md,
  },
  reportCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  reportTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  reportSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  gpsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.warning + '20',
    borderColor: colors.status.warning,
    padding: spacing.md,
    gap: spacing.sm,
  },
  gpsWarningText: {
    flex: 1,
    color: colors.status.warning,
    fontSize: 12,
    marginRight: spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  seeAllText: {
    color: colors.primary.main,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
