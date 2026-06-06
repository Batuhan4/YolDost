import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import {
  fetchWalkingRoutes,
  type MobileRouteOption,
} from './routePlanner';
import { colors, radius, shared, spacing } from './theme';

const DEFAULT_ORIGIN = 'Güngören Metro İstasyonu, İstanbul';
const DEFAULT_DESTINATION = 'Güngören Belediyesi, İstanbul';
const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

interface RoutePlannerSectionProps {
  apiBaseUrl: string;
}

export default function RoutePlannerSection({
  apiBaseUrl,
}: RoutePlannerSectionProps) {
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [routes, setRoutes] = useState<MobileRouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRoute =
    routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null;

  const mapRegion = useMemo(() => {
    const path = selectedRoute?.geoPath ?? [];
    if (path.length === 0) {
      return {
        latitude: 41.0192,
        longitude: 28.8725,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
    }

    const lats = path.map((point) => point.latitude);
    const lngs = path.map((point) => point.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.6),
      longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.6),
    };
  }, [selectedRoute]);

  async function handleFindRoutes() {
    if (!apiBaseUrl) {
      setError('EXPO_PUBLIC_API_BASE_URL yapılandırılmadı.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextRoutes = await fetchWalkingRoutes(
        apiBaseUrl,
        origin.trim(),
        destination.trim(),
      );
      setRoutes(nextRoutes);
      setSelectedRouteId(nextRoutes[0]?.id ?? null);
    } catch (routeError) {
      setRoutes([]);
      setSelectedRouteId(null);
      setError(
        routeError instanceof Error
          ? routeError.message
          : 'Rota isteği başarısız oldu.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={shared.card}>
      <Text style={shared.cardTitle}>Canlı Yürüyüş Rotaları</Text>
      <Text style={shared.dim}>
        Web demosuyla aynı Render API ve Google Routes geometrisi.
      </Text>

      <TextInput
        value={origin}
        onChangeText={setOrigin}
        placeholder="Başlangıç"
        placeholderTextColor={colors.inkDim}
        style={styles.input}
      />
      <TextInput
        value={destination}
        onChangeText={setDestination}
        placeholder="Varış"
        placeholderTextColor={colors.inkDim}
        style={styles.input}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => void handleFindRoutes()}
        style={({ pressed }) => [
          shared.button,
          pressed || loading ? shared.buttonPressed : null,
        ]}
        disabled={loading}
      >
        <Text style={shared.buttonText}>
          {loading ? 'Rotalar hesaplanıyor...' : 'Rotaları Bul'}
        </Text>
      </Pressable>

      {error && <Text style={shared.error}>{error}</Text>}

      {loading && (
        <View style={shared.inline}>
          <ActivityIndicator color={colors.brand} />
          <Text style={shared.body}>Canlı Render API çağrılıyor...</Text>
        </View>
      )}

      <MapView
        provider={GOOGLE_MAPS_KEY ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        region={mapRegion}
      >
        {routes.map((route) => {
          const selected = route.id === selectedRoute?.id;
          return (
            <Polyline
              key={route.id}
              coordinates={route.geoPath}
              strokeColor={selected ? colors.brand : colors.routeShortest}
              strokeWidth={selected ? 5 : 3}
              tappable
              onPress={() => setSelectedRouteId(route.id)}
            />
          );
        })}
        {selectedRoute?.geoPath[0] && (
          <Marker
            coordinate={selectedRoute.geoPath[0]}
            title="Başlangıç"
            pinColor={colors.brand}
          />
        )}
        {selectedRoute?.geoPath[selectedRoute.geoPath.length - 1] && (
          <Marker
            coordinate={selectedRoute.geoPath[selectedRoute.geoPath.length - 1]}
            title="Varış"
            pinColor={colors.brandStrong}
          />
        )}
      </MapView>

      {!GOOGLE_MAPS_KEY && (
        <Text style={shared.dim}>
          Cihaz derlemelerinde Google harita altlığı için
          EXPO_PUBLIC_GOOGLE_MAPS_API_KEY tanımla.
        </Text>
      )}

      {routes.map((route) => {
        const selected = route.id === selectedRoute?.id;
        return (
          <Pressable
            key={route.id}
            accessibilityRole="button"
            onPress={() => setSelectedRouteId(route.id)}
            style={[
              styles.routeCard,
              selected ? styles.routeCardSelected : null,
            ]}
          >
            <Text style={styles.routeMetric}>
              {route.durationMin} dk · {route.distanceKm.toFixed(1)} km
            </Text>
            <Text style={shared.dim}>
              {route.status === 'analyzed' && route.score !== null
                ? `YolDost skoru ${route.score.toFixed(1)}`
                : 'Skor üretilmedi (kapsam yetersiz)'}
            </Text>
            <Text style={shared.dim}>{route.explanation}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
  },
  map: {
    borderRadius: radius.md,
    height: 220,
    width: '100%',
  },
  routeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  routeCardSelected: {
    borderColor: colors.brand,
    borderWidth: 1.5,
  },
  routeMetric: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
});
