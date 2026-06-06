---
version: alpha
name: OmniSight
description: >-
  Calm, map-first navigation design language for the OmniSight consumer
  routing experience. DRAFT v0 — palette and type choices are provisional
  and will be finalized together with the team; treat tokens as the current
  single source of truth until then.
colors:
  ink: "#1A231D"
  ink-dim: "#5A6B60"
  surface: "#F3F5F2"
  panel: "#FFFFFF"
  border: "#DBE2DA"
  brand: "#0E7A4A"
  brand-strong: "#0A5C38"
  brand-soft: "#E4F1E9"
  route-shortest: "#5B6B7A"
  route-warm: "#A87928"
  map-canvas: "#E9EEE7"
  map-road: "#FFFFFF"
  map-park: "#D5E6CF"
  ok: "#0E7A4A"
  warn: "#9A6700"
  err: "#C1342B"
typography:
  display:
    fontFamily: system-ui
    fontSize: 1.375rem
    fontWeight: 700
    letterSpacing: -0.01em
  title:
    fontFamily: system-ui
    fontSize: 1rem
    fontWeight: 600
  body:
    fontFamily: system-ui
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: system-ui
    fontSize: 0.75rem
    fontWeight: 600
    letterSpacing: 0.02em
  metric:
    fontFamily: system-ui
    fontSize: 1.125rem
    fontWeight: 700
    fontFeature: tnum
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.panel}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-primary-hover:
    backgroundColor: "{colors.brand-strong}"
  route-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  route-card-selected:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  mode-chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.full}"
  mode-chip-selected:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-strong}"
    rounded: "{rounded.full}"
  badge-recommended:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.panel}"
    rounded: "{rounded.full}"
  badge-neutral:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.full}"
---

## Overview

OmniSight turns image-derived physical street indicators into route choices.
The interface must read like a real navigation product — Google Maps / Apple
Maps density — not like an operations dashboard and not like a marketing
site. Calm, quiet, map-first: the map is the primary surface, controls and
route cards sit on or beside it. No hero sections, no decorative gradients,
no ornamental motion. Mobile-first; equally professional at desktop widths.

All user-facing copy is Turkish. Claims are bounded by product policy:
"daha güvenli rota potansiyeli" / "çevresel göstergelere göre önerilen
rota" — never guaranteed safety.

> Status: DRAFT v0. The accent and neutrals below are a working proposal so
> implementation can proceed; the team will revisit them together. Changing
> them should only require editing the tokens above and the CSS custom
> properties that mirror them.

## Colors

A single restrained accent on warm-neutral surfaces. `brand` is a deep
green: it ties the product to its strongest indicators (greenery, openness,
comfort potential) and stays distinct from the default blue of mainstream
map apps. Everything else is quiet: near-black green-tinted ink on off-white
panels over a pale `surface`.

Route lines get one color each: the recommended route uses `brand`, the
shortest route uses `route-shortest` (slate), a warm alternative uses
`route-warm` (ochre). Unselected routes render thinner and desaturated;
selection is shown by weight and color, never by glow.

Map demo canvas uses `map-canvas` with `map-road` streets and `map-park`
green zones — light, low-contrast, so route lines and markers carry the
contrast. `ok`/`warn`/`err` are reserved for status, not decoration.

## Typography

System stack (`system-ui`) only — no webfont cost, native feel on every
device. `display` is reserved for the OmniSight wordmark, `title` for card
and panel headings, `body` for everything readable, `label` for chips,
badges and field labels. Numbers that get compared (durations, distances,
scores) use `metric` with tabular numerals so columns don't wobble.

## Layout

Mobile (≤768px): single column — compact brand bar, search card (origin,
destination, mode chips, primary button), map, then route cards. The first
viewport must already show brand, inputs, modes, the primary action, the map
and the top of the route list; keep vertical padding tight (`spacing.sm` /
`spacing.md`).

Desktop: navigation-app split — a fixed-width control rail (~400px) on the
left holding search, modes and route cards; the map fills all remaining
width as the main experience. Floating elements (assistant button, source
label) overlay the map with `spacing.lg` insets.

Never nest cards inside cards. One level of surface on top of `surface` —
that's it.

## Elevation & Depth

Essentially flat. Hierarchy comes from 1px `border` lines and background
steps (`surface` → `panel`). A single soft shadow
(`0 2px 8px rgba(20, 30, 24, 0.10)`) is allowed only for elements floating
over the map (assistant button, assistant panel, map labels). No stacked
shadows, no glassmorphism, no glow.

## Shapes

Radius is capped at 8px (`rounded.md`) for cards, inputs, buttons and the
map frame. `rounded.full` is reserved for small pill chips and badges (mode
chips, "Önerilen" badge, status pills) — never for cards or containers.
Route lines use round caps and joins.

## Components

- **button-primary** — the single strong action ("Rotaları Bul"). Full
  width on mobile. Hover darkens to `brand-strong`; visible focus ring
  (`2px` `brand` outline, offset 2px) for keyboard users.
- **route-card** — one route option: label badge, duration, distance,
  "+X dk" vs the shortest, indicator scores, and a one-sentence Turkish
  reason. Selected state: `brand` border (1.5px) + `brand-soft` left edge;
  unselected: `border`. Cards are buttons — keyboard focusable, Enter/Space
  selects.
- **mode-chip** — radio-group pills for route modes (Dengeli, Daha açık,
  Kaldırım dostu, Daha yeşil, Canlı cephe). Selected uses `brand-soft` +
  `brand-strong` text; exactly one selected at all times.
- **badge** — `badge-recommended` (brand) only on the recommended route;
  `badge-neutral` for "En kısa", "Daha yeşil" and similar tags.
- **assistant** — bottom-right floating "Rota Asistanı" button opening a
  single flat panel: message list, suggested questions as chips, text input
  + send. Demo answers are explicitly labeled "Demo açıklaması".
- **notes** — safety disclaimer and data-source labels render in `label` /
  small `body` with `ink-dim`: visible, never blocking.

## Do's and Don'ts

**Do**

- Keep the map the main experience; controls serve it.
- Use Turkish for every user-visible string; English for code identifiers.
- Show data provenance: "Hugging Face / Mapillary demo verisi", "Demo rota
  görselleştirmesi", "Demo açıklaması".
- Keep the safety note visible: route suggestions derive from physical
  environment indicators; real-world safety is never guaranteed.
- Use plain text/symbols (→, ↗, •) instead of adding icon packages.

**Don't**

- No purple gradients, decorative orbs, parallax or nonessential animation.
- No marketing hero blocks or oversized headlines.
- No nested cards, no radius above 8px on containers.
- No new icon/font dependencies (Lucide is not installed — keep it that way
  unless the team decides otherwise).
- No "kesin güvenli rota", "suçsuz rota", "garantili güvenlik" wording.
- No raw imagery, person counting, or municipal-data claims for open
  dataset samples.
