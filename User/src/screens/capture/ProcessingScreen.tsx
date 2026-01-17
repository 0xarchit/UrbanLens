import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { issueService } from '../../services/issueService';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { LocationData, FlowStep } from '../../types';

const { width } = Dimensions.get('window');

type ProcessingRouteParams = {
  Processing: {
    imageUri: string;
    location: LocationData;
  };
};

interface AgentStep {
  name: string;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  decision?: string;
  reasoning?: string;
}

const initialAgents: AgentStep[] = [
  { name: 'LocationStep', iconName: 'location', label: 'Verifying Location', status: 'pending' },
  { name: 'UploadStep', iconName: 'cloud-upload', label: 'Secure Upload', status: 'pending' },
  { name: 'VisionAgent', iconName: 'eye', label: 'Vision Agent', status: 'pending' },
  { name: 'GeoDeduplicateAgent', iconName: 'map', label: 'Geo Agent', status: 'pending' },
  { name: 'PriorityAgent', iconName: 'alert-circle', label: 'Priority Agent', status: 'pending' },
  { name: 'RoutingAgent', iconName: 'git-branch', label: 'Routing Agent', status: 'pending' },
  { name: 'NotificationAgent', iconName: 'notifications', label: 'Notification Agent', status: 'pending' },
];

export function ProcessingScreen() {
  const route = useRoute<RouteProp<ProcessingRouteParams, 'Processing'>>();
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  
  const { imageUri, location } = route.params;
  
  const [agents, setAgents] = useState<AgentStep[]>(initialAgents);
  const [issueId, setIssueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnims = useRef(initialAgents.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    submitIssue();
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
          (err) => {
            
            
          }
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
    if (event.type === 'step_started') {
      const { agent_name } = event.data;
      setAgents((prev) =>
        prev.map((a) =>
          a.name === agent_name ? { ...a, status: 'running' } : a
        )
      );
      
      const idx = agents.findIndex(a => a.name === agent_name);
      if (idx !== -1) {
        pulseAnims[idx].setValue(1);
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnims[idx], { toValue: 1.1, duration: 500, useNativeDriver: true }),
            Animated.timing(pulseAnims[idx], { toValue: 1, duration: 500, useNativeDriver: true }),
          ])
        ).start();
      }

    } else if (event.type === 'step_completed') {
      const { agent_name, decision, reasoning, result } = event.data;
      
      setAgents((prev) =>
        prev.map((a) =>
          a.name === agent_name
            ? { ...a, status: 'done', decision, reasoning }
            : a
        )
      );

      const idx = agents.findIndex(a => a.name === agent_name);
      if (idx !== -1) {
         pulseAnims[idx].stopAnimation();
         pulseAnims[idx].setValue(1);
      }
      
      if (agent_name === 'VisionAgent' && result?.needs_confirmation) {
          showConfirmationDialog();
      }

    } else if (event.type === 'flow_completed') {
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
    } else if (event.type === 'flow_error') {
        setError(event.data.error || 'Unknown error');
    }
  };

  useEffect(() => {
     const doneCount = agents.filter(a => a.status === 'done').length;
     const runningCount = agents.filter(a => a.status === 'running').length;
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
          }
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
          }
        }
      ]
    );
  };

  const submitIssue = async () => {
    try {
      const result = await issueService.createIssue(
        imageUri,
        location,
        undefined,
        session?.access_token
      );
      
      setIssueId(result.issue_id);
      
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to submit issue');
    }
  };

  const handleViewDetails = () => {
    if (issueId) {
      navigation.navigate('IssueDetail', { issueId });
    }
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const progressInterpolate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary]}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
           {isComplete ? (
            <Ionicons name="sparkles" size={32} color={colors.secondary.main} />
          ) : (
            <MaterialCommunityIcons name="robot" size={32} color={colors.primary.main} />
          )}
        </View>
        <Text style={styles.title}>
          {isComplete ? 'Issue Submitted!' : 'AI Processing...'}
        </Text>
        <Text style={styles.subtitle}>
          {isComplete 
            ? 'Your report has been routed to the right team'
            : 'Our agents are analyzing your report'
          }
        </Text>
      </View>
      
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.image} />
        {!isComplete && (
          <View style={styles.imageOverlay}>
            <View style={styles.scanLine} />
          </View>
        )}
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progressInterpolate },
            ]}
          />
        </View>
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
                opacity: agent.status === 'pending' ? 0.6 : 1, 
                backgroundColor: agent.status === 'running' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(255,255,255,0.05)',
                borderColor: agent.status === 'running' ? colors.primary.main : 'transparent',
                borderWidth: 1,
              },
            ]}
          >
            <View style={[
              styles.agentIcon,
              agent.status === 'done' && styles.agentIconDone,
              agent.status === 'running' && styles.agentIconRunning,
            ]}>
              {agent.status === 'done' ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.secondary.main} />
              ) : (
                <Ionicons name={agent.iconName} size={24} color={agent.status === 'running' ? colors.primary.main : colors.text.secondary} />
              )}
            </View>
            
            <View style={styles.agentInfo}>
              <Text style={[
                  styles.agentLabel, 
                  agent.status === 'running' && { color: colors.primary.main, fontWeight: '700' }
              ]}>{agent.label}</Text>
              
              {agent.decision ? (
                <Text style={styles.agentDecision}>{agent.decision}</Text>
              ) : null}
              
              {agent.reasoning ? (
                 <Text style={styles.agentReasoning} numberOfLines={2}>{agent.reasoning}</Text>
              ) : null}
            </View>
            
            {agent.status === 'running' && (
              <View style={styles.spinner}>
                <Ionicons name="sync" size={16} color={colors.primary.main} />
              </View>
            )}
          </Animated.View>
        ))}
      </ScrollView>
      
      {error && (
        <Card style={styles.errorCard}>
           <View style={styles.errorContent}>
            <Ionicons name="close-circle" size={20} color={colors.status.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <Button
            title="Try Again"
            variant="outline"
            onPress={submitIssue}
            size="sm"
          />
        </Card>
      )}
      
      {isComplete && (
        <View style={styles.actions}>
           <Button
            title="View Details"
            onPress={handleViewDetails}
            fullWidth
          />
          <Button
            title="Report Another"
            variant="outline"
            onPress={handleGoHome}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: 60,
  },
  header: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  imageContainer: {
    height: 180,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background.card,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
  },
  scanLine: {
    height: 2,
    backgroundColor: colors.primary.main,
    width: '100%',
    shadowColor: colors.primary.main,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: 3,
  },
  agentsContainer: {
    flex: 1,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  agentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  agentIconDone: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  agentIconRunning: {
     backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  agentInfo: {
    flex: 1,
  },
  agentLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  agentDecision: {
    ...typography.caption,
    color: colors.secondary.main,
    fontWeight: '600',
  },
  agentReasoning: {
     ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  spinner: {
    marginLeft: spacing.sm,
  },
  errorCard: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.status.error,
    marginLeft: spacing.sm,
    flex: 1,
  },
  actions: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
