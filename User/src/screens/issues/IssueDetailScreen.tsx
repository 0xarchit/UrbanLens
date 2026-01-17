import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { issueService } from '../../services/issueService';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Issue } from '../../types';

const { width } = Dimensions.get('window');

type IssueDetailRouteParams = {
  IssueDetail: {
    issueId: string;
  };
};

const priorityConfig: Record<number, { color: string; label: string }> = {
  1: { color: colors.priority.critical, label: 'CRITICAL' },
  2: { color: colors.priority.high, label: 'HIGH' },
  3: { color: colors.priority.medium, label: 'MEDIUM' },
  4: { color: colors.priority.low, label: 'LOW' },
};

const stateConfig: Record<string, { color: string; label: string; iconName: keyof typeof Ionicons.glyphMap }> = {
  reported: { color: colors.status.info, label: 'Reported', iconName: 'document-text' },
  validated: { color: colors.accent.purple, label: 'Validated', iconName: 'checkmark-circle' },
  assigned: { color: colors.accent.cyan, label: 'Assigned', iconName: 'person' },
  in_progress: { color: colors.status.warning, label: 'In Progress', iconName: 'construct' },
  resolved: { color: colors.status.success, label: 'Resolved', iconName: 'checkmark-done-circle' },
  closed: { color: colors.text.tertiary, label: 'Closed', iconName: 'archive' },
  rejected: { color: colors.status.error, label: 'Rejected', iconName: 'close-circle' },
};

export function IssueDetailScreen() {
  const route = useRoute<RouteProp<IssueDetailRouteParams, 'IssueDetail'>>();
  const navigation = useNavigation();
  
  const { issueId } = route.params;
  
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showAnnotated, setShowAnnotated] = useState(true);

  useEffect(() => {
    fetchIssue();
  }, [issueId]);

  const fetchIssue = async () => {
    try {
      const data = await issueService.getIssue(issueId);
      setIssue(data);
    } catch (error) {
      console.error('Failed to fetch issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (!issue) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="sad-outline" size={64} color={colors.text.tertiary} />
        <Text style={styles.errorText}>Issue not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const priorityInfo = issue.priority ? priorityConfig[issue.priority] : null;
  const stateInfo = stateConfig[issue.state] || stateConfig.reported;
  const displayImages = showAnnotated && issue.annotated_urls.length > 0 
    ? issue.annotated_urls 
    : issue.image_urls;

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary]}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {displayImages.length > 0 ? (
            <Image
              source={{ uri: displayImages[activeImage] }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.mainImage, styles.placeholderImage]}>
              <Ionicons name="camera" size={48} color={colors.text.tertiary} />
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageGradient}
          />
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          
          {issue.annotated_urls.length > 0 && (
            <View style={styles.imageToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, !showAnnotated && styles.toggleActive]}
                onPress={() => setShowAnnotated(false)}
              >
                <Text style={styles.toggleText}>Original</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, showAnnotated && styles.toggleActive]}
                onPress={() => setShowAnnotated(true)}
              >
                <Text style={styles.toggleText}>AI View</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <View style={styles.content}>
          <View style={styles.badges}>
            {priorityInfo ? (
              <View style={[styles.badge, { backgroundColor: priorityInfo.color }]}>
                <Text style={styles.badgeText}>{priorityInfo.label}</Text>
              </View>
            ) : null}
            <View style={[styles.badge, styles.stateBadge, { borderColor: stateInfo.color }]}>
              <Ionicons name={stateInfo.iconName} size={14} color={stateInfo.color} />
              <Text style={[styles.badgeText, { color: stateInfo.color }]}>
                {stateInfo.label}
              </Text>
            </View>
          </View>
          
          {issue.category ? (
            <Text style={styles.category}>{issue.category}</Text>
          ) : null}
          
          {issue.confidence !== undefined && issue.confidence !== null ? (
            <Card style={styles.confidenceCard}>
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>AI Confidence</Text>
                <Text style={styles.confidenceValue}>
                  {(issue.confidence * 100).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.confidenceBar}>
                <View 
                  style={[
                    styles.confidenceFill, 
                    { width: `${issue.confidence * 100}%` }
                  ]} 
                />
              </View>
            </Card>
          ) : null}
          
          {issue.description ? (
            <Card style={styles.descriptionCard}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{issue.description}</Text>
            </Card>
          ) : null}
          
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Details</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="location" size={16} color={colors.text.secondary} />
                <Text style={styles.detailLabel}>Location</Text>
              </View>
              <Text style={styles.detailValue}>
                {issue.latitude.toFixed(6)}, {issue.longitude.toFixed(6)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="time" size={16} color={colors.text.secondary} />
                <Text style={styles.detailLabel}>Reported</Text>
              </View>
              <Text style={styles.detailValue}>{formatDate(issue.created_at)}</Text>
            </View>
            
            {issue.is_duplicate ? (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <Ionicons name="link" size={16} color={colors.status.warning} />
                  <Text style={styles.detailLabel}>Status</Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.status.warning }]}>
                  Linked to existing report
                </Text>
              </View>
            ) : null}
            
            {issue.geo_status ? (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <Ionicons name="analytics" size={16} color={colors.text.secondary} />
                  <Text style={styles.detailLabel}>Geo Status</Text>
                </View>
                <Text style={styles.detailValue}>{issue.geo_status}</Text>
              </View>
            ) : null}
          </Card>
          
          <View style={styles.timeline}>
            <Text style={styles.sectionTitle}>Status Timeline</Text>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: stateInfo.color }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{stateInfo.label}</Text>
                <Text style={styles.timelineDate}>{formatDate(issue.updated_at)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  imageContainer: {
    width: width,
    height: 300,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backButton: {
    position: 'absolute',
    top: spacing.xxl,
    left: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageToggle: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.full,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  toggleActive: {
    backgroundColor: colors.primary.main,
  },
  toggleText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    padding: spacing.lg,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  stateBadge: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  badgeText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  category: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  confidenceCard: {
    marginBottom: spacing.md,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  confidenceLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  confidenceValue: {
    ...typography.h3,
    color: colors.secondary.main,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: colors.secondary.main,
    borderRadius: 4,
  },
  descriptionCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  detailsCard: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  detailValue: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  timeline: {
    marginBottom: spacing.xl,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  timelineDate: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
