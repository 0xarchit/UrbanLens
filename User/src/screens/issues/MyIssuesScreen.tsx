import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/Card";
import { IssueCard } from "../../components/issues/IssueCard";
import { issueService } from "../../services/issueService";
import { cacheService } from "../../services/cacheService";
import { useAuth } from "../../context/AuthContext";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { Issue } from "../../types";

const ITEMS_PER_PAGE = 10;

export function MyIssuesScreen() {
  const navigation = useNavigation<any>();
  const { user, isDevMode } = useAuth();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadIssues();
    }, [filter, user?.id]),
  );

  const loadIssues = async () => {
    setLoading(true);
    await cacheService.clearCache();
    await fetchIssues(1, true);
  };

  const fetchIssues = async (pageNum: number, reset: boolean = false) => {
    try {
      const response = await issueService.listIssues(
        pageNum,
        ITEMS_PER_PAGE,
        filter || undefined,
        isDevMode ? undefined : user?.id,
      );

      const filtered = response.items;

      if (reset) {
        setIssues(filtered);
        await cacheService.setIssuesCache(filtered);
      } else {
        const newIssues = [...issues, ...filtered];
        setIssues(newIssues);
        await cacheService.setIssuesCache(newIssues);
      }

      setHasMore(response.items.length === ITEMS_PER_PAGE);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to fetch issues:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchIssues(1, true);
  };

  const handleForceRefresh = async () => {
    setLoading(true);
    await cacheService.clearCache();
    await fetchIssues(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchIssues(page + 1);
    }
  };

  const handleIssuePress = (issue: Issue) => {
    navigation.navigate("IssueDetail", { issueId: issue.id });
  };

  const filters = [
    { key: null, label: "All" },
    { key: "reported", label: "Reported" },
    { key: "assigned", label: "Assigned" },
    { key: "in_progress", label: "In Progress" },
    { key: "pending_verification", label: "Review" },
    { key: "resolved", label: "Resolved" },
  ];

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.title}>My Reports</Text>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={handleForceRefresh}
      >
        <Ionicons name="refresh" size={24} color={colors.primary.main} />
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filters}>
      {filters.map((f) => (
        <TouchableOpacity
          key={f.key || "all"}
          style={[styles.filterButton, filter === f.key && styles.filterActive]}
          onPress={() => setFilter(f.key)}
        >
          <Text
            style={[
              styles.filterText,
              filter === f.key && styles.filterTextActive,
            ]}
          >
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEmpty = () => (
    <Card style={styles.emptyCard}>
      <Ionicons
        name="documents-outline"
        size={48}
        color={colors.text.tertiary}
      />
      <Text style={styles.emptyTitle}>No Reports Found</Text>
      <Text style={styles.emptyText}>
        {filter
          ? "No issues match this filter"
          : "You haven't reported any issues yet"}
      </Text>
    </Card>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary.main} />
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary]}
      style={styles.container}
    >
      <FlatList
        data={issues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <IssueCard issue={item} onPress={() => handleIssuePress(item)} />
        )}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderFilters()}
          </>
        }
        ListEmptyComponent={!loading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.main}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  filters: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
  },
  filterActive: {
    backgroundColor: colors.primary.main,
  },
  filterText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  filterTextActive: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  emptyCard: {
    alignItems: "center",
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
    textAlign: "center",
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
});
