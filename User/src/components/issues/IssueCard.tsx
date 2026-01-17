import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Issue } from '../../types';

interface IssueCardProps {
  issue: Issue;
  onPress?: () => void;
}

const priorityColors: Record<number, string> = {
  1: colors.priority.critical,
  2: colors.priority.high,
  3: colors.priority.medium,
  4: colors.priority.low,
};

const priorityLabels: Record<number, string> = {
  1: 'CRITICAL',
  2: 'HIGH',
  3: 'MEDIUM',
  4: 'LOW',
};

const stateColors: Record<string, string> = {
  reported: colors.status.info,
  validated: colors.accent.purple,
  assigned: colors.accent.cyan,
  in_progress: colors.status.warning,
  resolved: colors.status.success,
  closed: colors.text.tertiary,
  rejected: colors.status.error,
};

export function IssueCard({ issue, onPress }: IssueCardProps) {
  const priorityColor = issue.priority ? priorityColors[issue.priority] : colors.text.tertiary;
  const priorityLabel = issue.priority ? priorityLabels[issue.priority] : 'N/A';
  const stateColor = stateColors[issue.state] || colors.text.tertiary;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card variant="glass" style={styles.container}>
        <View style={styles.header}>
          {issue.annotated_urls[0] ? (
            <Image source={{ uri: issue.annotated_urls[0] }} style={styles.thumbnail} />
          ) : issue.image_urls[0] ? (
            <Image source={{ uri: issue.image_urls[0] }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderImage]}>
              <Ionicons name="camera" size={24} color={colors.text.tertiary} />
            </View>
          )}
          
          <View style={styles.info}>
            <View style={styles.badges}>
              <View style={[styles.badge, { backgroundColor: priorityColor }]}>
                <Text style={styles.badgeText}>{priorityLabel}</Text>
              </View>
              <View style={[styles.badge, styles.stateBadge, { borderColor: stateColor }]}>
                <Text style={[styles.badgeText, { color: stateColor }]}>
                  {issue.state.toUpperCase().replace('_', ' ')}
                </Text>
              </View>
            </View>
            
            {issue.category ? (
              <Text style={styles.category}>{issue.category}</Text>
            ) : null}
            
            {issue.confidence !== undefined && issue.confidence !== null ? (
              <Text style={styles.confidence}>
                Confidence: {(issue.confidence * 100).toFixed(0)}%
              </Text>
            ) : null}
          </View>
        </View>
        
        {issue.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {issue.description}
          </Text>
        ) : null}
        
        <View style={styles.footer}>
          <Text style={styles.date}>{formatDate(issue.created_at)}</Text>
          {issue.is_duplicate ? (
            <View style={styles.duplicateBadge}>
              <Text style={styles.duplicateText}>DUPLICATE</Text>
            </View>
          ) : null}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  placeholderImage: {
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  stateBadge: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  badgeText: {
    color: colors.text.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  category: {
    color: colors.text.primary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  confidence: {
    color: colors.text.secondary,
    fontSize: typography.caption.fontSize,
    marginTop: spacing.xs,
  },
  description: {
    color: colors.text.secondary,
    fontSize: typography.bodySmall.fontSize,
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  date: {
    color: colors.text.tertiary,
    fontSize: typography.caption.fontSize,
  },
  duplicateBadge: {
    backgroundColor: colors.status.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  duplicateText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '600',
  },
});
