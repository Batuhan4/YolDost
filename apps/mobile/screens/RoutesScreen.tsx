import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import RoutePlannerSection from '../RoutePlannerSection';
import { colors, shared, spacing } from '../theme';
import type { ApiSnapshot, DemoRunStatus } from '../types';

interface RoutesScreenProps {
  apiBaseUrl: string;
  apiSource: string;
  snapshot: ApiSnapshot;
  loading: boolean;
  onRefresh: () => void;
}

const RUN_STATUS_LABELS: Record<DemoRunStatus, string> = {
  pending: 'bekliyor',
  running: 'çalışıyor',
  completed: 'tamamlandı',
  failed: 'başarısız',
};

export default function RoutesScreen({
  apiBaseUrl,
  apiSource,
  snapshot,
  loading,
  onRefresh,
}: RoutesScreenProps) {
  const apiOnline = snapshot.health !== null && snapshot.errors.length === 0;
  const latestRun = snapshot.demoRuns[0];

  return (
    <View style={styles.stack}>
      <View style={styles.statusRow}>
        <View
          style={[shared.badge, apiOnline ? shared.badgeOk : shared.badgeWarn]}
        >
          <Text
            style={[
              shared.badgeText,
              apiOnline ? shared.badgeTextOk : shared.badgeTextWarn,
            ]}
          >
            {loading
              ? 'kontrol ediliyor'
              : apiOnline
                ? 'API çevrimiçi'
                : 'API kontrol gerekli'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onRefresh}
          disabled={loading}
          style={({ pressed }) => [
            styles.refresh,
            pressed ? styles.refreshPressed : null,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <Text style={styles.refreshText}>Yenile</Text>
          )}
        </Pressable>
      </View>

      <Text style={shared.dim}>
        {apiBaseUrl
          ? `Canlı Go API: ${apiBaseUrl}`
          : 'API adresi yapılandırılmadı.'}{' '}
        ({apiSource})
      </Text>
      {!apiBaseUrl && (
        <Text style={shared.error}>
          Final demo için EXPO_PUBLIC_API_BASE_URL canlı Render API adresine
          işaret etmelidir.
        </Text>
      )}
      {snapshot.errors.map((error) => (
        <Text key={error} style={shared.error}>
          {error}
        </Text>
      ))}
      <Text style={shared.dim}>
        Sağlık: {snapshot.health?.status ?? 'erişilemedi'} · Demo çalışması:{' '}
        {snapshot.demoRunCount} · Son kontrol: {snapshot.checkedAt ?? 'yok'}
      </Text>

      {apiBaseUrl ? <RoutePlannerSection apiBaseUrl={apiBaseUrl} /> : null}

      <View style={shared.card}>
        <View style={shared.cardHeader}>
          <Text style={shared.cardTitle}>Son Demo Analizi</Text>
          <View style={[shared.badge]}>
            <Text style={shared.badgeText}>
              {latestRun
                ? RUN_STATUS_LABELS[latestRun.status]
                : 'çalışma bekleniyor'}
            </Text>
          </View>
        </View>
        <Text style={shared.body}>
          {latestRun
            ? `${latestRun.name} — ${latestRun.image_count} görüntü, ${latestRun.detection_count} cansız obje tespiti, ${latestRun.anonymized_region_count} anonimleştirilmiş bölge`
            : 'Henüz demo çalışması dönmedi. API adresini ve tohum verisini kontrol et.'}
        </Text>
        <Text style={shared.dim}>
          Mobil uygulama, web panelindeki anonimleştirilmiş demo verisinin
          aynısını okur.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  refresh: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  refreshPressed: {
    opacity: 0.6,
  },
  refreshText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '700',
  },
});
