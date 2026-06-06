# Nihai Tavsiye — Cursor x ALT+TAB Hackathon Araştırma Sentezi

> 5 paralel araştırma ajanının (fikirler, Hugging Face, Street View, mimari, Cursor/KVKK/demo) bulgularının sentezi.
> Detaylar: [01-proje-fikirleri.md](01-proje-fikirleri.md) · [02-huggingface-kaynaklar.md](02-huggingface-kaynaklar.md) · [03-street-view-api.md](03-street-view-api.md) · [04-mimari-ve-plan.md](04-mimari-ve-plan.md) · [05-cursor-kvkk-demo.md](05-cursor-kvkk-demo.md)
> Tarih: 6 Haziran 2026, ~11:45. Tüm linkler bugün doğrulandı; doğrulanamayanlar **"varsayım"** etiketli.

## 1. Executive Summary

**Seçilen proje: "Güngören Saha Gözü" — Kentsel Saha Tespit Paneli (kombo, 58/70).**
Tek CV pipeline'ı, iki model: çöp konteyneri + tabela/billboard + sokak lambası (`YOLOV8-oiv7`) ve yol hasarı D00-D40 (`yolo12s-road-damage-rdd2022`). Street View'dan pano_id ile deterministik görüntü → geri döndürülemez yüz/plaka maskesi → tespit → Render Postgres → Vercel'de Next.js harita/liste paneli (+ salt-okunur Expo listesi). AGENTS.md'deki ön karar (araç görüntüsü → kentsel obje → panel) **#1 olarak doğrulandı**, ancak sınıf seti yukarıdaki gibi daraltıldı.

Kombo seçiminin nedeni: rubrikteki üç büyük kalemi (30 teknik + 25 CV + 20 kamu faydası) aynı anda maksimize ediyor; ek sınıf grubu yalnızca config maliyeti; en kötü hâli (RDD düşerse) bile tek amaçlı en iyi fikre eşit — asimetrik güvenli bahis.

