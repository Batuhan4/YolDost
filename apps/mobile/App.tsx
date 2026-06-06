import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  type DemoOffer,
  formatDistance,
  getOfferProximity,
} from './offerProximity';

/**
 * Field shell for the YolDost mobile demo.
 * Minimal by design (hackathon scope): one screen proving Expo talks to the
 * same Go API as the web demo and a real foreground proximity notification.
 */

const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = stripTrailingSlash(RAW_API_BASE_URL || '');
const API_SOURCE = RAW_API_BASE_URL
  ? 'EXPO_PUBLIC_API_BASE_URL'
  : 'missing EXPO_PUBLIC_API_BASE_URL';
const OFFER_NOTIFICATION_CHANNEL_ID = 'partner-offers';

const DEMO_PARTNER: DemoOffer & { areaLabel: string; offer: string } = {
  id: 'demo-cafe-gungoren',
  name:
    process.env.EXPO_PUBLIC_DEMO_OFFER_NAME?.trim() ||
    'Komagene-style YolDost Demo Cafe',
  partnerName:
    process.env.EXPO_PUBLIC_DEMO_OFFER_PARTNER?.trim() ||
    'Demo Cafe Partner',
  latitude: numberFromEnv(process.env.EXPO_PUBLIC_DEMO_OFFER_LATITUDE, 41.010259),
  longitude: numberFromEnv(
    process.env.EXPO_PUBLIC_DEMO_OFFER_LONGITUDE,
    28.874899,
  ),
  radiusMeters: numberFromEnv(
    process.env.EXPO_PUBLIC_DEMO_OFFER_RADIUS_METERS,
    150,
  ),
  areaLabel:
    process.env.EXPO_PUBLIC_DEMO_OFFER_AREA?.trim() ||
    'Gungoren demo point',
  offer:
    process.env.EXPO_PUBLIC_DEMO_OFFER_TEXT?.trim() ||
    'Demo partner offer: take a short active-route break nearby. Sponsorship never changes route scores.',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type DemoRunStatus = 'pending' | 'running' | 'completed' | 'failed';

interface HealthResponse {
  status: string;
  services?: Record<string, string>;
}

interface DemoRun {
  id: string;
  name: string;
  status: DemoRunStatus;
  image_count: number;
  detection_count: number;
  anonymized_region_count: number;
  model_id: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface ListResponse<T> {
  data: T[];
  count: number;
}

interface ApiSnapshot {
  health: HealthResponse | null;
  demoRuns: DemoRun[];
  demoRunCount: number;
  checkedAt: string | null;
  errors: string[];
}

type SensorStatus =
  | 'idle'
  | 'requesting'
  | 'tracking'
  | 'unavailable'
  | 'denied'
  | 'error';

interface SensorSnapshot {
  status: SensorStatus;
  locationPermission: string;
  notificationPermission: string;
  location: Location.LocationObject | null;
  distanceMeters: number | null;
  offerSent: boolean;
  notificationId: string | null;
  notificationTrigger: string;
  message: string;
  error: string | null;
}

const EMPTY_SNAPSHOT: ApiSnapshot = {
  health: null,
  demoRuns: [],
  demoRunCount: 0,
  checkedAt: null,
  errors: [],
};

const EMPTY_SENSOR: SensorSnapshot = {
  status: 'idle',
  locationPermission: 'not requested',
  notificationPermission: 'not requested',
  location: null,
  distanceMeters: null,
  offerSent: false,
  notificationId: null,
  notificationTrigger: 'waiting for location',
  message: 'Tap Start foreground tracking to request permission on device.',
  error: null,
};

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

async function getJSON<T>(path: string): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is not configured; final demo requires the Render API URL.',
    );
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

async function loadApiSnapshot(): Promise<ApiSnapshot> {
  const [healthResult, demoRunsResult] = await Promise.allSettled([
    getJSON<HealthResponse>('/health/live'),
    getJSON<ListResponse<DemoRun>>('/api/v1/demo-runs'),
  ]);
  const errors: string[] = [];

  if (healthResult.status === 'rejected') {
    errors.push(messageFromError(healthResult.reason));
  }
  if (demoRunsResult.status === 'rejected') {
    errors.push(messageFromError(demoRunsResult.reason));
  }

  const demoRuns =
    demoRunsResult.status === 'fulfilled' ? demoRunsResult.value.data : [];

  return {
    health: healthResult.status === 'fulfilled' ? healthResult.value : null,
    demoRuns,
    demoRunCount:
      demoRunsResult.status === 'fulfilled' ? demoRunsResult.value.count : 0,
    checkedAt: new Date().toLocaleTimeString(),
    errors,
  };
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : 'API request failed';
}

function formatStatus(status?: DemoRunStatus) {
  if (!status) return 'waiting for run';
  return status.replace('_', ' ');
}

function numberFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMaybeDistance(value: number | null) {
  return value === null
    ? 'waiting for foreground location'
    : formatDistance(value);
}

async function ensureNotificationPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(OFFER_NOTIFICATION_CHANNEL_ID, {
      description: 'Local demo alerts when the user is near an offer point.',
      name: 'Partner proximity offers',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return existing.status;
  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return requested.status;
}

async function schedulePartnerOffer(
  reason: 'proximity' | 'manual-test',
  distanceMetersValue: number | null,
) {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${DEMO_PARTNER.partnerName} nearby`,
      body: DEMO_PARTNER.offer,
      data: {
        distance_meters:
          distanceMetersValue === null ? null : Math.round(distanceMetersValue),
        partner_id: DEMO_PARTNER.id,
        trigger: reason,
      },
    },
    trigger:
      Platform.OS === 'android'
        ? {
            channelId: OFFER_NOTIFICATION_CHANNEL_ID,
            seconds: 1,
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          }
        : null,
  });
}

export default function App() {
  const [snapshot, setSnapshot] = useState<ApiSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [sensor, setSensor] = useState<SensorSnapshot>(EMPTY_SENSOR);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const offerSentRef = useRef(false);
  const notificationPermissionRef = useRef('not requested');

  async function refreshStatus() {
    setLoading(true);
    const nextSnapshot = await loadApiSnapshot().catch((error: unknown) => ({
      ...EMPTY_SNAPSHOT,
      checkedAt: new Date().toLocaleTimeString(),
      errors: [messageFromError(error)],
    }));
    setSnapshot(nextSnapshot);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function loadInitialStatus() {
      const nextSnapshot = await loadApiSnapshot().catch((error: unknown) => ({
        ...EMPTY_SNAPSHOT,
        checkedAt: new Date().toLocaleTimeString(),
        errors: [messageFromError(error)],
      }));

      if (!active) return;
      setSnapshot(nextSnapshot);
      setLoading(false);
    }

    loadInitialStatus();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      locationSubscriptionRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (notification.request.content.data?.partner_id !== DEMO_PARTNER.id) {
          return;
        }

        setSensor((current) => ({
          ...current,
          notificationId: notification.request.identifier,
          notificationTrigger: 'shown locally',
          offerSent: true,
          message: 'Local partner offer notification was shown.',
          error: null,
        }));
      },
    );

    return () => {
      received.remove();
    };
  }, []);

  async function handleLocationUpdate(location: Location.LocationObject) {
    const proximity = getOfferProximity(location.coords, DEMO_PARTNER);
    const inRange = proximity.isNear;
    let notificationId: string | null = null;
    let notificationTrigger = inRange ? 'inside radius' : 'waiting for radius';

    if (
      inRange &&
      !offerSentRef.current &&
      notificationPermissionRef.current === 'granted'
    ) {
      offerSentRef.current = true;
      notificationTrigger = 'scheduling local notification';
      notificationId = await schedulePartnerOffer(
        'proximity',
        proximity.distanceMeters,
      );
      notificationTrigger = 'scheduled locally';
    } else if (inRange && notificationPermissionRef.current !== 'granted') {
      notificationTrigger = 'blocked by notification permission';
    }

    setSensor((current) => ({
      ...current,
      status: 'tracking',
      location,
      distanceMeters: proximity.distanceMeters,
      offerSent: offerSentRef.current,
      notificationId: notificationId ?? current.notificationId,
      notificationTrigger,
      message: inRange
        ? 'Inside demo cafe proximity radius. Local offer notification flow is active.'
        : 'Foreground location tracking is active.',
      error: null,
    }));
  }

  async function startLocationDemo() {
    setSensor((current) => ({
      ...current,
      status: 'requesting',
        notificationTrigger: 'requesting permissions',
      message: 'Requesting foreground location and notification permissions...',
      error: null,
    }));

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setSensor((current) => ({
          ...current,
          status: 'unavailable',
          notificationTrigger: 'waiting for location services',
          message: 'Location services are disabled on this device.',
          error: 'Enable device location services, then try again.',
        }));
        return;
      }

      const locationPermission =
        await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        setSensor((current) => ({
          ...current,
          status: 'denied',
          locationPermission: locationPermission.status,
          notificationTrigger: 'blocked by location permission',
          message: 'Foreground location permission was not granted.',
          error:
            'The mobile demo cannot track proximity until location permission is allowed.',
        }));
        return;
      }

      const notificationPermission = await ensureNotificationPermission();
      notificationPermissionRef.current = notificationPermission;

      locationSubscriptionRef.current?.remove();
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await handleLocationUpdate(currentLocation);

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 5,
          timeInterval: 5_000,
        },
        (nextLocation) => {
          void handleLocationUpdate(nextLocation);
        },
      );

      setSensor((current) => ({
        ...current,
        status: 'tracking',
        locationPermission: locationPermission.status,
        notificationPermission,
        notificationTrigger:
          notificationPermission === 'granted'
            ? current.notificationTrigger
            : 'blocked by notification permission',
        message:
          notificationPermission === 'granted'
            ? current.message
            : 'Tracking is active, but notification permission is unavailable.',
        error:
          notificationPermission === 'granted'
            ? null
            : 'Allow notifications to show the demo cafe proximity offer.',
      }));
    } catch (error) {
      setSensor((current) => ({
        ...current,
        status: 'error',
        notificationTrigger: 'error',
        message: 'Location or notification flow is unavailable.',
        error: messageFromError(error),
      }));
    }
  }

  function stopLocationDemo() {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
    setSensor((current) => ({
      ...current,
      status: 'idle',
        notificationTrigger: current.offerSent
          ? current.notificationTrigger
          : 'tracking stopped',
      message: 'Foreground tracking stopped.',
    }));
  }

  async function sendManualOffer() {
    try {
      const permission = await ensureNotificationPermission();
      notificationPermissionRef.current = permission;
      if (permission !== 'granted') {
        setSensor((current) => ({
          ...current,
          notificationPermission: permission,
          notificationTrigger: 'blocked by notification permission',
          error: 'Notification permission is required for the demo offer.',
        }));
        return;
      }
      offerSentRef.current = true;
      const notificationId = await schedulePartnerOffer(
        'manual-test',
        sensor.distanceMeters,
      );
      setSensor((current) => ({
        ...current,
        notificationPermission: permission,
        offerSent: true,
        notificationId,
        notificationTrigger: 'manual local notification',
        message:
          'Demo cafe offer notification was scheduled by explicit presenter action.',
        error: null,
      }));
    } catch (error) {
      setSensor((current) => ({
        ...current,
        status: 'error',
        notificationTrigger: 'error',
        error: messageFromError(error),
      }));
    }
  }

  const latestRun = snapshot.demoRuns[0];
  const apiOnline = snapshot.health !== null && snapshot.errors.length === 0;
  const healthBadge = loading ? 'checking' : apiOnline ? 'online' : 'needs check';
  const healthBadgeStyle = apiOnline ? styles.badgeOk : styles.badgeWarn;
  const summary = useMemo(() => {
    if (!latestRun) {
      return 'No demo run returned yet. Check the API URL and seed data.';
    }

    return `${latestRun.name} - ${latestRun.image_count} images, ${latestRun.detection_count} inanimate detections, ${latestRun.anonymized_region_count} anonymized regions`;
  }, [latestRun]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>YolDost Mobile Demo</Text>
        <Text style={styles.tagline}>
          Live Go API check for safer-route potential from physical environment
          indicators.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>API</Text>
          <Text style={styles.mono}>{API_BASE_URL || 'not configured'}</Text>
          <Text style={styles.dim}>Source: {API_SOURCE}</Text>
          {!API_BASE_URL && (
            <Text style={styles.error}>
              Final demo unavailable until EXPO_PUBLIC_API_BASE_URL points to
              the live Render API.
            </Text>
          )}
          <Text style={styles.dim}>Health: GET /health/live</Text>
          <Text style={styles.dim}>Runs: GET /api/v1/demo-runs</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Live Go API Status</Text>
            <View style={[styles.badge, healthBadgeStyle]}>
              <Text style={styles.badgeText}>{healthBadge}</Text>
            </View>
          </View>
          {loading ? (
            <View style={styles.inline}>
              <ActivityIndicator color="#1f6f4a" />
              <Text style={styles.body}>Calling live API...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.body}>
                Health: {snapshot.health?.status ?? 'unavailable'}
              </Text>
              <Text style={styles.body}>Demo runs: {snapshot.demoRunCount}</Text>
              <Text style={styles.dim}>
                Last checked: {snapshot.checkedAt ?? 'not checked'}
              </Text>
            </>
          )}
          {snapshot.errors.map((error) => (
            <Text key={error} style={styles.error}>
              {error}
            </Text>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={refreshStatus}
            style={({ pressed }) => [
              styles.button,
              pressed || loading ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Refreshing...' : 'Refresh live status'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Latest Demo Run</Text>
            <View style={[styles.badge, styles.badgeMuted]}>
              <Text style={styles.badgeText}>{formatStatus(latestRun?.status)}</Text>
            </View>
          </View>
          <Text style={styles.body}>{summary}</Text>
          <Text style={styles.dim}>
            Mobile reads the same anonymized demo-run metadata used by the web
            dashboard.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Foreground Location</Text>
            <View
              style={[
                styles.badge,
                sensor.status === 'tracking' ? styles.badgeOk : styles.badgeWarn,
              ]}
            >
              <Text style={styles.badgeText}>{sensor.status}</Text>
            </View>
          </View>
          <Text style={styles.body}>{sensor.message}</Text>
          <Text style={styles.dim}>
            Location permission: {sensor.locationPermission}
          </Text>
          <Text style={styles.dim}>
            Notifications: {sensor.notificationPermission}
          </Text>
          {sensor.location && (
            <Text style={styles.mono}>
              {sensor.location.coords.latitude.toFixed(5)},{' '}
              {sensor.location.coords.longitude.toFixed(5)}
            </Text>
          )}
          {sensor.error && <Text style={styles.error}>{sensor.error}</Text>}
          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              onPress={startLocationDemo}
              style={({ pressed }) => [
                styles.button,
                pressed || sensor.status === 'requesting'
                  ? styles.buttonPressed
                  : null,
              ]}
              disabled={sensor.status === 'requesting'}
            >
              <Text style={styles.buttonText}>
                {sensor.status === 'requesting'
                  ? 'Requesting...'
                  : 'Start foreground tracking'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={stopLocationDemo}
              style={({ pressed }) => [
                styles.buttonSecondary,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.buttonSecondaryText}>Stop</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Demo Partner Offer</Text>
          <Text style={styles.body}>{DEMO_PARTNER.name}</Text>
          <Text style={styles.dim}>Partner: {DEMO_PARTNER.partnerName}</Text>
          <Text style={styles.dim}>
            Radius: {formatDistance(DEMO_PARTNER.radiusMeters)} around{' '}
            {DEMO_PARTNER.areaLabel}.
          </Text>
          <Text style={styles.dim}>
            Offer point: {DEMO_PARTNER.latitude.toFixed(5)},{' '}
            {DEMO_PARTNER.longitude.toFixed(5)}
          </Text>
          <Text style={styles.dim}>
            Distance: {formatMaybeDistance(sensor.distanceMeters)}
          </Text>
          <Text style={styles.dim}>
            Notification trigger: {sensor.notificationTrigger}
          </Text>
          <Text style={styles.dim}>
            Offer sent: {sensor.offerSent ? 'yes' : 'not yet'}
          </Text>
          <Text style={styles.dim}>
            Notification id: {sensor.notificationId ?? 'none yet'}
          </Text>
          <Text style={styles.body}>{DEMO_PARTNER.offer}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={sendManualOffer}
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonText}>
              Send explicit demo offer notification
            </Text>
          </Pressable>
          <Text style={styles.dim}>
            This button is a visible presenter test hook, not a silent mock
            fallback. Real proximity uses foreground device location.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Demo Guardrails</Text>
          <Text style={styles.body}>
            No live person counting or identity analysis. The score is a
            physical-environment indicator, not a real-world safety claim.
          </Text>
        </View>
      </ScrollView>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  scroll: {
    padding: 20,
    paddingTop: 64,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1b2733',
  },
  tagline: {
    fontSize: 13,
    color: '#5b6b7a',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e0e6',
    padding: 14,
    gap: 6,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#5b6b7a',
  },
  body: {
    fontSize: 14,
    color: '#1b2733',
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#1b2733',
  },
  dim: {
    fontSize: 12,
    color: '#5b6b7a',
  },
  error: {
    color: '#9b2c2c',
    fontSize: 12,
  },
  inline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef1f4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeOk: {
    backgroundColor: '#dff5e8',
  },
  badgeWarn: {
    backgroundColor: '#fff3cd',
  },
  badgeMuted: {
    backgroundColor: '#eef1f4',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5b6b7a',
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f6f4a',
    borderRadius: 8,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonSecondary: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef1f4',
    borderRadius: 8,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonSecondaryText: {
    color: '#1b2733',
    fontSize: 12,
    fontWeight: '700',
  },
});
