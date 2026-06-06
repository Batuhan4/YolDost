import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getOfferProximity } from './offerProximity';
import GuideScreen from './screens/GuideScreen';
import OffersScreen from './screens/OffersScreen';
import RoutesScreen from './screens/RoutesScreen';
import StopsScreen from './screens/StopsScreen';
import { colors, shared, spacing } from './theme';
import type {
  ApiSnapshot,
  DemoPartner,
  DemoRun,
  HealthResponse,
  ListResponse,
  SensorSnapshot,
  TabKey,
} from './types';

/**
 * YolDost mobile shell: four-tab layout (Rehber / Rotalar / Duraklar /
 * Fırsatlar) on the light DESIGN.md token set. Tab switching is plain state —
 * no navigation dependency (hackathon scope). All live behavior is preserved:
 * Go API health + demo runs, route planner, foreground location tracking and
 * the local partner-offer proximity notification.
 */

const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = stripTrailingSlash(RAW_API_BASE_URL || '');
const API_SOURCE = RAW_API_BASE_URL
  ? 'EXPO_PUBLIC_API_BASE_URL'
  : 'EXPO_PUBLIC_API_BASE_URL eksik';
const OFFER_NOTIFICATION_CHANNEL_ID = 'partner-offers';

const DEMO_PARTNER: DemoPartner = {
  id: 'demo-cafe-gungoren',
  name:
    process.env.EXPO_PUBLIC_DEMO_OFFER_NAME?.trim() ||
    'YolDost Demo Kafe',
  partnerName:
    process.env.EXPO_PUBLIC_DEMO_OFFER_PARTNER?.trim() ||
    'Demo Kafe Partneri',
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
    'Güngören demo noktası',
  offer:
    process.env.EXPO_PUBLIC_DEMO_OFFER_TEXT?.trim() ||
    'Demo partner teklifi: yakındaki aktif rotada kısa bir mola ver. Sponsorluk rota skorunu asla değiştirmez.',
};

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'guide', label: 'Rehber', icon: '◐' },
  { key: 'routes', label: 'Rotalar', icon: '→' },
  { key: 'stops', label: 'Duraklar', icon: '●' },
  { key: 'offers', label: 'Fırsatlar', icon: '↗' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const EMPTY_SNAPSHOT: ApiSnapshot = {
  health: null,
  demoRuns: [],
  demoRunCount: 0,
  checkedAt: null,
  errors: [],
};

const EMPTY_SENSOR: SensorSnapshot = {
  status: 'idle',
  locationPermission: 'istenmedi',
  notificationPermission: 'istenmedi',
  location: null,
  distanceMeters: null,
  offerSent: false,
  notificationId: null,
  notificationTrigger: 'konum bekleniyor',
  message:
    'Cihazda izin istemek için "Takibi başlat" düğmesine dokun.',
  error: null,
};

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

async function getJSON<T>(path: string): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL yapılandırılmadı; final demo canlı Render API adresini gerektirir.',
    );
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`${path} HTTP ${response.status} döndürdü`);
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
  return error instanceof Error ? error.message : 'API isteği başarısız oldu';
}

function numberFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function ensureNotificationPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(OFFER_NOTIFICATION_CHANNEL_ID, {
      description:
        'Kullanıcı bir teklif noktasına yaklaştığında yerel demo uyarıları.',
      name: 'Yol üstü fırsat bildirimleri',
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
      title: `${DEMO_PARTNER.partnerName} yakınında`,
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
  const [activeTab, setActiveTab] = useState<TabKey>('guide');
  const [snapshot, setSnapshot] = useState<ApiSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [sensor, setSensor] = useState<SensorSnapshot>(EMPTY_SENSOR);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const offerSentRef = useRef(false);
  const notificationPermissionRef = useRef('istenmedi');

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
          notificationTrigger: 'yerel olarak gösterildi',
          offerSent: true,
          message: 'Yerel partner teklif bildirimi gösterildi.',
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
    let notificationTrigger = inRange
      ? 'yarıçap içinde'
      : 'yarıçap bekleniyor';

    if (
      inRange &&
      !offerSentRef.current &&
      notificationPermissionRef.current === 'granted'
    ) {
      offerSentRef.current = true;
      notificationTrigger = 'yerel bildirim zamanlanıyor';
      notificationId = await schedulePartnerOffer(
        'proximity',
        proximity.distanceMeters,
      );
      notificationTrigger = 'yerel olarak zamanlandı';
    } else if (inRange && notificationPermissionRef.current !== 'granted') {
      notificationTrigger = 'bildirim izni engelledi';
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
        ? 'Demo kafe yakınlık yarıçapının içindesin. Yerel teklif bildirimi akışı aktif.'
        : 'Ön planda konum takibi aktif.',
      error: null,
    }));
  }

  async function startLocationDemo() {
    setSensor((current) => ({
      ...current,
      status: 'requesting',
      notificationTrigger: 'izinler isteniyor',
      message: 'Ön plan konum ve bildirim izinleri isteniyor...',
      error: null,
    }));

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setSensor((current) => ({
          ...current,
          status: 'unavailable',
          notificationTrigger: 'konum servisleri bekleniyor',
          message: 'Bu cihazda konum servisleri kapalı.',
          error: 'Cihaz konum servislerini aç ve tekrar dene.',
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
          notificationTrigger: 'konum izni engelledi',
          message: 'Ön plan konum izni verilmedi.',
          error:
            'Konum izni verilene kadar mobil demo yakınlığı takip edemez.',
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
            : 'bildirim izni engelledi',
        message:
          notificationPermission === 'granted'
            ? current.message
            : 'Takip aktif, ancak bildirim izni yok.',
        error:
          notificationPermission === 'granted'
            ? null
            : 'Demo kafe yakınlık teklifini göstermek için bildirimlere izin ver.',
      }));
    } catch (error) {
      setSensor((current) => ({
        ...current,
        status: 'error',
        notificationTrigger: 'hata',
        message: 'Konum veya bildirim akışı kullanılamıyor.',
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
        : 'takip durduruldu',
      message: 'Ön plan takibi durduruldu.',
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
          notificationTrigger: 'bildirim izni engelledi',
          error: 'Demo teklifi için bildirim izni gerekiyor.',
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
        notificationTrigger: 'elle gönderilen yerel bildirim',
        message:
          'Demo kafe teklif bildirimi, sunucunun açık eylemiyle zamanlandı.',
        error: null,
      }));
    } catch (error) {
      setSensor((current) => ({
        ...current,
        status: 'error',
        notificationTrigger: 'hata',
        error: messageFromError(error),
      }));
    }
  }

  const apiOnline = snapshot.health !== null && snapshot.errors.length === 0;
  const activeTabLabel = TABS.find((tab) => tab.key === activeTab)?.label ?? '';

  return (
    <View style={styles.container}>
      <View style={styles.appBar}>
        <Text style={styles.wordmark}>YolDost</Text>
        <Text style={styles.appBarSection}>{activeTabLabel}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeTab === 'guide' && (
          <GuideScreen
            apiOnline={apiOnline}
            loading={loading}
            onGoToRoutes={() => setActiveTab('routes')}
          />
        )}
        {activeTab === 'routes' && (
          <RoutesScreen
            apiBaseUrl={API_BASE_URL}
            apiSource={API_SOURCE}
            snapshot={snapshot}
            loading={loading}
            onRefresh={() => void refreshStatus()}
          />
        )}
        {activeTab === 'stops' && (
          <StopsScreen
            hasCoverage={snapshot.demoRuns.length > 0}
            onGoToRoutes={() => setActiveTab('routes')}
          />
        )}
        {activeTab === 'offers' && (
          <OffersScreen
            partner={DEMO_PARTNER}
            sensor={sensor}
            onStartTracking={() => void startLocationDemo()}
            onStopTracking={stopLocationDemo}
            onSendManualOffer={() => void sendManualOffer()}
          />
        )}
        <Text style={[shared.dim, styles.footerNote]}>
          Rota önerileri fiziksel çevre göstergelerinden üretilir; gerçek
          dünya güvenliği asla garanti edilmez.
        </Text>
      </ScrollView>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const selected = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActiveTab(tab.key)}
              style={styles.tabItem}
            >
              <Text
                style={[styles.tabIcon, selected ? styles.tabIconSelected : null]}
              >
                {tab.icon}
              </Text>
              <Text
                style={[
                  styles.tabLabel,
                  selected ? styles.tabLabelSelected : null,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  appBar: {
    alignItems: 'baseline',
    backgroundColor: colors.panel,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
  },
  wordmark: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  appBarSection: {
    color: colors.inkDim,
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footerNote: {
    marginTop: spacing.xs,
  },
  tabBar: {
    backgroundColor: colors.panel,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  tabIcon: {
    color: colors.inkDim,
    fontSize: 16,
  },
  tabIconSelected: {
    color: colors.brand,
  },
  tabLabel: {
    color: colors.inkDim,
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelSelected: {
    color: colors.brandStrong,
  },
});
