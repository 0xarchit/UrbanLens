import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
  Linking,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { LocationData } from '../../types';
import { 
  isLocationAccurate, 
  checkLocationServicesEnabled,
  watchLocationWithGpsCheck,
} from '../../services/locationService';

const { width, height } = Dimensions.get('window');

type CaptureScreenState = 'gps_check' | 'camera' | 'preview' | 'submitting';

export function CaptureScreen() {
  const navigation = useNavigation<any>();
  const cameraRef = useRef<CameraView>(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  
  const [screenState, setScreenState] = useState<CaptureScreenState>('gps_check');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isGpsEnabled, setIsGpsEnabled] = useState<boolean | null>(null);
  const [isGpsReady, setIsGpsReady] = useState(false);
  const [description, setDescription] = useState('');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shutterAnim = useRef(new Animated.Value(1)).current;
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    initializeLocation();
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const initializeLocation = async () => {
    const gpsEnabled = await checkLocationServicesEnabled();
    setIsGpsEnabled(gpsEnabled);
    
    if (!gpsEnabled) {
      setScreenState('gps_check');
      return;
    }
    
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');
    
    if (status === 'granted') {
      startLocationTracking();
      setScreenState('camera');
    }
  };

  const startLocationTracking = async () => {
    cleanupRef.current = await watchLocationWithGpsCheck(
      (newLocation) => {
        setGpsAccuracy(newLocation.accuracy);
        
        if (isLocationAccurate(newLocation.accuracy, 15)) {
          setIsGpsReady(true);
          setLocation(newLocation);
        } else {
          setIsGpsReady(false);
        }
      },
      (enabled) => {
        setIsGpsEnabled(enabled);
        if (!enabled) {
          setScreenState('gps_check');
          setIsGpsReady(false);
        }
      },
      15
    );
  };

  useEffect(() => {
    if (screenState === 'camera' && !isGpsReady) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [isGpsReady, screenState]);

  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleRetryGps = async () => {
    const enabled = await checkLocationServicesEnabled();
    setIsGpsEnabled(enabled);
    
    if (enabled) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        startLocationTracking();
        setScreenState('camera');
      }
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !isGpsReady || !location) {
      Alert.alert(
        'GPS Not Ready',
        'Please wait for GPS to lock (accuracy < 15m) before capturing. This is required to ensure accurate issue reporting.',
        [{ text: 'OK' }]
      );
      return;
    }

    Animated.sequence([
      Animated.timing(shutterAnim, {
        toValue: 0.8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shutterAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      
      if (photo) {
        setCapturedImage(photo.uri);
        setScreenState('preview');
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setDescription('');
    setScreenState('camera');
  };

  const handleSubmit = () => {
    if (!capturedImage || !location) return;
    
    navigation.navigate('Processing', {
      imageUri: capturedImage,
      location: location,
      description: description.trim() || undefined,
    });
  };

  if (screenState === 'gps_check' || isGpsEnabled === false) {
    return (
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.container}
      >
        <View style={styles.gpsCheckContainer}>
          <View style={styles.gpsCheckContent}>
            <View style={styles.gpsCheckIcon}>
              <Ionicons name="location" size={48} color={colors.status.warning} />
            </View>
            
            <Text style={styles.gpsCheckTitle}>GPS Required</Text>
            <Text style={styles.gpsCheckText}>
              Location services must be enabled to report issues. This ensures accurate location data and prevents fraudulent reports.
            </Text>
            
            <Card style={styles.requirementCard}>
              <View style={styles.requirementItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.secondary.main} />
                <Text style={styles.requirementText}>Precise location tracking</Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.secondary.main} />
                <Text style={styles.requirementText}>Anti-fraud protection</Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.secondary.main} />
                <Text style={styles.requirementText}>Accurate issue mapping</Text>
              </View>
            </Card>
            
            <Button
              title="Enable GPS in Settings"
              onPress={handleOpenSettings}
              fullWidth
              size="lg"
            />
            
            <Button
              title="I've Enabled GPS"
              variant="outline"
              onPress={handleRetryGps}
              fullWidth
              size="lg"
              style={{ marginTop: spacing.md }}
            />
            
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
              <Text style={styles.backLinkText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          We need camera access to capture issue photos in real-time
        </Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  if (screenState === 'preview' && capturedImage) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.previewContainer}
          contentContainerStyle={styles.previewContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.previewImageWrapper}>
            <Image source={{ uri: capturedImage }} style={styles.previewImageSmall} />
            <TouchableOpacity style={styles.retakeOverlay} onPress={handleRetake}>
              <Ionicons name="refresh" size={20} color={colors.text.primary} />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.previewForm}>
            <Text style={styles.previewTitle}>Describe the Issue</Text>
            
            <TextInput
              style={styles.descriptionInput}
              placeholder="Add details about this issue..."
              placeholderTextColor={colors.text.tertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
            />
            
            <View style={styles.locationCard}>
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={18} color={colors.secondary.main} />
                <Text style={styles.locationText}>
                  {location?.latitude.toFixed(6)}, {location?.longitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.accuracyBadge}>
                <Text style={styles.accuracyText}>±{gpsAccuracy?.toFixed(0)}m</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.previewActions}>
            <Button
              title="Submit Issue"
              onPress={handleSubmit}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      />
      
      <View style={styles.cameraOverlay}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          
          <View style={[
            styles.gpsIndicator,
            isGpsReady ? styles.gpsReady : styles.gpsWaiting
          ]}>
            <Animated.View style={{ transform: [{ scale: isGpsReady ? 1 : pulseAnim }] }}>
              <Ionicons 
                name={isGpsReady ? 'location' : 'hourglass'} 
                size={16} 
                color={isGpsReady ? colors.secondary.main : colors.status.warning} 
              />
            </Animated.View>
            <Text style={styles.gpsText}>
              {isGpsReady 
                ? `GPS Locked (±${gpsAccuracy?.toFixed(0)}m)` 
                : `Locking GPS... (±${gpsAccuracy?.toFixed(0) || '?'}m)`
              }
            </Text>
          </View>
        </View>
        
        <View style={styles.frameGuide}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          
          {!isGpsReady && (
            <View style={styles.gpsWarningOverlay}>
              <View style={styles.gpsWarningBox}>
                <Ionicons name="warning" size={20} color={colors.status.warning} />
                <Text style={styles.gpsWarningText}>Waiting for GPS lock...</Text>
              </View>
              <Text style={styles.gpsWarningSubtext}>
                Move to an open area for better signal
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.bottomBar}>
          <Text style={styles.instructionText}>
            {isGpsReady 
              ? 'Point at the issue and tap to capture' 
              : 'GPS must lock before you can capture'
            }
          </Text>
          
          <Animated.View style={{ transform: [{ scale: shutterAnim }] }}>
            <TouchableOpacity
              style={[
                styles.shutterButton,
                !isGpsReady && styles.shutterDisabled
              ]}
              onPress={handleCapture}
              disabled={!isGpsReady}
            >
              <View style={[
                styles.shutterInner,
                !isGpsReady && styles.shutterInnerDisabled
              ]} />
            </TouchableOpacity>
          </Animated.View>
          
          {!isGpsReady && (
            <Text style={styles.requiredText}>
              GPS accuracy {'<'} 15m required
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  permissionTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  gpsCheckContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  gpsCheckContent: {
    alignItems: 'center',
  },
  gpsCheckIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.status.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  gpsCheckTitle: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  gpsCheckText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  requirementCard: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  requirementText: {
    ...typography.body,
    color: colors.text.primary,
  },
  backLink: {
    marginTop: spacing.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backLinkText: {
    color: colors.text.secondary,
    fontSize: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xxl + 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  gpsReady: {
    backgroundColor: colors.secondary.main + '30',
  },
  gpsWaiting: {
    backgroundColor: colors.status.warning + '30',
  },
  gpsText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  frameGuide: {
    flex: 1,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.xxl,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary.main,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  gpsWarningOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gpsWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  gpsWarningText: {
    color: colors.status.warning,
    fontSize: 16,
    fontWeight: '600',
  },
  gpsWarningSubtext: {
    color: colors.text.primary,
    fontSize: 12,
    marginTop: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  instructionText: {
    color: colors.text.primary,
    fontSize: 14,
    marginBottom: spacing.lg,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.text.primary,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    borderColor: colors.text.tertiary,
  },
  shutterInner: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: colors.text.primary,
  },
  shutterInnerDisabled: {
    backgroundColor: colors.text.tertiary,
  },
  requiredText: {
    color: colors.status.warning,
    fontSize: 12,
    marginTop: spacing.md,
    fontWeight: '500',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  previewContent: {
    padding: spacing.lg,
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.xxl,
  },
  previewImageWrapper: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  previewImageSmall: {
    width: '100%',
    height: '100%',
  },
  retakeOverlay: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  retakeText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  previewForm: {
    marginBottom: spacing.xl,
  },
  previewTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  descriptionInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.tertiary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  locationText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  accuracyBadge: {
    backgroundColor: colors.secondary.main,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  accuracyText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  previewActions: {
    marginTop: spacing.md,
  },
});

