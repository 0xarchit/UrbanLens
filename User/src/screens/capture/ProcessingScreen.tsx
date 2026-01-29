import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { issueService } from "../../services/issueService";
import { cacheService } from "../../services/cacheService";
import { useAuth } from "../../context/AuthContext";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { LocationData, FlowStep } from "../../types";

const { width } = Dimensions.get("window");

type ProcessingRouteParams = {
  Processing: {
    imageUri: string;
    location: LocationData;
    description?: string;
  };
};

interface AgentStep {
  name: string;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  status: "pending" | "running" | "done" | "error";
  decision?: string;
  reasoning?: string;
}

const initialAgents: AgentStep[] = [
  {
    name: "LocationStep",
    iconName: "location",
    label: "Verifying Location",
    status: "pending",
  },
  {
    name: "UploadStep",
    iconName: "cloud-upload",
    label: "Secure Upload",
    status: "pending",
  },
  {
    name: "VisionAgent",
    iconName: "eye",
    label: "Vision Agent",
    status: "pending",
  },
  {
    name: "GeoDeduplicateAgent",
    iconName: "map",
    label: "Geo Agent",
    status: "pending",
  },
  {
    name: "PriorityAgent",
    iconName: "alert-circle",
    label: "Priority Agent",
    status: "pending",
  },
  {
    name: "RoutingAgent",
    iconName: "git-branch",
    label: "Routing Agent",
    status: "pending",
  },
  {
    name: "NotificationAgent",
    iconName: "notifications",
    label: "Notification Agent",
    status: "pending",
  },
];

