# Demo Plan - 3 to 5 Minutes

Goal: prove a live, repeatable, privacy-safe consumer walking-route flow.

## Setup

- [x] Vercel web application is open and configured with
      `NEXT_PUBLIC_API_BASE_URL=https://omnisight-api-70gd.onrender.com`
      ([https://web-lake-phi-31.vercel.app](https://web-lake-phi-31.vercel.app))
- [ ] Expo mobile app is open and configured with
      `EXPO_PUBLIC_API_BASE_URL=https://omnisight-api-70gd.onrender.com`
- [ ] Expo demo cafe offer point is configured with
      `EXPO_PUBLIC_DEMO_OFFER_NAME`, `EXPO_PUBLIC_DEMO_OFFER_PARTNER`,
      `EXPO_PUBLIC_DEMO_OFFER_AREA`, `EXPO_PUBLIC_DEMO_OFFER_LATITUDE`,
      `EXPO_PUBLIC_DEMO_OFFER_LONGITUDE`,
      `EXPO_PUBLIC_DEMO_OFFER_RADIUS_METERS`, and
      `EXPO_PUBLIC_DEMO_OFFER_TEXT`
- [x] Expo mobile verification recorded: `npm run typecheck` passed and
      `npx expo-doctor` passed 21/21
- [x] Render `/health/live` and `/health/ready` are reachable from an external network
      ([live](https://omnisight-api-70gd.onrender.com/health/live),
      [ready](https://omnisight-api-70gd.onrender.com/health/ready))
- [x] Render `POST /api/v1/routes` returns live Google walking alternatives
      (`generated_live: true`, Google attribution present)
- [x] Render CORS allows the Vercel web origin
      (`https://web-lake-phi-31.vercel.app`)
- [ ] `CURSOR_API_KEY` is configured only on Vercel
- [ ] Route Assistant returns a live Cursor SDK response
- [ ] Modal preflight is ready (`modal --version`, `modal token info` with no
      secret values printed)
- [ ] anonymization and training evidence is open under `reports/`, including
      `reports/training-summary.md` and the selected run report
- [ ] local fallback is ready only for network failure

## External Smoke Tests

Run these from outside the local dev server before presenting:

```bash
export RENDER_API_BASE_URL="https://omnisight-api-70gd.onrender.com"
export VERCEL_WEB_URL="https://web-lake-phi-31.vercel.app"

curl -fsS "$RENDER_API_BASE_URL/health/live"
curl -fsS "$RENDER_API_BASE_URL/health/ready"
curl -fsS "$RENDER_API_BASE_URL/api/v1/demo-runs"
curl -fsS -X POST "$RENDER_API_BASE_URL/api/v1/routes" \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":41.0151,"lng":28.8689},"destination":{"lat":41.0192,"lng":28.8725},"preference":"balanced"}'
curl -fsS "$VERCEL_WEB_URL"
```

Expo verification is partly automated and partly physical: `npm run typecheck`
and `npx expo-doctor` have passed, while the real phone permission/tracking and
local-notification result must still be recorded by the presenter.

## Expo Device Sensor Check

Run this on a real phone or simulator with location support before judging:

1. Set `EXPO_PUBLIC_API_BASE_URL` to the Render API URL and open the Expo app.
2. Set the `EXPO_PUBLIC_DEMO_OFFER_*` variables to the physical cafe/Komagene-style
   point and radius being tested.
3. Confirm the API card shows the Render URL, not `localhost` or `not configured`.
4. Tap **Start foreground tracking** and allow foreground location permission.
5. If permission or device location services are unavailable, confirm the app
   shows a clear unavailable/denied state and does not crash.
6. Allow notifications, then verify the Foreground Location card shows
   `tracking`, current coordinates, and distance to the demo partner offer.
7. If physically near the configured demo partner radius, verify the local
   notification is scheduled automatically.
8. If not physically nearby, tap **Send explicit demo offer notification** and
   verify a local notification appears; this is a visible presenter test hook,
   not a silent mock fallback.
9. Tap **Stop** and confirm foreground tracking stops.
10. Record the real phone result in `docs/presentation-evidence.md`; do not
    fill a successful phone or Render result until it is actually observed.

## Script

**0:00 - Problem.**

"Haritalar bize en kisa yolu soyluyor, fakat o yolun ne kadar kalabalik/aktif
potansiyele sahip oldugunu anlatmiyor. YolDost; yesil alan, temizlik,
kaldirim kalitesi, aydinlatma, fiziksel aciklik, ana cadde yakinligi,
POI/acik isletme aktivitesi ve yetkili sehir verisiyle daha guvenli rota
potansiyelini acikliyor."

**0:30 - Live route request.**

Choose an origin, destination, and preference such as `Daha Canli` or `Daha
Ferah`. Show that the browser calls the Render Go API and that Go obtains live
`WALK` alternatives from Google Routes.

Point out distance, duration, Google attribution, and the generated-live
indicator.

**1:30 - Honest scoring boundary.**

Show route analysis coverage. If a route has no matching physical analysis,
its YolDost score is `null` and the UI says coverage is insufficient.

"Sistem veri yokken guvenlik skoru uydurmuyor. Yalnizca fiziksel cevre,
aktivite ve yetkili sehir verisi gostergesi bulunan segmentleri yeniden
siraliyor."

Never say guaranteed safe, crime-free, actual pedestrian density, or camera
person counting as a current MVP behavior.

**2:15 - Cursor SDK Route Assistant.**

Ask "Bu rota neden onerildi?" Show the live response from
`POST /api/route-assistant`.

"Kullanici Cursor'a giris yapmiyor. Anahtar Vercel sunucusunda. SDK sadece
mevcut rota metriklerini acikliyor; skoru degistiremiyor ve ham konum gecmisi
almiyor."

There is no mock response. If Cursor is unavailable, the product displays the
explicit unavailable state.

**3:00 - CV, training, and KVKK evidence.**

Open `reports/training-summary.md` and the selected Modal run report:

- 60 anonymized images prepared locally
- faces and plates masked before upload/training
- preflight verified manifest hashes before Modal upload
- SegFormer physical-environment baseline
- selected B200 auxiliary activity/environment context run with recorded
  revisions and checkpoint hash
- metric labels: `weak_label_context_agreement` and
  `macro_f1_weak_label_context`
- person/rider/vehicle classes discarded before persistence
- the auxiliary Modal classifier is a training report artifact, not the
  product backend and not a live crowd counter or street-safety model

**4:00 - Architecture and close.**

"Core backend masterfabric-go mimarisinde Go ve Render'da; web Vercel'de;
rotalar Google Routes'tan canli; modeller Hugging Face'ten; egitim yalnizca
anonim veriyle Modal'da; Cursor SDK urun icinde rota aciklama asistani."

Show the per-feature commit history and the repository presentation.

If partner revenue, offers, "crowded" routes, or local business activity come
up, keep the concept but use this boundary:

"Teklifler ve sponsorlu mekanlar rota skorunu degistirmez. MVP kalabalik insan
saymiyor; 'aktif/kalabalik rota' ancak acik veri, POI/isletme aktivitesi, ana
cadde yakinligi veya yetkili toplulastirilmis belediye verisi olarak ele
alinabilir. Kamera tabanli kisi sayimi yalnizca gelecekte acik hukuki yetki ve
toplulastirilmis veri kapisiyla tartisilabilir. Sistem kisi profillemez, suc
tahmini yapmaz ve guvenlik garantisi vermez."

## Failure Handling

| Failure | Demo behavior |
| --- | --- |
| Cursor SDK unavailable | explicit `503` / unavailable state, no fake answer |
| Physical coverage missing | Google alternatives remain visible, score stays `null` |
| Render unavailable | controlled local Go service for recovery, clearly labeled |
| Google Routes unavailable | visible upstream error, no fabricated route |
| Expo network unavailable | show configured Render target and recorded integration evidence |
| CV/Modal network unavailable | previously recorded reproducible reports and private checkpoint evidence |
