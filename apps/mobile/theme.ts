import { StyleSheet } from 'react-native';

/**
 * Design tokens mirrored from DESIGN.md (single source of truth).
 * Light theme only — the Stitch references are dark; we keep their
 * structure but render everything with these light tokens.
 */

export const colors = {
  ink: '#1A231D',
  inkDim: '#5A6B60',
  surface: '#F3F5F2',
  panel: '#FFFFFF',
  border: '#DBE2DA',
  brand: '#0E7A4A',
  brandStrong: '#0A5C38',
  brandSoft: '#E4F1E9',
  routeShortest: '#5B6B7A',
  mapCanvas: '#E9EEE7',
  ok: '#0E7A4A',
  warn: '#9A6700',
  err: '#C1342B',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  full: 999,
} as const;

/** Shared building blocks used by every screen. Flat: 1px borders, no glow. */
export const shared = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    color: colors.inkDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  body: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  dim: {
    color: colors.inkDim,
    fontSize: 12,
    lineHeight: 18,
  },
  mono: {
    color: colors.ink,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  error: {
    color: colors.err,
    fontSize: 12,
    lineHeight: 18,
  },
  inline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 2,
  },
  badgeOk: {
    backgroundColor: colors.brandSoft,
  },
  badgeWarn: {
    backgroundColor: '#F6ECD4',
  },
  badgeText: {
    color: colors.inkDim,
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextOk: {
    color: colors.brandStrong,
  },
  badgeTextWarn: {
    color: colors.warn,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
  },
  buttonPressed: {
    backgroundColor: colors.brandStrong,
  },
  buttonText: {
    color: colors.panel,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonSecondary: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
  },
  buttonSecondaryText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipText: {
    color: colors.inkDim,
    fontSize: 13,
    fontWeight: '600',
  },
  chipSelected: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandSoft,
  },
  chipTextSelected: {
    color: colors.brandStrong,
  },
});
