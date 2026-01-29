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
          <Card variant="glass" style={styles.gpsCheckCard}>
            <View style={styles.gpsCheckIcon}>
              <Ionicons name="location" size={48} color={colors.status.warning} />
            </View>
            
            <Text style={styles.gpsCheckTitle}>GPS Required</Text>
            <Text style={styles.gpsCheckText}>
              Location services must be enabled to report issues. This ensures accurate location data and prevents fraudulent reports.
            </Text>
            
            <View style={styles.requirementList}>
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
            </View>
            
            <Button
              title="Enable GPS"
              onPress={handleOpenSettings}
              fullWidth
              size="lg"
            />
            
            <Button
              title="Checker Again"
              variant="ghost"
              onPress={handleRetryGps}
              fullWidth
              size="sm"
              style={{ marginTop: spacing.md }}
            />
          </Card>
            
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }
// ... (Camera Permission block remains similar, skipping for brevity if unchanged)

  if (screenState === 'preview' && capturedImage) {
    return (
      <View style={styles.previewContainer}>
        <ScrollView contentContainerStyle={styles.previewContent}>
          <View style={styles.previewImageWrapper}>
            <Image source={{ uri: capturedImage }} style={styles.previewImageSmall} />
            <TouchableOpacity style={styles.retakeOverlay} onPress={handleRetake}>
              <Ionicons name="camera-reverse" size={16} color={colors.text.primary} />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.previewForm}>
            <Text style={styles.previewTitle}>Add Details</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Describe the issue... (optional)"
              placeholderTextColor={colors.text.tertiary}
              multiline
              value={description}
              onChangeText={setDescription}
            />
            
            <View style={styles.locationCard}>
               <View style={styles.locationInfo}>
                 <Ionicons name="location" size={20} color={colors.primary.main} />
                 <Text style={styles.locationText}>
                   Lat: {location?.latitude.toFixed(4)}, Long: {location?.longitude.toFixed(4)}
                 </Text>
               </View>
               <View style={styles.accuracyBadge}>
                 <Text style={styles.accuracyText}>±{gpsAccuracy?.toFixed(0)}m</Text>
               </View>
            </View>
          </View>

          <View style={styles.previewActions}>
            <Button
              title="Submit Report"
              onPress={handleSubmit}
              size="lg"
              fullWidth
              icon={<Ionicons name="send" size={12} color="#FFF" />}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => navigation.goBack()}
              fullWidth
              size="sm"
              style={{ marginTop: spacing.md }}
            />
          </View>
        </ScrollView>
      </View>
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
        <LinearGradient
           colors={['rgba(0,0,0,0.7)', 'transparent']}
           style={styles.topBar}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <View style={[
            styles.gpsIndicator,
            isGpsReady ? styles.gpsReady : styles.gpsWaiting
          ]}>
             <Ionicons 
                name={isGpsReady ? 'location' : 'hourglass'} 
                size={14} 
                color="#FFF" 
              />
            <Text style={styles.gpsText}>
              {isGpsReady 
                ? `GPS Locked ±${gpsAccuracy?.toFixed(0)}m` 
                : `Acquiring GPS...`
              }
            </Text>
          </View>
        </LinearGradient>
        
        <View style={styles.frameGuide}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          
          {!isGpsReady && (
            <View style={styles.gpsWarningOverlay}>
              <View style={styles.gpsWarningBox}>
                <ActivityIndicator color={colors.status.warning} size="small" />
                <Text style={styles.gpsWarningText}>Waiting for detailed location...</Text>
              </View>
            </View>
          )}
        </View>
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.bottomBar}
        >
          <Text style={styles.instructionText}>
            {isGpsReady 
              ? 'Tap to Capture' 
              : 'Wait for GPS Lock'
            }
          </Text>
          
          <Animated.View style={{ transform: [{ scale: shutterAnim }] }}>
            <TouchableOpacity
              style={[
                styles.shutterButton,
                !isGpsReady && { opacity: 0.5 }
              ]}
              onPress={handleCapture}
              disabled={!isGpsReady}
            >
              <Ionicons name="camera" size={36} color={colors.primary.main} />
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  gpsCheckContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  gpsCheckCard: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  gpsCheckIcon: {
    marginBottom: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsCheckTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  gpsCheckText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  requirementList: {
    width: '100%',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requirementText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: "500",
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
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  gpsReady: {
    backgroundColor: 'rgba(16, 185, 129, 0.8)', // Green
  },
  gpsWaiting: {
    backgroundColor: 'rgba(245, 158, 11, 0.8)', // Amber
  },
  gpsText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: '600',
  },
  frameGuide: {
    flex: 1,
    marginHorizontal: 40,
    marginVertical: 80,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: "#FFF",
    borderWidth: 4,
    borderRadius: 8,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  gpsWarningOverlay: {
    position: 'absolute',
    bottom: -60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gpsWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  gpsWarningText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: '500', 
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 50,
    paddingTop: 20,
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    // Removed nested circle design
    display: 'none', 
  }, 
  shutterDisabled: {
    borderColor: "rgba(255,255,255,0.3)",
  },
  shutterInnerDisabled: {
    backgroundColor: "transparent",
  },
  instructionText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
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

