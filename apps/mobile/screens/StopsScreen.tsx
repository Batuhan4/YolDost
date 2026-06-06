import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shared, spacing } from '../theme';

interface StopsScreenProps {
  /** True when the live API returned analyzed demo coverage for the area. */
  hasCoverage: boolean;
  onGoToRoutes: () => void;
}

export default function StopsScreen({
  hasCoverage,
  onGoToRoutes,
}: StopsScreenProps) {
  return (
    <View style={styles.stack}>
      <Text style={shared.dim}>
        Duraklar, çevresel göstergelere göre önerilen mola noktalarıdır.
        Gerçek dünya güvenlik garantisi verilmez.
      </Text>

      {hasCoverage ? (
        <View style={shared.card}>
          <View style={shared.cardHeader}>
            <Text style={shared.cardTitle}>Güngören Demo Durağı</Text>
            <View style={[shared.badge, shared.badgeOk]}>
              <Text style={[shared.badgeText, shared.badgeTextOk]}>
                Önerilen durak
              </Text>
            </View>
          </View>
          <Text style={shared.dim}>Güngören, İstanbul · Demo verisi</Text>
          <Text style={shared.body}>
            Çevresel göstergelere göre önerilen durak: ana cadde yakınlığı ve
            açık cephe potansiyeli bu noktada daha güvenli rota potansiyeline
            işaret ediyor.
          </Text>
          <View style={styles.indicatorRow}>
            <View style={styles.indicator}>
              <Text style={shared.label}>Aydınlatma sinyali</Text>
              <Text style={shared.body}>Gösterge düzeyi: uygun</Text>
            </View>
            <View style={styles.indicator}>
              <Text style={shared.label}>Kaldırım kalitesi</Text>
              <Text style={shared.body}>Gösterge düzeyi: iyi</Text>
            </View>
          </View>
          <View style={styles.indicatorRow}>
            <View style={styles.indicator}>
              <Text style={shared.label}>Açık cephe</Text>
              <Text style={shared.body}>Aktivite potansiyeli: yüksek</Text>
            </View>
            <View style={styles.indicator}>
              <Text style={shared.label}>Yeşil alan</Text>
              <Text style={shared.body}>Gösterge düzeyi: orta</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onGoToRoutes}
            style={({ pressed }) => [
              shared.button,
              pressed ? shared.buttonPressed : null,
            ]}
          >
            <Text style={shared.buttonText}>Bu noktaya rota oluştur →</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[shared.card, styles.emptyCard]}>
          <View style={styles.emptyMark}>
            <Text style={styles.emptyMarkText}>●</Text>
          </View>
          <Text style={styles.emptyTitle}>
            Bu bölgede önerilen durak bulunamadı
          </Text>
          <Text style={[shared.body, styles.emptyBody]}>
            Çevresel gösterge kapsamı bu bölge için henüz yeterli değil.
            Ana caddelere yakın rotalarda kalabilir veya arama alanını
            genişletebilirsin.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onGoToRoutes}
            style={({ pressed }) => [
              shared.buttonSecondary,
              pressed ? styles.emptyButtonPressed : null,
            ]}
          >
            <Text style={shared.buttonSecondaryText}>Rotalara dön</Text>
          </Pressable>
        </View>
      )}

      <Text style={shared.dim}>
        Göstergeler bina, yol, kaldırım, gökyüzü ve yeşillik gibi cansız kent
        elemanlarından üretilir; kişi sayımı veya kimlik analizi içermez.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  indicator: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    flex: 1,
    gap: 2,
    padding: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  emptyMark: {
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    borderRadius: radius.full,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  emptyMarkText: {
    color: colors.brand,
    fontSize: 18,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
  },
  emptyButtonPressed: {
    opacity: 0.7,
  },
});
