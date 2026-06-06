import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shared, spacing } from '../theme';

interface GuideScreenProps {
  apiOnline: boolean;
  loading: boolean;
  onGoToRoutes: () => void;
}

const QUICK_PLACES = ['Ev', 'İş', 'Ekle'] as const;

export default function GuideScreen({
  apiOnline,
  loading,
  onGoToRoutes,
}: GuideScreenProps) {
  return (
    <View style={styles.stack}>
      <View style={shared.card}>
        <Text style={styles.welcomeTitle}>Hoş geldin</Text>
        <Text style={shared.body}>
          YolDost, fiziksel çevre göstergelerine göre daha güvenli rota
          potansiyeli olan yürüyüş alternatiflerini önerir. Skorlar çevresel
          gösterge analizidir; gerçek dünya güvenlik garantisi değildir.
        </Text>
        <View style={[shared.badge, apiOnline ? shared.badgeOk : shared.badgeWarn]}>
          <Text
            style={[
              shared.badgeText,
              apiOnline ? shared.badgeTextOk : shared.badgeTextWarn,
            ]}
          >
            {loading
              ? 'API kontrol ediliyor'
              : apiOnline
                ? 'Canlı API bağlı'
                : 'API kontrol gerekli'}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rota planlamayı aç"
        onPress={onGoToRoutes}
        style={({ pressed }) => [
          styles.searchField,
          pressed ? styles.searchFieldPressed : null,
        ]}
      >
        <Text style={styles.searchIcon}>→</Text>
        <Text style={styles.searchPlaceholder}>Nereye gitmek istiyorsun?</Text>
      </Pressable>

      <View style={shared.buttonRow}>
        {QUICK_PLACES.map((place) => (
          <Pressable
            key={place}
            accessibilityRole="button"
            onPress={onGoToRoutes}
            style={({ pressed }) => [
              shared.chip,
              pressed ? shared.chipSelected : null,
            ]}
          >
            <Text style={shared.chipText}>
              {place === 'Ekle' ? '+ Ekle' : place}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={shared.card}>
        <Text style={shared.label}>Nasıl çalışır</Text>
        <Text style={shared.body}>
          • Rotalar sekmesinde başlangıç ve varış gir; canlı Google Routes
          alternatifleri çevresel gösterge skorlarıyla sıralanır.
        </Text>
        <Text style={shared.body}>
          • Duraklar sekmesi, çevresel göstergelere göre önerilen mola
          noktalarını listeler.
        </Text>
        <Text style={shared.body}>
          • Fırsatlar sekmesi, yol üstünde yakınından geçtiğin demo partner
          tekliflerini gösterir. Sponsorluk rota skorunu asla değiştirmez.
        </Text>
      </View>

      <Text style={shared.dim}>
        Veri kaynağı: anonimleştirilmiş demo görüntüleri ve açık veri.
        Kişi sayımı veya kimlik analizi yapılmaz.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  welcomeTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  searchField: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg - 2,
  },
  searchFieldPressed: {
    borderColor: colors.brand,
  },
  searchIcon: {
    color: colors.brand,
    fontSize: 16,
    fontWeight: '700',
  },
  searchPlaceholder: {
    color: colors.inkDim,
    fontSize: 15,
  },
});
