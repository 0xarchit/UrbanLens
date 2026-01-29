import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  AppState,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { IssueCard } from "../../components/issues/IssueCard";
import { useAuth } from "../../context/AuthContext";
import { issueService } from "../../services/issueService";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { Issue } from "../../types";

const { width } = Dimensions.get("window");

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut, isDevMode } = useAuth();
  // ... rest of code

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      checkLocationServices();
      setRefreshing(true);
      fetchIssues();
    }, [user?.id, isDevMode]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkLocationServices();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
      console.error("Failed to fetch issues:", error);
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
    navigation.navigate("Capture");
  };

  const handleIssuePress = (issue: Issue) => {
    navigation.navigate("IssueDetail", { issueId: issue.id });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.greetingText}>Welcome,</Text>
        <Text style={styles.userName}>
          {user?.user_metadata?.full_name ||
            user?.email?.split("@")[0] ||
            "Citizen"}
        </Text>
      </View>

      <TouchableOpacity style={styles.profileButton} onPress={signOut}>
        <LinearGradient
          colors={[colors.primary.light, colors.primary.main]}
          style={styles.profileGradient}
        >
          <Ionicons name="person" size={20} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity onPress={handleReportIssue} activeOpacity={0.9}>
        <View style={styles.reportCard}>
          <LinearGradient
            colors={[colors.primary.main, colors.primary.dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.reportCardGradient}
          >
            <View style={styles.reportCardContent}>
              <View style={styles.reportInfo}>
                <Text style={styles.reportTitle}>Report New Issue</Text>
                <Text style={styles.reportSubtitle}>
                  Snap a photo • AI Analysis • Track Fixes
                </Text>
              </View>
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)'
              }}>
                <Ionicons name="camera" size={24} color="#FFF" />
              </View>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>

      {locationEnabled === false && (
        <Card style={styles.gpsWarning}>
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            <Ionicons name="location" size={24} color="#EF4444" />
            <Text style={styles.gpsWarningText}>
              Enable Location Services to report issues nearby.
            </Text>
          </View>
          <Button
            title="Enable"
            variant="ghost"
            size="sm"
            onPress={async () => {
              try {
                await Location.enableNetworkProviderAsync();
                setTimeout(checkLocationServices, 1000);
              } catch (e) {
                checkLocationServices();
              }
            }}
            textStyle={{ color: "#EF4444", fontWeight: '700' }}
            style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}
          />
        </Card>
      )}
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={[styles.statValue, { color: colors.primary.main }]}>{issues.length}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statValue, { color: '#10B981' }]}>
          {issues.filter((i) => i.state === "resolved").length}
        </Text>
        <Text style={styles.statLabel}>Fixed</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statValue, { color: '#F59E0B' }]}>
          {
            issues.filter((i) => ["assigned", "in_progress"].includes(i.state))
              .length
          }
        </Text>
        <Text style={styles.statLabel}>Pending</Text>
      </View>
    </View>
  );

  const renderRecentHeader = () => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Recent Updates</Text>
      <TouchableOpacity onPress={() => navigation.navigate("MyIssues")}>
        <Text style={styles.seeAllText}>See All</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <Card style={styles.emptyCard} variant="glass">
      <View style={styles.emptyIconBg}>
        <Ionicons
          name="images-outline"
          size={32}
          color={colors.primary.main}
        />
      </View>
      <Text style={styles.emptyTitle}>No Reports Found</Text>
      <Text style={styles.emptyText}>
        You haven't reported any issues yet.{"\n"}Help improve your city today!
      </Text>
    </Card>
  );

  if (loading && !refreshing) {
    return <Loader fullScreen size="large" />;
  }

  return (
    <LinearGradient
      colors={[colors.background.primary, "#E2E8F0", colors.background.tertiary]}
      style={styles.container}
    >
      <FlatList
        data={issues.slice(0, 5)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <IssueCard issue={item} onPress={() => handleIssuePress(item)} />
        )}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {renderHeader()}
            {renderQuickActions()}
            {renderStats()}
            {issues.length > 0 && renderRecentHeader()}
          </View>
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
    paddingTop: 60, // Reduced from 80
  },
  headerContainer: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  greetingText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  profileButton: {
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActions: {
    marginBottom: spacing.xl,
  },
  reportCard: {
    marginBottom: spacing.md,
    borderRadius: 20,
    padding: 0, // Reset padding for internal gradient
    overflow: 'hidden', // Ensure gradient is clipped
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    elevation: 8,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  reportCardGradient: {
    padding: 20,
    width: '100%',
  },
  reportCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reportInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  reportSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  gpsWarning: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderColor: "#EF4444", // Red-500
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: 12, // Reduced radius for "alert" feel
    shadowColor: "#EF4444",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gpsWarningText: {
    flex: 1,
    flexShrink: 1, // Fix overflow
    color: "#EF4444", 
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 10,
    marginRight: 10,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)", // Increased opacity
    borderRadius: 16,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0", // Slate 200 border
    shadowColor: "#64748B", // Slate 500 shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
  },
  seeAllText: {
    color: colors.primary.main,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyCard: {
    alignItems: "center",
    padding: spacing.xl * 1.5,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderStyle: 'dashed',
    borderColor: colors.border.medium || "rgba(0,0,0,0.1)",
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.main + "10",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