**Kritik mimari karar:** CV worker **laptop'ta** çalışır (Python, `FOR UPDATE SKIP LOCKED` kuyruğu) ve **Render Postgres'e yazar**; Go API Render'da native runtime'da, UI Vercel'de. Render free tier'da Python/torch barınamaz (RAM + kalıcı disk yok) — bu yüzden laptop worker zayıflık değil, jüri-geçirmez tasarım kararıdır (README'de gerekçelendirilir).

## 2. Karşılaştırma Tabloları

### Fikir yarışı (ilk 3 / 70 üzerinden — detay: 01)

| # | Fikir | Puan | Not |
|---|---|---|---|
| 1 | **Kombo: Kentsel Saha Tespit Paneli** | **58** | Seçilen. Konteyner + tabela + lamba + yol hasarı |
| 2 | Yol bozukluğu/çukur (RDD2022) | 57 | Kombo çökerse geri çekilme hattı |
| 3 | Çöp konteyneri (tek başına) | 55 | En garantili, görsel olarak mütevazı |
| — | Elenenler: kaldırım erişilebilirliği (36, dataset CC-BY-NC), grafiti (36, model yok), trafik işareti envanteri (37, TR domain yok), yeşil alan/ağaç (Google ToS'un **birebir yasak örneği**) | | |

### Model seçimi (detay: 02)

| Görev | Model | Lisans | Not |
|---|---|---|---|
| Konteyner+tabela+lamba (P0/P1/P2) | [shirabendor/YOLOV8-oiv7](https://huggingface.co/shirabendor/YOLOV8-oiv7) | AGPL-3.0 | 23 MB; sınıf listesi `model.names` ile teyit edilmeli (**varsayım**) |
| Yol hasarı (P0) | [rezzzq/yolo12s-road-damage-rdd2022](https://huggingface.co/rezzzq/yolo12s-road-damage-rdd2022) | MIT (kartta) | YOLOv12 checkpoint'inin ultralytics 8.4.60'ta yüklenmesi **varsayım — ilk 10 dk'da test** |
| Zero-shot joker | [IDEA-Research/grounding-dino-tiny](https://huggingface.co/IDEA-Research/grounding-dino-tiny) | Apache-2.0 | CPU'da 2-5 sn/kare; sadece zaman artarsa |
| Yüz anonimleştirme | [arnabdhar/YOLOv8-Face-Detection](https://huggingface.co/arnabdhar/YOLOv8-Face-Detection) | AGPL-3.0 | Lokalde mevcut (`yolov8_face.pt`, SHA256 eşleşti), 30-35 ms/kare |
| Plaka anonimleştirme | [Koushim/yolov8-license-plate-detection](https://huggingface.co/Koushim/yolov8-license-plate-detection) | MIT (kartta) | Lokalde mevcut (`yolov8_plate.pt`) |
| Serverless yedek | [facebook/detr-resnet-50](https://huggingface.co/facebook/detr-resnet-50) | Apache-2.0 | HF Inference'ta "live" olan TEK aday — canlı demo lokal CPU'da koşmak zorunda |

⚠️ **Lisans notu:** Tüm YOLO türevleri fiilen AGPL-3.0 (MIT/Apache iddialı kartlar tartışmalı). Açık kaynak hackathon reposu için sorun değil; ticarileşmede Ultralytics Enterprise gerekir → README'de tek cümleyle belirtilir. `yolov8n.pt` HF zorunluluğu için [Ultralytics/YOLOv8](https://huggingface.co/Ultralytics/YOLOv8)'den yeniden indirilmeli (lokal kopya GitHub release build'i).

## 3. Önerilen MVP

**Akış:** Fixture koordinatı → SV metadata (ücretsiz) ile pano_id pinle → Static API'den 640×640 kare çek (ayda ilk 10.000 ücretsiz) → **RAM'de** yüz/plaka solid mask (+%20 padding, conf 0.15-0.25) → SADECE blurlu türev persist (Postgres bytea) → oiv7 + RDD tespiti → `detections` satırları → Next.js harita/liste/iş emri görünümü.

**Backend (masterfabric-go, detay: 04):** chi v5 + pgx/v5 ham SQL + goose migration + slog; DDD katmanları (domain → application → infrastructure). Yeni entity = 9 dosyalık kalıp; repo kendi `.cursor/rules/*.mdc` kurallarıyla geliyor (AI Adaptasyonu anlatısına bedava malzeme). Bilinen pürüzler: `DATABASE_URL` desteği yok (8 satırlık parse eki), Render'da `SERVER_PORT=10000`, Dockerfile base'i `golang:1.22` → yükselt, route'larımız public gruba (JWT'li gruba değil).

**Endpoint'ler:** `POST /api/v1/jobs`, `GET /api/v1/jobs/:id`, `GET /api/v1/detections`, `GET /api/v1/stats`, `GET /api/v1/images/:jobId` (blurlu kanıt), `GET /healthz`.

**Şema (tek migration):** `image_sources → processing_jobs (status + blurlu bytea) → detections (sınıf/conf/bbox/model_id)` + `anonymization_events (yalnız sayaç+model_id)` + `demo_runs` + `audit_events`.

**Web:** `/` (react-leaflet + OSM, `dynamic ssr:false`), `/jobs`, `/jobs/[id]` (blurlu görüntü + SVG bbox overlay), `/kvkk` (ucuz KVKK puanı). **Expo:** tek ekran salt-okunur tespit listesi, Expo Go ile (~30-45 dk); kamera YOK.

**Cursor bonusu (detay: 05):** `cursor-agent` CLI kurulu (v2026.04.14) ama **login değil — sabah ilk iş login**. `@cursor/sdk` public beta (29 Nis 2026); npm 7-gün kısıtı nedeniyle `@1.0.16` pinle. İki otomasyon (~30 dk): `scripts/demo-report.sh` (detection JSON → TR rapor; SDK → CLI → şablon üçlü fallback) + `scripts/kvkk-gate.sh` (deterministik sızıntı taraması; AI 10 + KVKK 10 puanına aynı anda oynar).

## 4. Kapsam Dışı (bilinçli)

Trafik işareti alt-tip sınıflandırması · kaldırım erişilebilirliği · yeşil alan/ağaç endeksi (ToS yasak örneği) · grafiti · **her türlü OCR/metin çıkarımı** (tabeladaki "Ahmet Usta" = kişisel veri nüansı; hiçbir yerde metin okunmaz, sadece sınıf+bbox+skor) · plaka okuma/yüz tanıma (KVKK kara listesi).

## 5. Riskler

| Risk | Şiddet | Önlem |
|---|---|---|
| oiv7'nin Güngören 640px karelerindeki isabeti doğrulanmamış (**varsayım**) | Yüksek | İlk 15 dk: indir + `model.names` + 3 kare testi; zayıfsa eşik düşür → grounding-dino → ağırlık RDD'ye |
| rezzzq YOLOv12 checkpoint'i 8.4.60'ta yüklenmeyebilir (**varsayım**) | Yüksek | İlk 10 dk test; düşerse keremberke pothole fallback |
| Render Go deploy üçlüsü (Go sürümü / PORT / env) | Orta | Saat-0 hello-world deploy; R1→R3 fallback merdiveni |
| Zorunlu stack genişliği 6 saati yer | Orta | Fixture'ları ön-işle; demo DB/cache'den; sahnede 1-2 kare canlı; 14:30 fren kuralı |
| **Google ToS 3.2.3(c)(v):** SV'den şehir çapında obje endeksi yasak örnek; (c)(vii) SV ile ML eğitimi yasak | Orta-Yüksek | Inference-only küçük geçici fixture; türevler lokal+geçici; hackathon sonu imha tutanağı (KVKK tutanağıyla birleşik); üretim anlatısı = belediye araç kamerası; README'de şeffaf not |
| KVKK blur kaçağı (false negative) | Yüksek (diskalifiye riski) | Solid mask (hafif gaussian yasak — kısmen geri çevrilebilir), +%20 padding, düşük eşik, fixture spot-check; ham bayt sadece RAM/gitignored `tmp_raw/` |
| Render free cold start ~50 sn + 15 dk'da uyku | Orta | T-30 pre-warm + keep-alive curl |
| Sahnede WiFi ölümü | Orta | Hotspot → gitignored `demo_cache/` → ekran kaydı kademesi |

## 6. 6 Saatlik Plan (özet — saat saat tablo: 04)

| Saat | İş | GO/NO-GO kapısı |
|---|---|---|
| 0:00-0:30 | **Paralel de-risk:** Render PG provision + Go hello-world Render'a + Next hello Vercel'e + `cursor-agent login` + model yükleme testleri (oiv7/RDD) + SV metadata preflight (ücretsiz, pano_id'leri pinler) | Modeller yüklenmiyorsa fallback modele geç |
| 0:30-1:30 | Anonimleştirme gate'i (solid mask, padding, sayaçlar) — lokal dosyalara karşı | Blur kanıtı yoksa demo görüntüsü kullanılamaz |
| 1:30-2:30 | Tespit worker'ı (SKIP LOCKED kuyruk) + fixture'ların toplu işlenmesi | |
| 2:30-3:30 | Go API: masterfabric kalıbıyla entity'ler + endpoint'ler + migration | **3:30: Render'da yeşil değilse R2** (Go lokal, DB bulut) |
| 3:30-4:30 | Next.js: liste-önce, sonra leaflet harita + bbox overlay + `/kvkk` | 30 dk kuralı: harita gecikirse liste ile devam |
| 4:30-5:15 | Uçtan uca bulut testi + Expo tek ekran + commit/push düzeni | **14:30 fren kuralı:** P0 uçtan uca değilse P1/P2 kes |
| 5:15-6:00 | README + KVKK beyanları + imha tutanağı + `demo-report.sh`/`kvkk-gate.sh` + pre-warm + 90 sn prova + `presentation/` | |

Her slot = en az 1 anlamlı commit + push (jüri commit geçmişini okuyor; CLAUDE.md gereği her özellik ayrı commit/push).

## 7. İlk 10 Somut İş (şimdi)

1. `cursor-agent login` + `.env` anahtar varlık kontrolü (değerleri yazdırmadan).
2. Render Postgres provision et; `DATABASE_URL`'i `.env`'e koy.
3. masterfabric-go şablonunu kopyala (modül adını değiştirme), `DATABASE_URL` parse eki + `SERVER_PORT` düzeltmesiyle Render'a hello-world deploy.
4. Next.js hello'yu Vercel'e deploy et (`NEXT_PUBLIC_API_BASE_URL`).
5. venv'de oiv7 + RDD modellerini indir, `model.names` + 3 kare smoke test (**iki varsayımı da ilk 15 dk'da kapatır**).
6. `preflight.sh`: 14 Güngören koordinatında ücretsiz metadata ile pano_id/tarih pinle (fixture JSON hazır: 03).
7. Anonimleştirme gate script'i: solid mask, +%20 padding, conf 0.2, `anonymization_events` sayaçları.
8. Migration 00013: 6 tablo + index'ler (DDL hazır: 04).
9. Tespit worker'ı: kuyruk → blurlu görüntüde inference → `detections`.
10. `scripts/kvkk-gate.sh`'i pre-commit'e bağla; README iskeletini ("AI Adaptasyonu" + KVKK beyan blokları 05'te hazır) aç.

## 8. Açık Varsayımlar

- oiv7 sınıf listesi ve Güngören isabeti → ilk 15 dk testi
- rezzzq checkpoint/ultralytics uyumu → ilk 10 dk testi
- Güngören fixture noktalarının SV kapsaması (canlı doğrulanmadı, anahtar harcanmadı) → ücretsiz metadata preflight
- Render free tier RAM ~512MB → hello-world deploy anında doğrulanır
- KVKK/ToS yorumları hukuki görüş değildir; README'de bu notla yer alır
