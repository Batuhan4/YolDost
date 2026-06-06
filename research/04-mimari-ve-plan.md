# 04 — Mimari ve 6 Saatlik Plan (Kentsel Saha Tespit Paneli)

> Cursor x ALT+TAB Hackathon — 6 Haziran 2026, İstanbul. Build penceresi 11:00–17:00.
> Bu doküman üç bölümden oluşur: (1) masterfabric-go derin incelemesi, (2) mimari önerisi, (3) saat-saat plan.
> Doğrulanamayan iddialar "varsayım" olarak işaretlenmiştir.

## İçindekiler
1. [masterfabric-go Derin İnceleme](#1-masterfabric-go-derin-i̇nceleme)
2. [Mimari Önerisi](#2-mimari-önerisi)
3. [6 Saatlik Plan](#3-6-saatlik-plan)

---

## 1. masterfabric-go Derin İnceleme

> Kaynak: `/tmp/masterfabric-go` yerel klonu (shallow, tek görünür commit: `836243e` — "feat: enhance dynamic routing and endpoint activation capabilities", 2 Mart 2026). Sürüm rozeti **0.0.1**, lisans **AGPL v3.0**. Toplam ~8.800 satır Go kodu.

### 1.1 Kimlik Kartı

| Özellik | Değer |
|---|---|
| Modül | `github.com/masterfabric-go/masterfabric` |
| Go sürümü | `go 1.25.5` (go.mod) — README "1.22+" diyor, Dockerfile `golang:1.22-alpine` kullanıyor (**uyumsuzluk**, bkz. 1.7) |
| HTTP framework | **chi v5** (`go-chi/chi/v5`) + `go-chi/cors`; stdlib `http.Server` + graceful shutdown |
| DB erişimi | **pgx/v5** (`pgxpool`) — **ORM yok**, repository'lerde ham SQL |
| Migration | **goose** SQL dosyaları (`internal/infrastructure/postgres/migrations/000NN_*.sql`, `+goose Up/Down` blokları). Uygulama **kendisi migration çalıştırmaz** — `make migrate` (goose CLI) veya `dev.sh` (sed+psql hilesi) ile dışarıdan |
| Config | Sadece env var + makul default'lar (`internal/shared/config/config.go`). **`DATABASE_URL` desteği YOK** — `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SSLMODE` ayrı ayrı |
| Auth | JWT (`golang-jwt/v5`) + bcrypt; `JWTAuth` middleware sadece korumalı grupta |
| Cache | Redis (go-redis/v9) — **opsiyonel**: bağlanamazsa `nil` ile devam eder, sadece warn loglar |
| Event bus | Arayüz: `internal/shared/events/bus.go`. Default **in-process bus** (channel tabanlı); `KAFKA_ENABLED=true` ile segmentio/kafka-go. Kafka olmadan tam çalışır |
| Validasyon | go-playground/validator + `validator.DecodeAndValidate(r, &req)` helper'ı |
| Loglama | `slog` JSON (`internal/shared/logger`) |
| Gözlemlenebilirlik | `/health/live`, `/health/ready` (pg+redis ping), `/metrics` (Prometheus), OTel setup |
| Hata modeli | `internal/shared/errors`: sentinel hatalar (`ErrNotFound`, `ErrValidation`…) + `DomainError{Kind,Message,Err}` + `HTTPStatusCode()` eşlemesi + `response.Error(w, err)` |
| API koleksiyonu | Postman koleksiyonu (37 request, auto-capture script'li) repoda hazır |

### 1.2 Klasör Ağacı (gerçek yapı)

```
cmd/server/main.go                 # giriş noktası: config→logger→otel→pg→redis→eventbus→deps→router→http.Server
internal/
  domain/<ctx>/                    # SAF Go, dış bağımlılık yok (uuid+time hariç)
    model/        (entity struct + status const + iş kuralı metodları)
    repository/   (arayüzler — sadece burada tanımlanır)
    event/        (domain event struct'ları)
    service/      (iam: AuthService/RBACService arayüzleri)
  application/<ctx>/
    dto/          (request/response DTO'ları, validate tag'li)
    usecase/      (her fiil ayrı dosya: create_workspace.go… struct + Execute(ctx, dto))
  infrastructure/
    postgres/<ctx>/   (pgx repo implementasyonları + migrations/)
    http/handler/<ctx>/handler.go  (chi handler metodları)
    http/router/router.go          (Dependencies struct + New(deps) → *chi.Mux)
    auth/  kafka/  gateway/interceptors/
  shared/           (config, database, cache, errors, events, logger,
                     middleware, pagination, response, validator, telemetry, version)
  gateway/          (dinamik endpoint pipeline: resolver, pipeline, dynamic_handler)
deployments/        (Dockerfile, docker-compose.yml: pg16+redis7+kafka KRaft+kafka-ui)
scripts/            (migrate.sh, test.sh, lint.sh, seed.go)
.cursor/rules/      (10 adet .mdc kural dosyası — mimari kalıplar YAZILI!)
.cursor/skills/base-pattern-documentation/SKILL.md
Makefile  dev.sh  .air.toml  postman/
```

Mevcut bounded context'ler: **iam**, **tenant**, **apimanagement**, **audit** + **gateway**. 12 migration dosyası (organizations, users, roles, apps, api_keys, endpoints, policies, audit_logs, workspaces).

Katman kuralı (repodaki `.cursor/rules/masterfabric-go-conventions.mdc`'den, `alwaysApply: true`):
`Domain → Application → Infrastructure`; domain hiçbir şeye bağımlı değil; arayüz domain'de tanımlanır, infrastructure'da implemente edilir; DI sadece constructor ile (`NewXxx`), global yok; `ctx` ilk parametre, `error` son dönüş; UUID'ler `google/uuid`; zaman `time.Now().UTC()`.

### 1.3 Boot ve Dayanıklılık Davranışı (bizim için kritik)

`cmd/server/main.go::run()` sıralaması: `config.Load()` → slog → OTel (hata = warn) → **Postgres (bağlanamazsa `db=nil` ile devam, sadece warn!)** → **Redis (aynı şekilde opsiyonel)** → event bus (Kafka kapalıysa in-process) → `buildDependencies()` → `router.New(deps)` → graceful shutdown'lı `http.Server`.

Yani: **Redis ve Kafka olmadan tam çalışır** — Render'da sadece Postgres yeter. Router'daki tüm handler kayıtları `if deps.X != nil` korumalı; DB yoksa API 404 döner ama süreç ayakta kalır ve `/health/live` 200 döner (Render health check'i için ideal).

Middleware zinciri: global olarak `RequestID → Logging → Recoverer → CORS(*)`; `JWTAuth + TenantResolver + GatewayPipeline` yalnızca `/api/v1` içindeki korumalı grupta. `/api/v1/auth/*` public grubu zaten mevcut → **bizim read-only dashboard endpoint'lerimizi aynı şekilde public bir grup olarak eklemek mimariye uygun** (sıfır JWT seremonisi).

### 1.4 Genişletme Kalıbı — "Yeni entity nasıl eklenir" (somut, repodan)

Repo bunu kendisi belgeliyor: `.cursor/rules/create-handler.mdc`, `create-usecase.mdc`, `create-infrastructure.mdc`, `create-endpoint.mdc`. En taze gerçek örnek **workspace** dikey dilimi (migration 00012). Yeni bir entity (ör. `detection`) için oluşturulacak dosyalar, kalıp birebir:

| # | Dosya | İçerik (workspace örneğinden kalıp) |
|---|---|---|
| 1 | `internal/domain/<ctx>/model/detection.go` | struct + `Status` string-const'ları + iş metodu (`IsActive()`) |
| 2 | `internal/domain/<ctx>/repository/detection_repository.go` | sadece arayüz: `Create/GetByID/List…(ctx, …)` |
| 3 | `internal/application/<ctx>/dto/detection_dto.go` | `CreateDetectionRequest` (`validate:"required"` tag'li) + `DetectionInfo` |
| 4 | `internal/application/<ctx>/usecase/create_detection.go` | `CreateDetectionUseCase{repo, eventBus}` + `Execute(ctx, req) (*dto.Info, error)`; sonda `eventBus.Publish(ctx, topic, event)` |
| 5 | `internal/infrastructure/postgres/<ctx>/detection_repository.go` | pgx impl; başta derleme-zamanı guard: `var _ repository.DetectionRepository = (*DetectionRepository)(nil)`; ham SQL, `pgx.ErrNoRows → domainErr.ErrNotFound` |
| 6 | `internal/infrastructure/postgres/migrations/00013_create_detections.sql` | `-- +goose Up/Down` + `StatementBegin/End` blokları, index'ler dahil |
| 7 | `internal/infrastructure/http/handler/<ctx>/handler.go` | `validator.DecodeAndValidate` → `uc.Execute` → `response.Created/JSON`, hata: `response.Error(w, err)` |
| 8 | `internal/infrastructure/http/router/router.go` | `Dependencies`'e handler alanı + `r.Route("/detections", …)` kaydı |
| 9 | `cmd/server/main.go::buildDependencies` | `repo := pg.NewDetectionRepo(db)` → `uc := NewCreateDetectionUseCase(repo, eventBus)` → `deps.DetectionHandler = handler.NewHandler(uc, repo)` |

Handler gövdesi kalıbı (repodaki `tenant/handler.go::CreateOrg`'dan):
```go
func (h *Handler) CreateX(w http.ResponseWriter, r *http.Request) {
    var req dto.CreateXRequest
    if err := validator.DecodeAndValidate(r, &req); err != nil {
        response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
        return
    }
    result, err := h.createXUC.Execute(r.Context(), req)
    if err != nil { response.Error(w, err); return }
    response.Created(w, result)
}
```

Liste endpoint'lerinde hazır pagination var: `params := pagination.FromRequest(r)` (`?offset=&limit=`) → `pagination.NewResult(items, params, total)`.

**Bonus — dinamik gateway:** `POST /api/v1/organizations/{orgId}/apps/{appId}/endpoints` ile runtime'da generic CRUD endpoint'i tanımlanabiliyor (tablonun `organization_id`+`app_id` kolonu olmalı, JWT + `X-App-ID` header gerekli). Demo jürisine "mimarinin gateway'i de çalışıyor" göstermek için opsiyonel vitrin; MVP akışında **kullanmıyoruz** (kendi handler'larımız hem hızlı hem KVKK akışına özel).

### 1.5 Geliştirme Araçları

- `./dev.sh` → docker compose (pg+redis+kafka+kafka-ui) + migration + **air hot-reload** (otomatik kurar). `./dev.sh server` sadece sunucu; `./dev.sh migrate` sadece migration.
- `dev.sh::run_migrations()` hilesi: goose CLI'sız migration — `sed -n '/^-- +goose Up$/,/^-- +goose Down$/p' dosya.sql | sed '1d;$d' | psql …`. **Aynı hile Render Postgres'e laptop'tan migration basmak için birebir kullanılabilir** (goose kurmaya bile gerek yok; `psql "$DATABASE_URL" -f` benzeri).
- `Makefile`: `build run test lint migrate migrate-down migrate-status docker-up docker-down docker-build clean seed`.
- `make test` → `go test -race ./...`; shared paketlerde (errors, config, validator, pagination, events) ve interceptor'larda gerçek testler mevcut (`TEST_RESULTS.md` hepsi yeşil diyor).
- Dockerfile: 2 aşamalı, `CGO_ENABLED=0`, binary + migrations'ı `/app/migrations`'a kopyalar (ama **entrypoint migration çalıştırmaz**), `EXPOSE 8080`.

### 1.6 En Hızlı Bootstrap Reçetesi (tahmini 10-15 dk)

1. `git clone … backend/` (veya repo köküne kopyala) → `rm -rf .git` → kendi repona ekle.
2. **Modül adını DEĞİŞTİRME** — `github.com/masterfabric-go/masterfabric` kalsın. Deploy edilen binary için modül yolu ≠ repo URL sorun değildir; ~60 dosyada import düzeltme riskine girmeye değmez. (İstenirse tek satır: `grep -rl 'masterfabric-go/masterfabric' --include='*.go' . | xargs sed -i 's|eski|yeni|g'` + go.mod, ~2 dk; ama hata yüzeyi açar — önerilmez.)
3. Hiçbir şey silme: IAM/tenant/gateway dursun (mimari uyum puanına kanıt), Redis/Kafka zaten yokken gracefully çalışıyor.
4. Yeni bounded context ekle: `inspection` (model+repository+dto+usecase+postgres+handler) — 1.4'teki 9 dosya kalıbıyla.
5. Migration'lar: 00001-00012 aynen + bizim `00013+` dosyalarımız. Render Postgres'e laptop'tan `psql $EXTERNAL_DATABASE_URL` ile bas (1.5'teki sed hilesi veya `go install github.com/pressly/goose/v3/cmd/goose@latest`).
6. Render'a `deployments/Dockerfile` ile deploy (runtime: Docker) — önce 1.7'deki Go sürüm düzeltmesini yap.

### 1.7 Görünür Pürüzler ve Çözümler

| Pürüz | Etki | Çözüm |
|---|---|---|
| **go.mod `go 1.25.5` vs Dockerfile `golang:1.22-alpine`** | Docker build, GOTOOLCHAIN=auto ile 1.25.5 toolchain'i indirmeye çalışır → yavaş build; kısıtlı ağda hata | Dockerfile'da base'i `golang:1.25-alpine` yap (tek satır). İlk işlerden biri |
| **`DATABASE_URL` desteği yok** | Render Postgres tek URL verir | (a) Render dashboard'daki host/user/pass/db değerlerini `DB_*` env'lerine elle gir, veya (b) `config.Load()`'a 8 satırlık "önce `DATABASE_URL` varsa parse et" eki (mimariyi bozmaz, config sınırı içinde). **(b) önerilir** — tek env ile her ortam |
| **Render `PORT` env'i ≠ `SERVER_PORT`** | Render web servisi `PORT`'a bind bekler | Render env'ine `SERVER_PORT=10000` koy (Render default PORT=10000) veya config'e `PORT` fallback ekle |
| Migration'ları uygulama çalıştırmıyor | İlk deploy'da tablolar yok | Laptop'tan external URL ile psql/goose; DB-bağımlı handler'lar nil-guard'lı olduğu için migration gecikse bile servis ayakta kalır |
| `/api/v1` korumalı grupta JWT zorunlu | Dashboard read endpoint'leri için token seremonisi | Bizim route'ları public bölüme ekle (auth route'ları gibi) — router yapısı buna zaten izin veriyor |
| `DB_SSLMODE` default `disable` | Render Postgres external bağlantı TLS ister | Render env: `DB_SSLMODE=require` |
| Workspaces migration'ı `TIMESTAMP` kullanıyor (timestamptz değil) | Kozmetik | Kendi tablolarımızda `TIMESTAMPTZ` kullan, kalıba sadakat bozulmaz |
| AGPL v3 lisans | Türev backend kaynak açık kalmalı | Hackathon repo'su zaten public — sorun değil; LICENSE'ı koru |
| Shallow klon, tek commit | Upstream olgunluk tarihçesi görünmüyor | Davranışı kod+testlerden doğruladık; CHANGELOG kapsamlı, riskli sürpriz düşük (varsayım: upstream'de breaking değişiklik yok) |
| `.air.toml` pre_cmd `lsof` kullanıyor | Linux'ta lsof yoksa hot-reload pre_cmd uyarısı | Zararsız (`\|\| true` var); gerekirse satırı sil |

**Hackathon kozu:** Repo kendi `.cursor/rules/*.mdc` dosyalarıyla geliyor (conventions `alwaysApply`). Backend klasöründe Cursor açıldığında ajan bu kuralları otomatik yükler → "masterfabric mimarisine birebir uyum" hem zorlanmış hem **kanıtlanabilir** olur (jüriye `.cursor/rules` + dikey dilim dosya listesi gösterilir).

---

## 2. Mimari Önerisi

### 2.0 Kuşbakışı

```mermaid
flowchart LR
    subgraph Laptop["Laptop (CV Worker — Python .venv)"]
        W[worker.py<br/>poll: FOR UPDATE SKIP LOCKED]
        M["yolov8_face.pt + yolov8_plate.pt (blur gate)<br/>oiv7 + rdd2022 (tespit)"]
        W --> M
    end
    subgraph Google["Google"]
        SV[Street View Static API<br/>pano_id ile deterministik fetch]
    end
    subgraph Render["Render.com"]
        GO[Go API — masterfabric-go<br/>chi + pgx, public read endpoints]
        PG[(Render Postgres<br/>DATABASE_URL)]
        GO <--> PG
    end
    subgraph Vercel["Vercel"]
        UI[Next.js dashboard<br/>react-leaflet + OSM]
    end
    EXPO[Expo Go<br/>tek ekran liste]
    UI -- "NEXT_PUBLIC_API_BASE_URL" --> GO
    EXPO -- "EXPO_PUBLIC_API_BASE_URL" --> GO
    UI -- "POST /jobs (ingest)" --> GO
    W -- "external DATABASE_URL (sslmode=require)" --> PG
    W -- "fetch (RAM'de işlenir, ham asla diske/DB'ye yazılmaz)" --> SV
```

Akış: Dashboard'dan `POST /api/v1/jobs` (pano_id/koordinat) → satır `queued` → laptop'taki Python worker kuyruğu çeker → Street View görüntüsünü **RAM'de** indirir → yüz+plaka blur (geri döndürülemez) → konteyner/yol hasarı tespiti → **yalnızca blurlanmış JPEG** + tespitler + anonimleştirme sayaçları Postgres'e yazılır → dashboard harita/listede gösterir. Ham görüntü hiçbir kalıcı ortama değmez (KVKK); blurlu türevler de repo'ya girmez (SV ToS) — sadece DB'de ve gitignore'lu `demo_cache/`te.

### 2.1 CV Worker Kararı

Render free tier doğrulanmış kısıtları: web servisi **15 dk trafiksizlikte uyur, uyanma ~1 dk**; ayda 750 saat; **kalıcı disk YOK**; free Postgres **1 GB / 30 gün ömür** (bugün için bol bol yeter). Free instance RAM'i resmi sayfada JS nedeniyle doğrulanamadı; yaygın bilinen değer **512 MB / 0.1 vCPU** (varsayım — tasarım buna göre muhafazakâr). Native runtime build ortamında `python3-pip` listede var ama Go runtime'ının **deploy** ortamında Python garantisi yok (varsayım); zaten belirleyici değil — torch+ultralytics kurulumu (~2 GB) ve RAM ihtiyacı free instance'ı her durumda eler.

| Seçenek | Nasıl | Verdikt |
|---|---|---|
| (1) Go `exec.Command` → Python (aynı serviste) | Docker image'a Go + torch + ultralytics + 3 model gömülür | ❌ Image ~2-3 GB, build uzun; her exec'te torch import (~10-20 sn) + ~1 GB+ geçici RAM → free/starter'da OOM. 0.1 vCPU'da inference saniyeler sürer. 6 saatlik bütçeyi yer |
| (2) Python worker Render'da (jobs tablosunu poll'lar) | Ayrı servis; background worker free'de yok (varsayım), web servisi gibi deploy edilir | ❌ torch resident ~400-700 MB RSS → 512 MB sınırında OOM ruleti; 0.1 vCPU yavaş. Çaresizlik yedeği bile değil |
| (3) Python FastAPI sidecar (Render'da 2. servis) | Go → HTTP → FastAPI | ❌ (2) ile aynı RAM sorunu + iki cold start zinciri + bir deploy riski daha |
| (4) **Laptop'ta Python worker → cloud Postgres** | worker.py Render PG'nin external URL'ine bağlanır, `FOR UPDATE SKIP LOCKED` ile kuyruk çeker | ✅ **BİRİNCİL.** Ölçülmüş gerçek hız (blur 30-35 ms, tespit 43 ms/img); sıfır deploy riski; modeller zaten yerelde; gelen porta ihtiyaç yok (sadece outbound PG) → jüri-geçirmez: bulut URL'leri laptop kapansa bile çalışır çünkü veri zaten DB'de |

**Birincil mimari:** Vercel(Next.js) + Render(Go API) + Render Postgres + **laptop CV worker**. Worker'ın tek bağımlılığı dışa giden 5432 bağlantısı (`sslmode=require`); HTTP sunmadığı için tünel/ngrok gerekmez. Canlı demo anı: jüri önünde dashboard'dan yeni pano ingest → worker terminalinde log akışı → 2-3 sn içinde haritada yeni tespit. Laptop o an çevrimdışı olsa bile önceden işlenmiş ~15 fixture tüm UI'ı ayakta tutar.

**Geri çekilme merdiveni (her basamak bir öncekinin tetiklenmiş hâli):**

| Basamak | Tetik | Konfigürasyon |
|---|---|---|
| R0 (hedef) | — | Vercel UI + Render Go (native Go runtime) + Render PG + laptop worker |
| R1 | Render **native** Go build kırmızı (Go 1.25 toolchain sorunu vb.) | Aynı servis **Docker** runtime'a çevrilir (`deployments/Dockerfile`, base `golang:1.25-alpine`'a yükseltilmiş) — veya tersi: Docker kırmızıysa native'e dön |
| R2 | 3:30 kapısında Render web servisi hâlâ yeşil değil | Go API **laptop'ta** çalışır; Vercel UI yerine laptop'ta `next dev`; `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`. Render PG ayaktaysa DB bulutta kalır (DDL/veri kaybı yok). Vercel'de statik landing/KVKK sayfası durur |
| R3 | Render PG de yok/expire | `deployments/docker-compose.yml` ile **lokal Postgres** (repoda hazır); `DATABASE_URL=postgres://masterfabric:masterfabric@localhost:5432/masterfabric`. Her şey lokal, demo laptop ekranından/projektörden |

Not (R0 deploy yöntemi): CV laptop'ta olduğu için Go servisinin Python'a hiç ihtiyacı yok → **native Go runtime** en az sürtünmeli yol (build: `go build -o app ./cmd/server`, start: `./app`). Dockerfile'daki `golang:1.22` vs `go.mod 1.25.5` uyumsuzluğunu da tamamen bypass eder. Render'da Go sürümü go.mod'dan/`GO_VERSION` env'den seçilir (varsayım — build loguna ilk deploy'da bakılır; sorun olursa R1 Docker).

Spin-down önlemi: demo öncesi ve sırasında laptop'tan `while true; do curl -s $RENDER_URL/health/live > /dev/null; sleep 240; done` (free tier 15 dk boşlukta uyur, uyanma ~1 dk — jüri önünde yaşanmaz).

### 2.2 Blurlu Görüntü Depolama Kararı

**Öneri: Postgres `BYTEA` + Go endpoint'i `GET /api/v1/images/{jobId}`.**

Gerekçe: ≤20 fixture × 640×640 JPEG (~60-120 KB) ≈ **2-3 MB toplam** → 1 GB free PG için ihmal edilebilir. Tek veri deposu (tespitlerle aynı transaction'da yazılır), ek hesap/secret yok, KVKK denetimi tek yerde ("DB'de yalnızca blurlu bayt var" cümlesi jüriye net kanıt). Vercel `<img src={API_BASE}/api/v1/images/{id}>` ile doğrudan gösterir; Go handler `Content-Type: image/jpeg` + `Cache-Control: public, max-age=86400` koyar (tarayıcı cache'i spin-down maliyetini amorti eder).

Elenenler: Render kalıcı disk (**free'de yok — doğrulandı**); S3/R2 (hesap+SDK+secret = zaman); JSON içinde base64 (payload şişer, cache yok); repo'ya commit (SV ToS ihlali — yasak); Vercel `public/` (aynı ToS sorunu + görüntü başına redeploy).

### 2.3 REST Endpoint'leri (masterfabric kalıbında, public grupta)

Bounded context: `inspection`. Route'lar router.go'da `/api/v1/auth` gibi **JWT'siz public grupta** kaydedilir (read-only panel + tek ingest POST; hackathon demosunda token seremonisi yok). masterfabric'in `/health/live` ve `/health/ready`'si aynen kalır; `/healthz` alias'ı `r.Get("/healthz", healthHandler.Liveness)` ile eklenir.

| Method | Path | Amaç | Yanıt |
|---|---|---|---|
| GET | `/healthz` (+ mevcut `/health/live`, `/health/ready`) | Render health check + jüri | `{"status":"alive"}` |
| POST | `/api/v1/jobs` | Ingest: pano_id veya koordinat kuyruğa | 202 + job |
| GET | `/api/v1/jobs` | İş listesi (sayfalı) | `pagination.NewResult` |
| GET | `/api/v1/jobs/{id}` | İş detayı + sayaçlar | job + counts |
| GET | `/api/v1/detections` | Filtreli tespit listesi (`?class=&job_id=&min_conf=&limit=&offset=`) | liste |
| GET | `/api/v1/stats` | Sınıf bazlı sayım + anonimleştirme toplamları | özet |
| GET | `/api/v1/images/{jobId}` | Blurlu kanıt JPEG (bytea) | `image/jpeg` |

JSON eskizleri:

```jsonc
// POST /api/v1/jobs  (validator: pano_id veya lat+lng zorunlu)
{ "pano_id": "CIHM0ogKEICAgID...", "lat": 41.0185, "lng": 28.8839,
  "heading": 90, "note": "Güngören, Mareşal Çakmak Cd." }
// → 202
{ "id": "6f1c…", "status": "queued", "pano_id": "CIHM…", "created_at": "2026-06-06T09:12:00Z" }

// GET /api/v1/jobs/6f1c…
{ "id": "6f1c…", "status": "done", "pano_id": "CIHM…", "lat": 41.0185, "lng": 28.8839,
  "image": { "url": "/api/v1/images/6f1c…", "width": 640, "height": 640 },
  "anonymization": { "faces_blurred": 2, "plates_blurred": 1, "model_id": "yolov8_face+yolov8_plate" },
  "detections": [
    { "id": "a3…", "class_name": "waste_container", "confidence": 0.87,
      "x": 412, "y": 305, "w": 96, "h": 110, "model_id": "shirabendor/YOLOV8-oiv7" },
    { "id": "b7…", "class_name": "road_damage_D20", "confidence": 0.71,
      "x": 120, "y": 480, "w": 210, "h": 60, "model_id": "rezzzq/yolo12s-road-damage-rdd2022" } ],
  "started_at": "…", "finished_at": "…" }

// GET /api/v1/stats
{ "jobs": { "queued": 0, "processing": 0, "done": 14, "failed": 1 },
  "detections_by_class": { "waste_container": 23, "road_damage_D00": 4, "road_damage_D20": 7, "billboard": 11 },
  "anonymization": { "total_faces_blurred": 31, "total_plates_blurred": 18, "images_processed": 14 } }
```

bbox formatı: **piksel cinsinden x,y,w,h** + job'da `image.width/height` → UI'da SVG overlay hesabı tek çarpma.

Genişletme dosyaları (Bölüm 1.4 kalıbı, context=`inspection`): `domain/inspection/model/{job.go,detection.go,anonymization_event.go}`, `domain/inspection/repository/*.go`, `application/inspection/{dto,usecase}/…` (`create_job.go`, `get_job.go`, `list_detections.go`, `get_stats.go`), `infrastructure/postgres/inspection/*.go`, `infrastructure/http/handler/inspection/handler.go`, router + main.go kaydı, `migrations/00013_create_inspection.sql`.

### 2.4 Render Postgres DDL (15 dakikada yazılabilir, tek migration)

`internal/infrastructure/postgres/migrations/00013_create_inspection.sql`:

```sql
-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS image_sources (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pano_id       TEXT UNIQUE,                      -- deterministik fetch anahtarı
    lat           DOUBLE PRECISION NOT NULL,
    lng           DOUBLE PRECISION NOT NULL,
    heading       INT NOT NULL DEFAULT 0,
    pitch         INT NOT NULL DEFAULT 0,
    fov           INT NOT NULL DEFAULT 90,
    capture_date  TEXT,                             -- SV metadata "date" (YYYY-MM)
    source        TEXT NOT NULL DEFAULT 'street_view',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processing_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_source_id UUID NOT NULL REFERENCES image_sources(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','processing','done','failed')),
    requested_by    TEXT NOT NULL DEFAULT 'dashboard',
    error           TEXT,
    blurred_jpeg    BYTEA,                          -- YALNIZCA blurlu türev; ham asla
    image_width     INT,
    image_height    INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ
);
CREATE INDEX idx_jobs_status_created ON processing_jobs(status, created_at);
CREATE INDEX idx_jobs_source ON processing_jobs(image_source_id);

CREATE TABLE IF NOT EXISTS detections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id      UUID NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
    class_name  TEXT NOT NULL,                      -- waste_container | road_damage_D00/D10/D20/D40 | billboard | street_light
    confidence  REAL NOT NULL,
    x INT NOT NULL, y INT NOT NULL, w INT NOT NULL, h INT NOT NULL,   -- piksel bbox
    model_id    TEXT NOT NULL,                      -- HF model kimliği (kanıt)
    lat         DOUBLE PRECISION,                   -- harita için denormalize
    lng         DOUBLE PRECISION,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_detections_class ON detections(class_name);
CREATE INDEX idx_detections_job ON detections(job_id);

CREATE TABLE IF NOT EXISTS anonymization_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id         UUID NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
    faces_blurred  INT NOT NULL DEFAULT 0,          -- sadece SAYI; KVKK: içerik yok
    plates_blurred INT NOT NULL DEFAULT 0,
    model_id       TEXT NOT NULL,                   -- 'yolov8_face.pt+yolov8_plate.pt'
    duration_ms    INT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_anon_job ON anonymization_events(job_id);

CREATE TABLE IF NOT EXISTS demo_runs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,                      -- 'pre-warm-1612', 'live-demo'
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    notes       TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor      TEXT NOT NULL DEFAULT 'system',      -- 'dashboard' | 'worker' | 'system'
    action     TEXT NOT NULL,                       -- 'job.created' | 'job.anonymized' | 'job.done' | 'job.failed'
    entity     TEXT NOT NULL,
    entity_id  UUID,
    payload    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_created ON audit_events(created_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS demo_runs;
DROP TABLE IF EXISTS anonymization_events;
DROP TABLE IF EXISTS detections;
DROP TABLE IF EXISTS processing_jobs;
DROP TABLE IF EXISTS image_sources;
-- +goose StatementEnd
```

Worker kuyruk çekme deseni (Python, psycopg):

```sql
UPDATE processing_jobs SET status='processing', started_at=NOW()
WHERE id = (SELECT id FROM processing_jobs WHERE status='queued'
            ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
RETURNING id, image_source_id;
```

Tek worker'da bile doğru; ikinci worker açılırsa da yarışsız. Worker bağımlılığı: `.venv`'e `pip install "psycopg[binary]"` (+ `requests` muhtemelen ultralytics ile geliyor — yoksa ekle).

### 2.5 Next.js Dashboard (Vercel)

**Harita kütüphanesi kararı: `react-leaflet` + OpenStreetMap tile.** Gerekçeler: (a) istemcide Google Maps JS API key'i gerekmez — bir secret, bir billing/referrer konfigürasyonu eksik; SV Static key'i sadece laptop worker'da kalır; (b) npm 7-gün kuralına takılmayan yıllanmış stabil sürümler: `leaflet@1.9.4`, `react-leaflet@4.2.1` (React 18 ile) — varsayım: bu pinler temiz çözülür; (c) `@vis.gl/react-google-maps` tema olarak "Google" hikâyesine uyar ama key+billing+yeni-paket riski 6 saatte gereksiz. Not: blurlu SV türevleri gösterilirken altta "Imagery © Google" atıf satırı eklenir.

**App Router tuzağı (bilinen, planlanmış):** Leaflet `window`'a dokunur → harita bileşeni **mutlaka** `'use client'` + SSR kapalı dinamik import ile yüklenir:

```tsx
const DetectionMap = dynamic(() => import('@/components/DetectionMap'), { ssr: false });
```

Ek olarak: `leaflet/dist/leaflet.css` import'u bileşen içinde; default marker ikonları bundler altında 404 verir → `L.divIcon` ile sınıf-renkli daire marker (ikon dosyası derdi tamamen biter, sınıf başına renk de bedavaya gelir).

| Sayfa | İçerik | Veri |
|---|---|---|
| `/` | Tam ekran harita (Güngören merkezli, ~41.018/28.882, zoom 15) + sınıf filtre çipleri + üstte 3-4 stat kartı | `GET /detections`, `GET /stats` |
| `/jobs` | İş tablosu: durum rozeti, pano_id, tespit sayısı, süre | `GET /jobs` |
| `/jobs/[id]` | **Blurlu görüntü + SVG bbox overlay** + anonimleştirme sayaç kartı ("2 yüz, 1 plaka maskelendi") + tespit listesi | `GET /jobs/{id}`, `<img src=…/images/{id}>` |
| `/kvkk` | Statik: anonimleştirme politikası, model kimlikleri, "ham veri kalıcılaştırılmaz" beyanı, canlı sayaçlar | `GET /stats` |

bbox overlay deseni (state kütüphanesi yok, salt `useState`+`fetch`):

```tsx
<div className="relative inline-block">
  <img src={`${API}/api/v1/images/${job.id}`} width={job.image.width} />
  <svg className="absolute inset-0" viewBox={`0 0 ${job.image.width} ${job.image.height}`}>
    {job.detections.map(d => (
      <rect key={d.id} x={d.x} y={d.y} width={d.w} height={d.h}
            fill="none" stroke={colorFor(d.class_name)} strokeWidth={3} />
    ))}
  </svg>
</div>
```

Sürüm pinleri (7-gün kuralına güvenli, hepsi yıllanmış): `next@14.2.x`, `react@18.3.1`, `leaflet@1.9.4`, `react-leaflet@4.2.1`, `tailwindcss@3.4.x` (create-next-app default'u). `create-next-app@14` ile kur; `@latest` çekip 7-gün kuralıyla sürprize düşme (varsayım: 14.2.x çözülür; çözülmezse create-next-app'in verdiği sürümde kal).

### 2.6 Expo (minimal, ~30-45 dk)

**Karar: sadece liste, harita yok.** Tek ekran `FlatList`: tespit satırı = sınıf rozeti + güven skoru + koordinat + **blurlu küçük görsel** (`Image source={{uri: API/images/jobId}}`) + pull-to-refresh. Jürinin telefonunda Expo Go QR ile açılır — "aynı Go API'yi mobil de tüketiyor" kutusu 10 dakikalık kodla işaretlenir; blurlu kanıtın telefonda görünmesi KVKK hikâyesini güçlendirir. Kamera YOK (KVKK riski + süre), react-native-maps YOK (config+test süresi listeye değmez; UI zaten haritayı web'de gösteriyor). Süre artarsa P2: aynı ekrana `expo install react-native-maps` ile marker'lı mini harita (~20 dk, orta risk — sadece her şey yeşilse).

Kurulum: `npx create-expo-app@latest mobile --template blank` (7-gün kuralı: latest zaten >7 gün eski sürüme çözülür); `EXPO_PUBLIC_API_BASE_URL` ile fetch.

### 2.7 .env Haritası (bileşen başına)

| Bileşen | Değişken | Değer/Kaynak |
|---|---|---|
| **Go API (Render)** | `DATABASE_URL` | Render PG **internal** URL (config.go'ya 8 satırlık DATABASE_URL-öncelikli parse eklenir — bkz. 1.7) |
| | `SERVER_PORT` | `10000` (Render default PORT beklentisi) |
| | `DB_SSLMODE` | `require` (DATABASE_URL parse'ı kullanılmazsa `DB_*` setiyle birlikte) |
| | `LOG_LEVEL` / `LOG_FORMAT` | `info` / `json` |
| | `JWT_SECRET` | rastgele (kullanılmıyor ama default'la kalmasın) |
| | `KAFKA_ENABLED` | set etme (default `false` → in-process bus) |
| **CV worker (laptop, `.env` gitignore'lu)** | `DATABASE_URL` | Render PG **external** URL (`?sslmode=require`) |
| | `GOOGLE_MAPS_API_KEY` | Street View Static API key (sadece burada yaşar; asla istemciye/Vercel'e gitmez) |
| | `MODELS_DIR` | `./models` (yolov8_face.pt, yolov8_plate.pt, oiv7, rdd2022) |
| | `DEMO_CACHE_DIR` | `./demo_cache` (gitignore'lu; blurlu kopya + debug) |
| | `POLL_INTERVAL_MS` | `1500` |
| **Next.js (Vercel)** | `NEXT_PUBLIC_API_BASE_URL` | `https://<servis>.onrender.com` (R2 fallback'te `http://localhost:8080`) |
| **Expo** | `EXPO_PUBLIC_API_BASE_URL` | Render URL (telefondan erişilebilir olmalı → localhost değil; R2'de laptop LAN IP'si) |

Kural: hiçbir secret commit edilmez; `*.env*` zaten gitignore'da; SV key yalnızca laptop worker'da → Vercel/Render/repo'da Google key'i hiç yok (Render'a SV fetch taşınmadığı sürece — taşınmıyor).

---

## 3. 6 Saatlik Plan (11:00–17:00)

### 3.0 Kritik Yol ve Paralellik İlkeleri

**Kritik yol:** Render PG tahsisi → DDL → Go API read endpoint'leri → Vercel UI. CV worker bu yolu **beslemez, süslemez** — UI fixture/seed satırlarıyla da geliştirilebilir; bu yüzden CV gecikmesi UI'ı bloklamaz.

İlkeler:
1. **Saat 0'da bulut de-risk:** Render PG + Render hello (masterfabric as-is) + Vercel hello deploy'ları İLK yarım saatte başlatılır. Deploy süreleri beklerken kod yazılır; "5. saatte ilk deploy" felaketi tanım gereği imkânsızlaşır.
2. **CV her zaman lokal dosyalara karşı geliştirilir** (repo'daki test görüntüleri); SV entegrasyonu pipeline'ın sadece "kaynak" ucu — en son takılır, takılırsa kopartılır.
3. **Her slot ≥1 anlamlı commit** (jüri history okur). Mesajlar aşağıdaki tabloda.
4. **Her saat başı GO/NO-GO kapısı**, tetiklenen fallback geri alınmaz (karar yorgunluğu yok): bir kez R2'ye inildiyse Render'a dönüş yok, demo parlatılır.
5. **Fixture preflight bedava:** SV **metadata** endpoint'i ücretsiz → 15 Güngören noktasının pano_id'leri saat 0'da güvence altına alınır; görüntü kotasına (10k/ay zaten bol) tek dokunuş işleme anında olur.

### 3.1 Saat-Saat Tablo

| Saat | Görev (paralel izler) | Teslimat | Commit mesajı (örnek) | Risk | Fallback |
|---|---|---|---|---|---|
| **0:00–0:30** | **(A)** Monorepo iskeleti: `backend/` ← masterfabric kopyası (+Dockerfile go1.25 fix, +config DATABASE_URL parse), `web/` ← `create-next-app@14`, `worker/` boş py modülü. **(B)** Render: PG oluştur + backend'i native Go ile hello deploy başlat (env: SERVER_PORT=10000, DATABASE_URL, DB_MAX_CONNS=5); Vercel: web hello deploy. **(C)** SV metadata preflight: 15 Güngören koordinatı → `fixtures/panos.json` (pano_id+lat/lng; ücretsiz) | İki bulut URL'i ayağa kalkıyor; pano listesi hazır | `chore: scaffold monorepo on masterfabric-go architecture` / `feat(fixtures): Güngören pano preflight (metadata only)` | Render build sürprizi | Build kırmızı → R1 (Docker); PG gecikirse lokal compose PG ile devam, DDL sonra tekrar basılır |
| **GATE G0 (0:30)** | `psql $RENDER_PG` bağlanıyor mu? `/health/live` Render'da 200 mü? | | | | Hayırsa: işaretle, 3:30 kapısına kadar arka planda kurcala; kodu bloklama |
| **0:30–1:30** | **(A)** `00013_create_inspection.sql` yaz, Render PG'ye psql ile uygula (15 dk). **(B)** `worker/anonymize.py`: face+plate blur gate, **lokal test görüntüleriyle**; sayaç çıktısı; `demo_cache/` çıktıları göz kontrolü | Blurlu örnek çıktılar + boş ama doğru şema | `feat(db): inspection schema (jobs, detections, anonymization_events)` / `feat(worker): irreversible face+plate blur gate with KVKK counters` | Blur kalitesi (kaçan yüz) | Confidence eşiğini düşür (recall öncelikli; yanlış-pozitif blur KVKK'da bedava); olmadı sadece face modeliyle devam |
| **GATE G1 (1:30)** | 3 test görüntüsünde yüz+plaka göz kontrolüyle maskeli mi? | | | | Hayırsa tespit slotundan 15 dk çal; blur MVP'nin pazarlık edilmez parçası |
| **1:30–2:30** | `worker/pipeline.py`: SV fetch (pano_id, RAM'de) → blur → oiv7+rdd2022 tespit → PG'ye tek transaction (bytea+detections+anon_events+audit). `FOR UPDATE SKIP LOCKED` poll döngüsü. İlk 5 fixture'ı uçtan uca işle | Render PG'de gerçek tespit satırları + blurlu bytea | `feat(worker): SV fetch→blur→detect→persist pipeline (raw never stored)` | SV key/kota sürprizi; oiv7 sınıf eşleme | SV takılırsa lokal görüntülerle DB'yi doldur (pipeline ucu aynı), SV'yi 5:15 slotuna it; oiv7 konteyner sınıfı zayıfsa eşik düşür + P1 billboard'u öne çek |
| **GATE G2 (2:30)** | `SELECT count(*) FROM detections` > 0 (Render PG'de)? | | | | Hayırsa: lokal-görüntü fallback'i ZORUNLU tetiklenir; SV'ye bir daha dönülmez |
| **2:30–3:30** | Go API: `inspection` bounded context — 9-dosya kalıbı (Bölüm 1.4/2.3): POST `/jobs`, GET `/jobs`, `/jobs/{id}`, `/detections`, `/stats`, `/images/{id}`, `/healthz`. Önce laptop'ta external PG URL ile doğrula, sonra Render'a push | Render URL'inde gerçek JSON + JPEG dönüyor | `feat(api): inspection context endpoints following masterfabric vertical-slice pattern` | bytea servis hatası; Render redeploy süresi | bytea sorunsa görüntüyü base64 JSON alanına düşür (çirkin ama çalışır), sonra düzelt |
| **GATE G3 (3:30) — EN KRİTİK** | Render'daki `/api/v1/detections` gerçek veri dönüyor mu? | | | | Hayırsa → R1 Docker'a çevir (15 dk dene); **4:00'te hâlâ kırmızıysa → R2 kilitle:** Go API laptop'ta, `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`, Render'la uğraşma biter |
| **3:30–4:30** | Next.js: `/` (react-leaflet harita, divIcon sınıf-renkli marker, filtre çipleri, stat kartlar), `/jobs/[id]` (blur+SVG bbox overlay + anon sayaç kartı), `/jobs`, `/kvkk`. `dynamic(ssr:false)` tuzağı baştan uygulanır | Lokal `next dev` Render API'sinden canlı harita gösteriyor | `feat(web): detection map + blurred evidence viewer + KVKK page` | Leaflet SSR/ikon tuzakları; zaman | Harita 30 dk'da oturmazsa → liste-önce UI (tablo+detay mükemmel olsun), harita stat kartına döner |
| **GATE G4 (4:30)** | Tarayıcıda harita + en az bir iş detayında blurlu kanıt + bbox görünüyor mu? | | | | Hayırsa harita kes, detay sayfası + KVKK sayfasına yatırım (demo hikâyesi orada) |
| **4:30–5:15** | **(A)** Vercel prod deploy (env set) + telefonda smoke test. **(B)** Expo: tek ekran FlatList + blurlu thumbnail (30 dk kutusu — 5:00'te bitmezse KES, mobil bonus'tur). **(C)** Kalan tüm fixture'ları ingest (pre-warm doldurma) | Yayında: Vercel URL + Expo QR | `feat(mobile): expo detections list over same API` / `chore: production env wiring` | Expo zaman yutar | 5:00 kuralı acımasız uygulanır; Expo yoksa demo cümlesi "API mobile-ready, Postman'de gösterelim" |
| **GATE G5 (5:15)** | E2E: Vercel→Render→PG zinciri telefonda çalışıyor mu? | | | | Zincirde tek kırık halka varsa 5:15-6:00 tamamen ona harcanır, bonus iptal |
| **5:15–6:00** | **Demo pre-warm:** `demo_runs('final-prewarm')` kaydıyla tüm fixture'lar işlenmiş; keep-alive curl döngüsü başlat (free tier 15 dk'da uyur!); 90 sn demo provası 2 kez. README: mermaid mimari, KVKK bölümü, `.cursor/rules` mimari-uyum kanıtı, kurulum | Prova edilmiş demo + jüri-hazır README | `docs: architecture, KVKK pipeline, masterfabric compliance evidence` | — | Artan süre → bonus sırası: canlı-ingest demosu provası > Expo harita > stats grafiği |

### 3.2 Demo Senaryosu (17:00 sonrası, 90 saniye)

1. **Vercel URL** → harita: Güngören'de sınıf-renkli marker'lar; "konteyner" filtresi.
2. Bir marker → `/jobs/{id}`: **blurlu görüntü + bbox + "2 yüz, 1 plaka maskelendi"** kartı — KVKK cümlesi burada kurulur: "Ham görüntü hiçbir diske yazılmadı; DB'de yalnızca geri döndürülemez blurlu türev var."
3. **Canlı an:** dashboard'dan yeni pano ingest → projektörde laptop worker terminali log akıtır → 3-5 sn'de haritada yeni marker. (Worker zaten dakikalardır boş kuyruğu poll'luyor — cold start yok.)
4. Telefonda Expo listesi + `/kvkk` sayfası kapanış.
5. Sorulara hazır: `.cursor/rules` + dikey dilim dosya ağacı = masterfabric mimari uyum kanıtı; `audit_events` tablosu = izlenebilirlik.

Demo sırasında: keep-alive döngüsü çalışır durumda; worker terminali görünür; yedek olarak her sayfanın ekran görüntüsü `demo_cache/screenshots/`te (felaket anında bile anlatı sürer).

### 3.3 İlk 3 Kritik-Yol Riski (özet)

1. **Render Go deploy'u** (sürüm/port/env üçlüsü) — panzehir: saat-0 hello deploy + R1(Docker)→R2(laptop API) merdiveni, G3'te geri dönüşsüz karar.
2. **Street View fetch sürprizi** (key kısıtı/yanlış pano) — panzehir: ücretsiz metadata preflight saat 0'da + pipeline'ın kaynak ucu değiştirilebilir (lokal görüntülerle aynı DB/UI zinciri; demo anlatısı "saha aracı görüntüsü" olarak da kurulabilir).
3. **Leaflet/Next App Router tuzakları** (SSR, ikon 404) — panzehir: çözümler plana gömülü (`dynamic ssr:false`, `divIcon`); 30 dk kuralıyla liste-önce UI'a inilir.

İkincil: free PG bağlantı limiti (varsayım ~95) → `DB_MAX_CONNS=5` env'i baştan; free web servis uykusu → keep-alive; npm 7-gün kuralı → tüm sürümler yıllanmış pinli.
