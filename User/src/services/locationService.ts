import * as Location from 'expo-location';
import { Linking, Alert, Platform } from 'react-native';
import { LocationData } from '../types';

export async function checkLocationServicesEnabled(): Promise<boolean> {
  const enabled = await Location.hasServicesEnabledAsync();
  return enabled;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function ensureLocationEnabled(): Promise<{ enabled: boolean; permission: boolean }> {
  const enabled = await checkLocationServicesEnabled();
  
  if (!enabled) {
    return { enabled: false, permission: false };
  }
  
  const permission = await requestLocationPermission();
  return { enabled: true, permission };
}

export async function promptEnableLocation(): Promise<void> {
  Alert.alert(
    'Location Required',
    'GPS must be enabled to report issues. This ensures accurate location data and prevents fraudulent reports.',
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Open Settings', 
        onPress: () => {
          if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
          } else {
            Linking.openSettings();
          }
        }
      },
    ]
  );
}

export async function getCurrentLocation(
  minAccuracy: number = 20,
  timeout: number = 30000
): Promise<LocationData> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    if (location.coords.accuracy !== null && location.coords.accuracy <= minAccuracy) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        heading: location.coords.heading ?? undefined,
        altitude: location.coords.altitude ?? undefined,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? 999,
    heading: location.coords.heading ?? undefined,
    altitude: location.coords.altitude ?? undefined,
  };
}

export function isLocationAccurate(accuracy: number, threshold: number = 15): boolean {
  return accuracy <= threshold;
}

export async function watchLocationWithGpsCheck(
  onLocationUpdate: (location: LocationData) => void,
  onGpsStatusChange: (enabled: boolean) => void,
  accuracyThreshold: number = 15
): Promise<() => void> {
  let subscription: Location.LocationSubscription | null = null;
  let gpsCheckInterval: ReturnType<typeof setInterval> | null = null;
  
  const checkGpsAndStart = async () => {
    const enabled = await checkLocationServicesEnabled();
    onGpsStatusChange(enabled);
    
    if (enabled && !subscription) {
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (newLocation) => {
          const accuracy = newLocation.coords.accuracy ?? 999;
          onLocationUpdate({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            accuracy: accuracy,
            heading: newLocation.coords.heading ?? undefined,
            altitude: newLocation.coords.altitude ?? undefined,
          });
        }
      );
    } else if (!enabled && subscription) {
      subscription.remove();
      subscription = null;
    }
  };
  
  await checkGpsAndStart();
  
  gpsCheckInterval = setInterval(async () => {
    const enabled = await checkLocationServicesEnabled();
    onGpsStatusChange(enabled);
    
    if (!enabled && subscription) {
      subscription.remove();
      subscription = null;
    } else if (enabled && !subscription) {
      await checkGpsAndStart();
    }
  }, 3000);
  
  return () => {
    if (subscription) {
      subscription.remove();
    }
    if (gpsCheckInterval) {
      clearInterval(gpsCheckInterval);
    }
  };
}