export function ProcessingScreen() {
  const route = useRoute<RouteProp<ProcessingRouteParams, "Processing">>();
  const navigation = useNavigation<any>();
  const { session } = useAuth();

  const { imageUri, location, description } = route.params;

  const [agents, setAgents] = useState<AgentStep[]>(initialAgents);
  const [issueId, setIssueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnims = useRef(
    initialAgents.map(() => new Animated.Value(1)),
  ).current;

  useEffect(() => {
    submitIssue();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;

    const connect = async () => {
      if (!issueId) return;

      try {
        cleanupFn = await issueService.connectToFlowStream(
          issueId,
          (event) => {
            handleStreamEvent(event);
          },
          (err) => {},
        );
      } catch (e) {
        console.error("Failed to connect to stream", e);
      }
    };

    connect();

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [issueId]);

  const handleStreamEvent = (event: any) => {
    if (event.type === "step_started") {
      const { agent_name } = event.data;
      setAgents((prev) =>
        prev.map((a) =>
          a.name === agent_name ? { ...a, status: "running" } : a,
        ),
      );

      const idx = agents.findIndex((a) => a.name === agent_name);
      if (idx !== -1) {
        pulseAnims[idx].setValue(1);
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnims[idx], {
              toValue: 1.1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnims[idx], {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      }
    } else if (event.type === "step_completed") {
      const { agent_name, decision, reasoning, result } = event.data;

      setAgents((prev) =>
        prev.map((a) =>
          a.name === agent_name
            ? { ...a, status: "done", decision, reasoning }
            : a,
        ),
      );

      const idx = agents.findIndex((a) => a.name === agent_name);
      if (idx !== -1) {
        pulseAnims[idx].stopAnimation();
        pulseAnims[idx].setValue(1);
      }

      if (agent_name === "VisionAgent" && result?.needs_confirmation) {
        showConfirmationDialog();
      }
    } else if (event.type === "flow_completed") {
      setIsComplete(true);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();

      if (event.data.final_result?.needs_confirmation) {
        setIsComplete(false);
        showConfirmationDialog();
      }
    } else if (event.type === "flow_error") {
      setError(event.data.error || "Unknown error");
    }
  };

  useEffect(() => {
    const doneCount = agents.filter((a) => a.status === "done").length;
    const runningCount = agents.filter((a) => a.status === "running").length;
    const total = agents.length;

    const progress = (doneCount + (runningCount ? 0.5 : 0)) / total;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [agents]);

  const showConfirmationDialog = () => {
    Alert.alert(
      "Zero Detections Found",
      "Our AI didn't find any specific issues in this image.\n\nDo you want to submit this for manual review?\n\n⚠️ WARNING: False reports may result in account ban.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: async () => {
            try {
              if (issueId) await issueService.confirmIssue(issueId, false);
              navigation.goBack();
            } catch (e) {
              console.error(e);
            }
          },
        },
        {
          text: "Submit for Manual Review",
          style: "default",
          onPress: async () => {
            try {
              if (issueId) {
                await issueService.confirmIssue(issueId, true);
                setIsComplete(true);
              }
            } catch (e) {
              setError("Failed to confirm issue");
            }
          },
        },
      ],
    );
  };

  const submitIssue = async () => {
    try {
      console.log("[ProcessingScreen] Submitting issue - session present:", !!session, "access_token present:", !!session?.access_token);
      const result = await issueService.createIssue(
        imageUri,
        location,
        description,
        session?.access_token,
      );

      setIssueId(result.issue_id);
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to submit issue");
    }
  };

  const handleViewDetails = async () => {
    if (issueId) {
      await cacheService.clearCache();
      navigation.navigate("IssueDetail", { issueId });
    }
  };

  const handleGoHome = async () => {
    await cacheService.clearCache();
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" }],
    });
  };

  const progressInterpolate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const scanTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180], // Match image height
  });


  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary]}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={[styles.headerIcon, isComplete && styles.headerIconComplete]}>
          {isComplete ? (
            <Ionicons name="sparkles" size={32} color={colors.secondary.main} />
          ) : (
            <MaterialCommunityIcons
              name="robot-outline"
              size={32}
              color={colors.primary.main}
            />
          )}
        </View>
        <Text style={styles.title}>
          {isComplete ? "Report Processed!" : "AI Analysis in Progress"}
        </Text>
        <Text style={styles.subtitle}>
          {isComplete
            ? "Your issue has been categorized and routed."
            : "Our intelligent agents are analyzing your report."}
        </Text>
      </View>

      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.image} />
        {!isComplete && (
          <View style={styles.imageOverlay}>
            <Animated.View 
              style={[
                styles.scanLine, 
                { transform: [{ translateY: scanTranslateY }] }
              ]} 
            />
            <View style={styles.gridOverlay} />
          </View>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressInterpolate }]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round((agents.filter(a => a.status === 'done').length / agents.length) * 100)}% Complete
        </Text>
      </View>

      <ScrollView
        style={styles.agentsContainer}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {agents.map((agent, index) => (
          <Animated.View
            key={agent.name}
            style={[
              styles.agentRow,
              {
                transform: [{ scale: pulseAnims[index] }],
                opacity: agent.status === "pending" ? 0.5 : 1,
                borderColor:
                  agent.status === "running"
                    ? colors.primary.main
                    : "rgba(255,255,255,0.1)",
              },
            ]}
          >
            <View
              style={[
                styles.agentIcon,
                agent.status === "done" && styles.agentIconDone,
                agent.status === "running" && styles.agentIconRunning,
              ]}
            >
              <Ionicons
                name={agent.status === "done" ? "checkmark" : agent.iconName}
                size={20}
                color={
                  agent.status === "done"
                    ? colors.secondary.main
                    : agent.status === "running"
                    ? colors.primary.main
                    : colors.text.tertiary
                }
              />
            </View>

            <View style={styles.agentInfo}>
              <Text
                style={[
                  styles.agentLabel,
                  agent.status === "running" && styles.agentLabelRunning,
                ]}
              >
                {agent.label}
              </Text>

              {agent.decision ? (
                <Text style={styles.agentDecision}>Result: {agent.decision}</Text>
              ) : null}
            </View>

            {agent.status === "running" && (
              <ActivityIndicator size="small" color={colors.primary.main} />
            )}
          </Animated.View>
        ))}
      </ScrollView>

      {error ? (
        <Card style={styles.errorCard} variant="glass">
          <View style={styles.errorContent}>
            <Ionicons
              name="alert-circle"
              size={24}
              color={colors.status.error}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <Button
            title="Retry Upload"
            variant="outline"
            onPress={submitIssue}
            size="sm"
            style={{ borderColor: colors.status.error }}
            textStyle={{ color: colors.status.error }}
          />
        </Card>
      ) : null}

      {isComplete && (
        <View style={styles.actions}>
          <Button title="View Receipt" onPress={handleViewDetails} fullWidth size="lg" />
          <Button
            title="Return Home"
            variant="ghost"
            onPress={handleGoHome}
            fullWidth
            style={{ marginTop: spacing.sm }}
          />
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 60,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: "center",
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(59, 130, 246, 0.1)", // Blue tint
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  headerIconComplete: {
    backgroundColor: "rgba(16, 185, 129, 0.1)", // Green tint
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
    maxWidth: '80%',
  },
  imageContainer: {
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.background.card,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    overflow: 'hidden',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent", 
    // Add grid background image or implementation if feasible, otherwise keep transparent
  },
  scanLine: {
    height: 2,
    backgroundColor: colors.secondary.main, // Green laser
    width: "100%",
    shadowColor: colors.secondary.main,
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  progressContainer: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary.main,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: "600",
    width: 90,
    textAlign: 'right',
  },
  agentsContainer: {
    flex: 1,
  },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  agentIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.background.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  agentIconDone: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  agentIconRunning: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  agentInfo: {
    flex: 1,
  },
  agentLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.primary,
  },
  agentLabelRunning: {
    color: colors.primary.main,
  },
  agentDecision: {
    fontSize: 12,
    color: colors.secondary.main,
    marginTop: 2,
    fontWeight: "500",
  },
  agentReasoning: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  errorCard: {
    marginTop: spacing.md,
    backgroundColor: "rgba(254, 226, 226, 0.5)", // Red tint
    borderColor: "rgba(248, 113, 113, 0.3)",
    padding: spacing.md,
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: colors.status.error,
    marginLeft: spacing.sm,
    flex: 1,
    fontWeight: "500",
  },
  actions: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
});
