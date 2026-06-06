# Presentation Notes

This folder holds the jury-facing presentation source and evidence pointers.
Use `docs/presentation-evidence.md` as the canonical source sheet while building
slides, exports, or speaker notes.

## Evidence To Open During Demo

- `docs/presentation-evidence.md` - consolidated presentation evidence,
  placeholders, and safe wording.
- `docs/demo-plan.md` - 3 to 5 minute run-of-show.
- `docs/ai-usage.md` - Cursor, Hugging Face, Modal, and SDK usage summary.
- `docs/cursor-sdk-automation.md` - Cursor SDK readiness automation.
- `docs/cursor-route-assistant.md` - product Cursor SDK integration boundary.
- `docs/kvkk.md` - anonymization, storage, and deletion procedure.
- `apps/mobile/.env.example` - Expo API and demo cafe offer env variables.
- `apps/mobile/offerProximity.ts` - proximity helper used by the local
  notification demo.
- `reports/training-summary.md` - selected Modal run summary.
- `reports/runs/20260606T121159Z-modal-scene/report.md` - selected weak-label
  activity/environment context classifier run.
- `reports/runs/20260606T134500Z-local-baseline/report.md` - local SegFormer
  physical-indicator baseline.
- `reports/integrations.md` - Google Routes and Cursor SDK integration notes.

## Slide Checklist

- [ ] Problem and product claim frames `kalabalik/aktif` as an activity signal
      from POI/open-business context, main-street proximity, public/open data,
      or authorized aggregated municipal data.
- [ ] KVKK slide says faces/plates are irreversibly masked before analysis.
- [ ] Metrics slide labels `weak_label_context_agreement` 80% and
      `macro_f1_weak_label_context` 0.80 as weak-label auxiliary
      activity/environment context metrics.
- [ ] Metrics slide explicitly says SegFormer mIoU is not claimed without
      pixel-level labels.
- [ ] Cursor slide separates Cursor IDE/rules, Cursor SDK product endpoint, and
      Cursor SDK readiness automation.
- [ ] Modal slide says Modal is training compute only, not the product backend.
- [ ] Live evidence slide contains actual Render, Vercel, Expo, Google Routes,
      Cursor SDK, and Modal rerun outputs only after those checks are run.
- [ ] Expo slide shows foreground location permission/tracking,
      env-configurable demo offer point, local `expo-notifications` alert, and
      the `offerProximity` helper boundary.
- [ ] Expo verification line records `npm run typecheck` passing and
      `npx expo-doctor` passing 21/21.
- [ ] Physical phone result is left as a checklist placeholder until tested on
      the user's device; do not invent a Render URL or phone notification result.
- [ ] Limitations slide excludes guaranteed safety, crime prediction, person
      counting, pedestrian-density claims, demographic inference, plate OCR, and
      tracking.

## Expo Demo Slide Notes

Use these env variable names on the slide or speaker notes:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_DEMO_OFFER_NAME`
- `EXPO_PUBLIC_DEMO_OFFER_PARTNER`
- `EXPO_PUBLIC_DEMO_OFFER_AREA`
- `EXPO_PUBLIC_DEMO_OFFER_LATITUDE`
- `EXPO_PUBLIC_DEMO_OFFER_LONGITUDE`
- `EXPO_PUBLIC_DEMO_OFFER_RADIUS_METERS`
- `EXPO_PUBLIC_DEMO_OFFER_TEXT`

Physical test checklist:

1. Configure `EXPO_PUBLIC_API_BASE_URL` with the real Render API URL.
2. Configure the demo offer env values to the cafe/Komagene-style point.
3. Open Expo on the phone, tap **Start foreground tracking**, and allow
   foreground location plus notifications.
4. Confirm `tracking`, current coordinates, distance to the offer point, and a
   local notification either by physical proximity or the visible manual test
   button.
5. Record the real phone result in `docs/presentation-evidence.md` before the
   final presentation.

## Safe Speaker Line

"YolDost can compare walking alternatives for active-route and safer-route
potential using explainable activity and physical street indicators. It does
not guarantee safety, predict crime, or count people in the MVP. Faces and
plates are irreversibly masked first; stored outputs are anonymized
derivatives, aggregate masking counts, and physical-environment metrics."
