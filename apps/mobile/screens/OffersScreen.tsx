import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDistance } from '../offerProximity';
import { colors, radius, shared, spacing } from '../theme';
import type { DemoPartner, SensorSnapshot, SensorStatus } from '../types';

interface OffersScreenProps {
  partner: DemoPartner;
  sensor: SensorSnapshot;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onSendManualOffer: () => void;
}

const SENSOR_STATUS_LABELS: Record<SensorStatus, string> = {
  idle: 'beklemede',
  requesting: 'izin isteniyor',
  tracking: 'takipte',
  unavailable: 'kullanılamıyor',
  denied: 'izin verilmedi',
  error: 'hata',
};

function formatMaybeDistance(value: number | null) {
  return value === null ? 'konum bekleniyor' : formatDistance(value);
}

export default function OffersScreen({
  partner,
  sensor,
  onStartTracking,
  onStopTracking,
  onSendManualOffer,
}: OffersScreenProps) {
  const tracking = sensor.status === 'tracking';

  return (
    <View style={styles.stack}>
      <Text style={shared.dim}>
        Yol üstü fırsatlar yalnızca yakınından geçtiğin anda gösterilir.
        Sponsorluk rota skorunu asla değiştirmez.
      </Text>

      <View style={[shared.card, styles.offerCard]}>
        <View style={[shared.badge, styles.offerBadge]}>
          <Text style={styles.offerBadgeText}>Yol Üstü Fırsat</Text>
        </View>
        <Text style={styles.offerTitle}>{partner.name}</Text>
        <Text style={shared.dim}>Partner: {partner.partnerName}</Text>
        <Text style={shared.body}>{partner.offer}</Text>
        <View style={styles.offerMetaRow}>
          <View style={styles.offerMeta}>
            <Text style={shared.label}>Uzaklık</Text>
            <Text style={shared.body}>
              {formatMaybeDistance(sensor.distanceMeters)}
            </Text>
          </View>
          <View style={styles.offerMeta}>
            <Text style={shared.label}>Yarıçap</Text>
            <Text style={shared.body}>
              {formatDistance(partner.radiusMeters)}
            </Text>
          </View>
        </View>
        <Text style={shared.dim}>
          Nokta: {partner.latitude.toFixed(5)}, {partner.longitude.toFixed(5)}{' '}
          ({partner.areaLabel})
        </Text>
      </View>

      <View style={shared.card}>
        <View style={shared.cardHeader}>
          <Text style={shared.cardTitle}>Konum Takibi</Text>
          <View
            style={[shared.badge, tracking ? shared.badgeOk : shared.badgeWarn]}
          >
            <Text
              style={[
                shared.badgeText,
                tracking ? shared.badgeTextOk : shared.badgeTextWarn,
              ]}
            >
              {SENSOR_STATUS_LABELS[sensor.status]}
            </Text>
          </View>
        </View>
        <Text style={shared.body}>{sensor.message}</Text>
        <Text style={shared.dim}>
          Konum izni: {sensor.locationPermission} · Bildirim izni:{' '}
          {sensor.notificationPermission}
        </Text>
        {sensor.location && (
          <Text style={shared.mono}>
            {sensor.location.coords.latitude.toFixed(5)},{' '}
            {sensor.location.coords.longitude.toFixed(5)}
          </Text>
        )}
        {sensor.error && <Text style={shared.error}>{sensor.error}</Text>}
        <View style={shared.buttonRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onStartTracking}
            disabled={sensor.status === 'requesting'}
            style={({ pressed }) => [
              shared.button,
              pressed || sensor.status === 'requesting'
                ? shared.buttonPressed
                : null,
            ]}
          >
            <Text style={shared.buttonText}>
              {sensor.status === 'requesting'
                ? 'İzin isteniyor...'
                : 'Takibi başlat'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onStopTracking}
            style={({ pressed }) => [
              shared.buttonSecondary,
              pressed ? styles.pressedSecondary : null,
            ]}
          >
            <Text style={shared.buttonSecondaryText}>Durdur</Text>
          </Pressable>
        </View>
      </View>

      <View style={shared.card}>
        <Text style={shared.cardTitle}>Sunum Test Düğmesi</Text>
        <Text style={shared.dim}>
          Bildirim tetikleyici: {sensor.notificationTrigger} · Teklif
          gönderildi: {sensor.offerSent ? 'evet' : 'henüz değil'} · Bildirim
          kimliği: {sensor.notificationId ?? 'yok'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onSendManualOffer}
          style={({ pressed }) => [
            shared.button,
            pressed ? shared.buttonPressed : null,
          ]}
        >
          <Text style={shared.buttonText}>
            Demo teklif bildirimini elle gönder
          </Text>
        </Pressable>
        <Text style={shared.dim}>
          Bu düğme sunucunun görünür test kancasıdır, sessiz bir sahte geri
          dönüş değildir. Gerçek yakınlık, ön planda cihaz konumunu kullanır.
        </Text>
      </View>

      <View style={shared.card}>
        <Text style={shared.cardTitle}>Demo Güvenceleri</Text>
        <Text style={shared.body}>
          Canlı kişi sayımı veya kimlik analizi yapılmaz. Skor, fiziksel çevre
          göstergesidir; gerçek dünya güvenlik iddiası değildir. Sponsor veya
          reklam, rota skorunu değiştiremez.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  offerCard: {
    borderColor: colors.brand,
    borderWidth: 1.5,
  },
  offerBadge: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
  },
  offerBadgeText: {
    color: colors.panel,
    fontSize: 11,
    fontWeight: '700',
  },
  offerTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  offerMetaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  offerMeta: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    flex: 1,
    gap: 2,
    padding: spacing.md,
  },
  pressedSecondary: {
    opacity: 0.7,
  },
});
