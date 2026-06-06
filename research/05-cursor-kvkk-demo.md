# Cursor SDK/CLI Bonus + KVKK & Etik + Demo Senaryosu (research.md §6, §7, §9)

> **Tarih:** 6 Haziran 2026 · **Doğrulama yöntemi:** Cursor CLI bu makinede kurulu halde test edildi (`cursor-agent --help`, auth durumu, headless hata mesajı birebir alındı); Cursor SDK varlığı npm registry + cursor.com resmi doküman/blog/changelog üzerinden bugün doğrulandı. Doğrulanamayan her iddia **"varsayım"** olarak işaretlendi. Hukuki yorumlar **"hukuki görüş değildir"** notuyla verildi.
> **Hedef puanlar:** AI adaptasyonu **10** + KVKK & etik **10** + README/sunum **5** = **25 puan** bu dokümanın kapsamı.

---

## 6. Cursor SDK / CLI Bonus Stratejisi (10 puan)

### 6.1 Gerçeklik kontrolü — Haziran 2026 itibarıyla ne VAR, ne YOK

#### Cursor CLI (`cursor-agent`) — VAR, stabil, bu makinede kurulu ve test edildi ✅

| Özellik | Durum | Kanıt |
|---|---|---|
| Kurulum | `curl https://cursor.com/install -fsS \| bash` (macOS/Linux/WSL) | [docs/cli/overview](https://cursor.com/docs/cli/overview) — bu makinede kurulu: `/home/batuhan4/.local/bin/cursor-agent`, sürüm `2026.04.14-ee4b43a` |
| Headless / script modu | `cursor-agent -p` (`--print`) — "for scripts or non-interactive use. Has access to all tools, including write and shell" | `--help` çıktısından birebir; [docs/cli/headless](https://cursor.com/docs/cli/headless) |
| Çıktı formatı | `--output-format text \| json \| stream-json` (sadece `--print` ile) | `--help` + [docs/cli/reference/output-format](https://cursor.com/docs/cli/reference/output-format) |
| JSON sonuç şekli | `{"type":"result","subtype":"success","is_error":false,"result":"<metin>","session_id":"...","duration_ms":...}` → nihai cevap `jq -r '.result'` ile alınır | output-format dokümanından birebir |
| Auth | `cursor-agent login` (tarayıcı akışı) **veya** `CURSOR_API_KEY` env / `--api-key` bayrağı | `--help` + bu makinede üretilen gerçek hata: `Error: Authentication required. Please run 'agent login' first, or set CURSOR_API_KEY environment variable.` |
| Headless güven | `--trust` (workspace onayını atlar, sadece print modunda), `--force`/`--yolo` (komutlara otomatik izin) | `--help` çıktısından birebir |
| Modlar | `--mode plan` (read-only plan) ve `--mode ask` (read-only soru-cevap) | `--help` çıktısından birebir |
| Model seçimi | `--model <id>` (örn. `gpt-5`, `sonnet-4`), `--list-models` | `--help`; model listesi auth gerektirir (**varsayım**) |
| Diğer | `create-chat`, `--resume`, `--workspace <path>`, `-w` git worktree izolasyonu, `generate-rule` komutu | `--help` çıktısından birebir |

⚠️ **KRİTİK:** Bu makinede CLI şu an **login DEĞİL**. Hackathon sabahı ilk iş `cursor-agent login` (veya cursor.com dashboard'dan API key alıp `CURSOR_API_KEY`'i `.env`'e koymak). Sahnede ilk kez auth denemek yasak — script'in 3. katman fallback'i (aşağıda) tam bu yüzden var.

⚠️ **Dikkat:** `-p` modunda da exit code güvenilir sinyal değil (auth hatasında bile pipe sonrası 0 gözlemlendi). Script'te başarı kontrolü **çıktının `"type":"result"` içerip içermediği ve `is_error:false`** üzerinden yapılmalı, exit code üzerinden değil.

#### Cursor SDK (`@cursor/sdk`) — VAR, 29 Nisan 2026'dan beri public beta ✅

| Özellik | Durum | Kanıt |
|---|---|---|
| Varlık | TypeScript paketi `@cursor/sdk`, public beta; sonradan Python desteği de eklendi | [changelog/sdk-release](https://cursor.com/changelog/sdk-release), [blog/typescript-sdk](https://cursor.com/blog/typescript-sdk) |
| npm durumu | `1.0.7` (26 Nis) → `1.0.18` (5 Haz 2026, latest). Registry'den bugün doğrulandı | `npm view @cursor/sdk time` |
| API | `Agent.create({ apiKey, model: { id: "composer-2" }, local: { cwd } })` → `agent.send("...")` → `for await (const event of run.stream())` | Blog'dan birebir kod örneği |
| Auth | `CURSOR_API_KEY` env değişkeni (cursor.com dashboard → Integrations'tan key; dashboard yolu **varsayım**) | Blog |
| Çalışma modu | Local (kendi makinen), Cloud (VM + `autoCreatePR`), self-hosted worker | Blog |
| Ücretlendirme | "standard, token-based consumption pricing" — Cursor planının token kullanımından düşer; ayrı SDK ücreti yok (**plan kotası detayı varsayım**) | Blog/changelog |
| Olgunluk | Public beta; basında "several known limitations" ([The New Stack](https://thenewstack.io/cursor-sdk-ai-agents/)) → sahnede tek başına güvenilecek katman DEĞİL | — |
| `.cursor` entegrasyonu | SDK ajanı `.cursor/skills/`, `.cursor/hooks.json` ve rules'u okur → ruleset'imiz SDK çağrısında da devreye girer (jüriye anlatılacak güzel detay) | Blog |

🟡 **npm 7-gün kısıtı (bu ortama özgü):** Bu makinede 7 günden taze paket sürümleri kurulamıyor; `@latest` eskiye çözülür. `1.0.17` (30 Mayıs 20:24) sınırda, `1.0.16` (29 Mayıs) güvenli. **Öneri:** `npm install @cursor/sdk@1.0.16 --save-exact`. Kurulum patlarsa SDK katmanını atla, CLI katmanı zaten yeterli (AGENTS.md "Cursor CLI de kullanılabiliyorsa belgele" diyor).

**Sonuç:** AGENTS.md'nin "Cursor SDK önceliklidir" hedefi gerçekçi: SDK gerçekten var ve `local` modda repo içinde script'ten çağrılabiliyor. Ama sahne güvenilirliği sıralaması: **şablon fallback > CLI (yerelde test edildi) > SDK (beta)**. Doğru mimari: üçü tek script'te katmanlı.

### 6.2 Altı otomasyon adayının değerlendirmesi

| # | Otomasyon | Zorluk (dk) | README'de belgeleme | Gerçek ürün değeri | Bonus etkisi |
|---|---|---|---|---|---|
| 1 | **Demo raporu**: detection JSON → markdown rapor (`cursor-agent -p`) | **15–20** (3 katmanlı fallback dahil) | "AI Adaptasyonu" bölümünde komut + örnek çıktı dosyası commit'lenir | **Yüksek** — belediye için "günlük saha raporu" ürün özelliğinin tohumu | **Yüksek** — demoda gösterilebilen somut SDK/CLI artefaktı |
| 2 | Jüri sunum özeti (detection JSON → özet) | 10 (tek başına) | #1 ile aynı | Düşük (sadece hackathon'a hizmet eder) | Orta — #1 ile **birleştirilirse** bedava: raporun ilk bölümü "jüri özeti" olur |
| 3 | **KVKK checklist otomasyonu**: repo taraması (ham görüntü/secret sızıntısı) + checklist markdown | **10–15** (deterministik kısım AI'sız çalışır) | README'nin hem AI hem KVKK bölümünde — **çift puan kanalı (10+10)** | **Yüksek** — gerçek bir veri-sızıntısı kapısı; CI'a taşınabilir | **Yüksek** — KVKK jüri kriterine kanıt üretir |
| 4 | Quality gate (lint/test/build → özet rapor) | 10–15 | "Doğrulama" bölümünde | Orta — zaten AGENTS.md doğrulama listesi var | Düşük-Orta — jüri çıktısını görmez, README'de satır olur |
| 5 | Prompt log / agentic workflow belgesi | 5–10 (kod yok, disiplin var) | README "AI Adaptasyonu"nun ana gövdesi | Düşük (ürüne değil sürece katkı) | **Orta-Yüksek ama zaten zorunlu** — 10 puanlık kriterin tabanı; otomasyon değil hijyen |
| 6 | Cursor ruleset iyileştirme (scoped .mdc'ler) | 10 | Rules dosyaları repo'da görünür + README'de tablo | Orta — ajan hatalarını gerçekten azaltır | Orta — tek başına bonus değil ama 10 puanın "agentic yapı" yarısını taşır |

### 6.3 Tavsiye: ≤30 dakikada #1 (+#2 gömülü) ve #3

**Seçim: (a) `scripts/demo-report.sh` — demo raporu + jüri özeti tek artefakt; (b) `scripts/kvkk-gate.sh` — deterministik KVKK/secret taraması (+isteğe bağlı AI özeti).** Toplam ~25–30 dk.

Gerekçe:
- #1, AI bonusunun "küçük ama gerçek otomasyon" tarifine birebir oturur ve **demoda 10 saniyede gösterilebilir** ("bu raporu az önce Cursor ajanı yazdı").
- #3, tek script ile **iki rubrik kalemine** (AI 10 + KVKK 10) kanıt üretir; deterministik çekirdeği AI/auth/WiFi olmadan da çalışır → sıfır sahne riski.
- #2 ayrı iş olmaktan çıkarılıp #1'in prompt'una "ilk bölüm: 5 cümlelik jüri özeti" diye gömülür.
- #4'ün özü AGENTS.md doğrulama komutlarında zaten var; #5 ve #6 kod gerektirmeyen disiplin işi olarak yine yapılır (aşağıda 6.6) ama "otomasyon bonusu" bütçesinden yemez.

### 6.4 Script taslakları

#### (a) `scripts/demo-report.sh` — 3 katmanlı: SDK → CLI → şablon

```bash
#!/usr/bin/env bash
# Demo raporu üretici — Cursor SDK (tercih) -> Cursor CLI -> deterministik şablon.
# Kullanım: ./scripts/demo-report.sh [detections.json] [out.md]
# Asla sıfır çıktı üretmez: AI katmanları başarısız olsa bile şablon raporu yazar.
set -u
DETECTIONS="${1:-demo_cache/last_run/detections.json}"
OUT="${2:-docs/demo-raporu.md}"
PROMPT="Asagidaki JSON, kentsel obje tespit demosunun ciktisidir (siniflar, konumlar, guven skorlari, anonimlestirme sayaclari).
TURKCE bir demo raporu yaz. Bolumler: (1) Juri Ozeti (en fazla 5 cumle),
(2) Tespit Dokumu (sinif bazinda adet + ortalama guven, tablo),
(3) Anonimlestirme Kaniti (kac yuz/plaka maskelendi),
(4) Belediye Is Emri Onerileri (en cok 3 madde).
Sadece markdown dondur, JSON'daki verinin disina cikma, kisisel veri uretme.
JSON: $(cat "$DETECTIONS")"

# --- Katman 1: Cursor SDK (varsa) ---
if [ -f scripts/demo-report-sdk.mjs ] && [ -n "${CURSOR_API_KEY:-}" ] && [ -d node_modules/@cursor/sdk ]; then
  if node scripts/demo-report-sdk.mjs "$DETECTIONS" > "$OUT.tmp" 2>/dev/null && [ -s "$OUT.tmp" ]; then
    mv "$OUT.tmp" "$OUT"; echo "[demo-report] kaynak: Cursor SDK -> $OUT"; exit 0
  fi
fi

# --- Katman 2: Cursor CLI (yerelde dogrulandi: -p --output-format json) ---
if command -v cursor-agent >/dev/null 2>&1; then
  RAW="$(timeout 120 cursor-agent -p --output-format json --trust "$PROMPT" 2>/dev/null || true)"
  # Exit code guvenilmez; basariyi JSON govdesinden dogrula:
  if echo "$RAW" | jq -e 'select(.type=="result" and .is_error==false)' >/dev/null 2>&1; then
    echo "$RAW" | jq -r '.result' > "$OUT"
    echo "[demo-report] kaynak: Cursor CLI -> $OUT"; exit 0
  fi
  echo "[demo-report] CLI basarisiz/auth yok, sablona dusuluyor" >&2
fi

# --- Katman 3: Deterministik sablon (AI'siz, offline) ---
{
  echo "# Demo Raporu ($(date '+%Y-%m-%d %H:%M')) — sablon modu"
  echo; echo "## Tespit Dokumu"; echo "| Sinif | Adet | Ort. guven |"; echo "|---|---|---|"
  jq -r '[.detections[]] | group_by(.class) | .[] |
    "| \(.[0].class) | \(length) | \((map(.score) | add/length) * 100 | floor)% |"' "$DETECTIONS"
  echo; echo "## Anonimlestirme"
  jq -r '"Maskelenen yuz: \(.anonymization.faces // 0) — Maskelenen plaka: \(.anonymization.plates // 0)"' "$DETECTIONS"
} > "$OUT"
echo "[demo-report] kaynak: sablon -> $OUT"
```

#### (a2) `scripts/demo-report-sdk.mjs` — SDK katmanı (~25 satır)

```js
// Cursor SDK ile demo raporu. Blog'daki resmi API: Agent.create / send / stream.
// npm install @cursor/sdk@1.0.16 --save-exact   (npm 7-gun kisiti nedeniyle pin)
import { readFileSync } from "node:fs";
import { Agent } from "@cursor/sdk";

const json = readFileSync(process.argv[2] ?? "demo_cache/last_run/detections.json", "utf8");
const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },          // local runtime: repo icinde, .cursor/rules'u da gorur
});
const run = await agent.send(
  `Su tespit JSON'undan TURKCE demo raporu uret (juri ozeti + sinif tablosu + anonimlestirme kaniti + 3 is emri onerisi). Sadece markdown: ${json}`
);
let text = "";
for await (const ev of run.stream()) {
  // Event semasinin ayrintisi beta'da degisebilir (varsayim) -> savunmaci topla:
  if (ev?.text) text += ev.text;
  else if (ev?.type === "assistant" && ev?.message?.content) text += ev.message.content;
}
if (!text.trim()) process.exit(1);        // bos cikti = basarisiz say, bash katmani CLI'a dussun
process.stdout.write(text);
```

#### (b) `scripts/kvkk-gate.sh` — deterministik KVKK/secret kapısı

```bash
#!/usr/bin/env bash
# KVKK kapisi: git'e girmis/staged ham gorsel, .env ve buyuk binary tespiti.
# AI gerektirmez; cikti docs/kvkk-checklist.md. Opsiyonel: cursor-agent ile ozet paragraf.
set -u
FAIL=0; OUT="docs/kvkk-checklist.md"
TRACKED="$(git ls-files)"

check() { # $1=aciklama $2=pattern-grep
  HITS="$(echo "$TRACKED" | grep -Ei "$2" || true)"
  if [ -n "$HITS" ]; then echo "| ❌ | $1 | $(echo "$HITS" | head -3 | tr '\n' ' ') |"; FAIL=1
  else echo "| ✅ | $1 | temiz |"; fi
}

{
  echo "# KVKK Otomatik Checklist — $(date '+%Y-%m-%d %H:%M')"
  echo; echo "| Durum | Kontrol | Bulgu |"; echo "|---|---|---|"
  check "Repo'da gorsel dosya YOK (ham/islenmis fark etmez, politika: hicbiri commit'lenmez)" \
        '\.(jpe?g|png|webp|bmp|tiff?|heic|mp4|avi|mov)$'
  check ".env commit edilmemis" '(^|/)\.env$'
  check "Model agirligi commit edilmemis" '\.(pt|onnx|pth|weights)$'
  check "Ham veri klasoru takip disinda" '(^|/)(tmp_raw|raw|ham_veri)/'
  # gitignore dogrulamasi: kritik yollar gercekten ignore mu?
  for p in tmp_raw/ demo_cache/ .env models/; do
    if git check-ignore -q "$p" 2>/dev/null; then echo "| ✅ | \`$p\` gitignore'da | — |"
    else echo "| ⚠️ | \`$p\` gitignore'da DEGIL | .gitignore'a ekle |"; FAIL=1; fi
  done
  echo; echo "Kod taramasi: OCR/tanima cagrisi yok mu?"
  if grep -rEn 'easyocr|pytesseract|tesseract|face_recognition|deepface|insightface|readtext|recognize' \
       --include='*.py' --include='*.go' --include='*.ts' . 2>/dev/null | grep -v node_modules; then
    echo "❌ Yasakli kutuphane/cagri bulundu"; FAIL=1
  else echo "✅ OCR/yuz tanima cagrisi yok"; fi
} > "$OUT"

echo "[kvkk-gate] rapor: $OUT (FAIL=$FAIL)"
exit $FAIL   # CI/pre-commit'te kullanilabilir: ihlal varsa commit'i durdurur
```

İnce ayar: bu script `.git/hooks/pre-commit`'e bir satırla bağlanırsa ("her commit'te KVKK kapısı çalışır") jüri anlatısı bir kademe güçlenir — maliyeti 1 dk.

### 6.5 README "AI Adaptasyonu" bölüm iskeleti (kopyala-doldur)

```markdown
## AI Adaptasyonu (Cursor)

### 1. Cursor IDE + Agentic Ruleset
- Tüm geliştirme Cursor IDE'de, ajan modunda yapıldı.
- Proje sözleşmesi: `AGENTS.md` (Cursor nested-agents desteğiyle otomatik okunur).
- Always-on kural seti: `.cursor/rules/hackathon.mdc` (alwaysApply: stack, KVKK
  kapıları, doğrulama komutları). [Varsa: scoped kurallar `go-backend.mdc`,
  `web-ui.mdc` — globs ile sadece ilgili dosyalarda devreye girer.]
- Kuralların etkisi: ajan her oturumda KVKK kısıtlarını ve masterfabric-go
  mimarisini bağlam olarak aldı; ör. detection kodu yazarken blur-önce-tespit
  sırası kural dosyasından geldi (commit geçmişinde izlenebilir).

### 2. Cursor SDK ile otomasyon (bonus hedefi)
- `@cursor/sdk@1.0.16` (public beta) — `scripts/demo-report-sdk.mjs`
- Ne yapar: fixture koşusunun `detections.json` çıktısından Türkçe demo raporu
  + jüri özeti + belediye iş emri önerileri üretir.
- Çalıştırma: `CURSOR_API_KEY=... ./scripts/demo-report.sh`
- Örnek çıktı: [`docs/demo-raporu.md`](docs/demo-raporu.md) (commit'li artefakt)

### 3. Cursor CLI ile otomasyon
- `cursor-agent -p --output-format json` headless modu, aynı script'in
  2. katmanı (SDK erişilemezse). Başarı kontrolü `is_error:false` + `.result`.
- KVKK kapısı: `./scripts/kvkk-gate.sh` — deterministik repo taraması
  (görsel/secret/ağırlık sızıntısı + OCR/tanıma çağrısı taraması); çıktı
  [`docs/kvkk-checklist.md`](docs/kvkk-checklist.md). AI katmanı opsiyonel,
  kapı offline da çalışır.

### 4. Prompt teknikleri ve iş akışı
- [3-5 örnek prompt: anonimleştirme pipeline iskeleti, masterfabric-go endpoint
  ekleme, Next.js harita bileşeni — her biri 1 satır "ne istendi → ne üretildi"]
- Model/servis kararları: [CV modelleri HF'ten; gerekçeler `research/02-...md`]
- AI'ın hızlandırdığı yerler: scaffold ~X dk, pipeline ~Y dk (tahmin).

### 5. Güvenlik sınırı
- Cursor ajanına ham görüntü klasörü hiçbir prompt'ta verilmedi; rapor
  otomasyonu yalnızca anonimleştirilmiş türev JSON ile çalışır.
```

Son madde önemli: "AI otomasyonu bile sadece anonim türev veriyle çalışıyor" cümlesi AI bonusu ile KVKK puanını birbirine bağlar — jüri karşısında güçlü bir cümle.

### 6.6 İyi `.cursor/rules/*.mdc` neye benzer (jürinin "agentic yapı" kalemi)

Resmi dokümandan doğrulanan format ([docs/context/rules](https://cursor.com/docs/context/rules)):

- Frontmatter üçlüsü kural tipini belirler: **Always** (`alwaysApply: true`), **Auto Attached** (`globs` dolu), **Agent Requested** (`description` dolu, ajan alaka kararını verir), **Manual** (@-mention). `.cursor/rules/` altındaki düz `.md` (frontmatter'sız) **yok sayılır** — uzantı `.mdc` olmalı.
- Resmi tavsiyeler: 500 satır altı tut; büyük kuralı bileşik küçük kurallara böl; somut örnek/`@dosya` referansı ver; sık kullanılan pattern'lere odakla; git'e commit'le.

Mevcut `hackathon.mdc` zaten doğru kurgulanmış (alwaysApply + tüm kapılar). Hackathon sırasında 10 dk'lık iyileştirme önerisi (**bu dosyaya şimdi dokunulmayacak**, gün içinde eklenecek):

1. `go-backend.mdc` — `globs: ["backend/**/*.go"]`: "masterfabric-go katman sırasına uy; yeni endpoint'i mevcut handler→service→repository patternine ekle; `@backend/internal/...` örnek dosya referansı".
2. `web-ui.mdc` — `globs: ["web/**/*.{ts,tsx}"]`: harita/liste bileşen pattern'i, `NEXT_PUBLIC_API_BASE_URL` kullanımı.
3. README'ye "hangi kural hangi commit'i şekillendirdi" mini tablosu — kuralların gerçekten kullanıldığının kanıtı (varsayım: jüri canlı ruleset + iz görmek ister; rubrik "documented in README" dediği için iz tablosu güvenli yatırım).

---

## 7. KVKK ve Etik Güvenlik Planı (10 puan + diskalifiye riski)

> Bu bölümdeki KVKK md.4 vb. atıflar ekip içi pratik yorumdur; **hukuki görüş değildir**.

### 7.1 Ham görüntü yaşam döngüsü

Ham bayt'ın var olabileceği yerler ve kuralları:

| Konum | İzin | Kural |
|---|---|---|
| RAM (fetch → blur arası) | ✅ kaçınılmaz | İşlem bitince referans bırakılmaz; ham frame asla response/log'a yazılmaz |
| `tmp_raw/` (gitignored, lokal disk) | 🟡 yalnızca zorunluysa | Tercih: ham kareyi **hiç diske yazmadan** bellekte blur'la. Debug için yazıldıysa oturum sonunda purge script'i siler |
| Git repo / GitHub | ❌ asla | `kvkk-gate.sh` + `.gitignore` (`tmp_raw/`, `demo_cache/`, `*.jpg` global) |
| Render/Vercel artifact, Postgres, public bucket | ❌ asla | DB'ye yalnızca anonimleştirilmiş kanıt görselinin yolu/URL'i; ham bayt hiçbir deploy ortamına çıkmaz |
| `demo_cache/` (gitignored) | ✅ ama yalnızca **blur'lanmış türev** | Adlandırma disiplini: `demo_cache/anon/<pano_id>.jpg` — "anon/" öneki olmayan görsel pipeline'a giremez |

**Saklama süresi:** ham bayt ömrü = tek pipeline koşusu (saniyeler). Debug istisnası dahil her şey hackathon bitiminde silinir.

#### Silme script'i — `scripts/kvkk-purge.sh`

```bash
#!/usr/bin/env bash
# Hackathon sonu ham veri imhasi + tutanak uretimi.
set -u
TARGETS=("tmp_raw" "debug_frames")
LOG="docs/kvkk-silme-tutanagi.md"
{
  echo "# KVKK Ham Veri Silme Tutanağı"
  echo; echo "- **Tarih/saat:** $(date --iso-8601=seconds)"
  echo "- **Makine:** $(hostname) (yerel geliştirme makinesi)"
  echo "- **Kapsam:** Pipeline'a giren TÜM ham (anonimleştirilmemiş) görüntüler"
  echo; echo "| Dosya | Boyut (bayt) | SHA256 | Durum |"; echo "|---|---|---|---|"
  for d in "${TARGETS[@]}"; do
    [ -d "$d" ] || continue
    find "$d" -type f | while read -r f; do
      printf "| %s | %s | %s | silindi |\n" "$f" "$(stat -c%s "$f")" "$(sha256sum "$f" | cut -c1-16)…"
      shred -u "$f" 2>/dev/null || rm -f "$f"
    done
    rmdir "$d" 2>/dev/null || true
  done
  echo; echo "- Ham görüntüler hiçbir bulut ortama (GitHub/Vercel/Render/bucket) yüklenmedi."
  echo "- Google Street View türevleri için ToS gereği imha da bu tutanak kapsamındadır."
  echo "- DB ve repo'da kalan tek görsel veri: geri döndürülemez şekilde maskelenmiş kanıt kareleri."
} >> "$LOG"
echo "[kvkk-purge] tutanak: $LOG"
```

**SHA256 tartışması (pragmatik karar):** Hash, görüntüye geri çevrilemez ve içerikten kişiyi tanımlamaz; "hangi dosyaların imha edildiğinin" güçlü kanıtıdır — dijital imha tutanaklarında standart pratik. Karşı görüş: ham (kişisel veri içeren) dosyanın hash'i "kişisel veriden türetilmiş veri" sayılabilir (**varsayım, hukuki görüş değildir**). **Önerimiz:** ilk 16 hex karaktere kısaltılmış SHA256 + boyut + zaman damgası logla (yukarıdaki script böyle): kanıt değeri korunur, "tam parmak izi sakladık" eleştirisinin yüzeyi küçülür. Maksimum muhafazakârlık istenirse hash sütunu kaldırılıp yalnızca `ad + boyut + mtime + adet` bırakılır — jüri sorarsa bu bilinçli ödünleşimi anlatmak artı puan.

Ek not (kardeş araştırma bulgusuyla uyum): aynı tutanak **Google Maps Platform ToS** türev-imha taahhüdünü de kapsıyor (yukarıda satırı var) — tek belge, iki yükümlülük.

### 7.2 Blur geri döndürülemezliği — teknik seçimler

1. **Yöntem: solid (içi dolu) kutu veya ağır pikselleştirme; hafif Gaussian DEĞİL.** Hafif Gaussian blur doğrusal bir evrişimdir; kernel tahmin edilebilirse dekonvolüsyonla kısmen geri çevrilebilir ve düşük çözünürlüklü yüz/plaka içeriği ML ile yeniden inşa edilebilir (**alan literatüründe bilinen zafiyet; "kısmen" — varsayım düzeyinde genelleme**). Solid mask bölgedeki bilgiyi sıfırlar: matematiksel olarak geri dönüşsüz. Pikselleştirme kullanılacaksa blok ≥ bölge genişliğinin ~1/8'i (plakada karakter başına 1 blok'tan az kalmalı). Demo estetiği için: solid koyu kutu + üstüne küçük "🔒 KVKK" etiketi — hem kanıt hem görsel anlatım.
2. **Bbox padding +%20:** modelin kutusu daima bir miktar dar kalır; her kenara %20 (en az 8 px) pay eklenir. Saç/şapka/plaka çerçevesi taşmaları kapanır.
3. **Anonimleştirme modellerinde eşik DÜŞÜRÜLÜR: conf 0.15–0.25.** Tespit modellerinde yanlış pozitif kalite sorunudur; anonimleştirmede yanlış NEGATİF KVKK ihlalidir. Fazladan blur'lanmış bir duvar zararsız, blur'lanmamış tek yüz diskalifiye riski. (Ürün tespiti için ayrı, normal eşik: 0.4–0.5.) Ek ucuz önlem: yüz modeli + COCO `person` sınıfının üst bölgesi birleşimi gibi ikinci bir ağ — süre kalırsa (**varsayım: 6 saatte gerekmez, fixture küçük**).

### 7.3 "Yüz/plaka modeli yalnızca anonimleştirme için" — kod ve dokümantasyon kanıtları

Kod tabanının kendisi iddianın kanıtı olmalı:

- **Crop yok:** yüz/plaka bbox'ından kesit alıp diske/DB'ye yazan tek satır yok; bbox yalnızca maskeleme fonksiyonuna girer.
- **Embedding yok:** hiçbir özellik vektörü, descriptor, similarity hesabı yok.
- **OCR yok:** repoda `easyocr/pytesseract/readtext/recognize` vb. import yok — `kvkk-gate.sh` bunu otomatik tarar (6.4-b).
- **Bbox transient:** yüz/plaka koordinatları RAM'de yaşar, maske basıldıktan sonra atılır; DB'ye koordinat yazılmaz.
- **Kalıcı tek kayıt** `anonymization_events` tablosu: `image_ref, faces_masked_count, plates_masked_count, model_id, conf_threshold, processed_at`. Sayaç + model kimliği = denetlenebilirlik; konum/kesit/kimlik = yok.
- README'de tek cümlelik mimari garanti: "Obje tespiti, anonimleştirme fonksiyonunun DÖNÜŞ değeri üzerinde çalışır; ham kareye tespit katmanından erişen bir kod yolu yoktur."

### 7.4 README'ye girecek KVKK ifadeleri (kopyala-yapıştır, 8 madde)

```markdown
## KVKK ve Etik Uyum

1. **Amaç sınırlaması:** Bu sistem yalnızca cansız kentsel objeleri (tabela,
   çöp konteyneri, yol hasarı vb.) tespit eder. Kimlik tespiti, yüz tanıma,
   plaka okuma (OCR), kişi profilleme ve kişi/araç takibi bu projede hem
   teknik olarak yoktur hem de kural setiyle (`.cursor/rules`, `AGENTS.md`)
   yasaklanmıştır.
2. **Anonimleştirme önceliği:** Her görüntü, obje tespitinden ÖNCE yüz ve
   plaka bölgeleri geri döndürülemez şekilde (solid mask) kapatılarak işlenir.
   Tespit modeli ham kareyi hiçbir kod yolundan göremez.
3. **Geri döndürülemezlik:** Maskeleme, bölgedeki piksel bilgisini tamamen
   yok eder (solid doldurma, +%20 genişletilmiş kutu); bulanıklaştırmanın
   tersine çevrilmesine imkân verecek hafif filtre kullanılmamıştır.
4. **Veri minimizasyonu:** Yüz/plaka tespit modelleri yalnızca maskelenecek
   bölgeyi bulmak için çalışır; kesit (crop), embedding, koordinat veya başka
   hiçbir kimliklendirilebilir türev saklanmaz. Kalıcı kayıt yalnızca
   sayaçlardır (kaç yüz/plaka maskelendi, hangi model, hangi eşik).
5. **Saklanan veriler:** Anonimleştirilmiş kanıt görseli, obje sınıfı, güven
   skoru, yaklaşık konum (obje düzeyinde), işlem zaman damgası.
   **Saklanmayan veriler:** Ham görüntü, yüz/plaka kesiti, plaka metni,
   kişi/araç kimliği, herhangi bir biyometrik veri.
6. **Bulut ve repo hijyeni:** Ham görüntüler hiçbir koşulda GitHub'a, Vercel/
   Render artifact'lerine veya herhangi bir bucket'a yüklenmez; bu kural
   `scripts/kvkk-gate.sh` ile her commit'te otomatik denetlenir.
7. **Silme taahhüdü:** Geliştirme sırasında geçici olarak yerel diskte tutulan
   tüm ham kareler hackathon bitiminde `scripts/kvkk-purge.sh` ile imha
   edilmiş ve [`docs/kvkk-silme-tutanagi.md`](docs/kvkk-silme-tutanagi.md)
   ile belgelenmiştir.
8. **İlkesel uyum:** Tasarım, 6698 sayılı KVKK md. 4'teki amaçla sınırlılık,
   veri minimizasyonu ve gerektiği kadar saklama ilkeleri gözetilerek
   yapılmıştır. *(Bu bölüm ekibin teknik uyum beyanıdır; hukuki görüş
   niteliği taşımaz.)*
```

### 7.5 Demoda gösterilecekler / gösterilMEyecekler

**Gösterilecek:**
- Before/after blur kanıtı — ama "before" karesi bile güvenli kaynaktan: Google'ın zaten blur'ladığı bir Street View karesi (üstüne bizim maskemiz ikinci kat iner — "savunma derinliği" anlatısı: Google'ın kendi ölçümü yüzlerde ~%89, plakalarda %94–96 → kalan açığı biz kapatıyoruz) **veya** ekipten birinin rızalı fotoğrafı/sentetik görsel.
- UI'daki anonimleştirme sayaçları ("Bu koşuda 3 yüz, 2 plaka maskelendi").
- `/kvkk` sayfası + silme tutanağı + `kvkk-gate.sh` çıktısı (yeşil checklist).

**GösterilMEyecek / tuzaklar:**
- Ham kare hiçbir biçimde sahnede açılmaz — "bir saniye göstereyim" yok.
- **Ekran paylaşımı tuzağı:** dosya yöneticisinde `tmp_raw/` klasörünün thumbnail'leri, IDE'nin son dosyalar listesi, terminal geçmişinde görsel açan komutlar. Çözüm: demo ayrı kullanıcı oturumu/temiz pencere; dosya yöneticisi hiç açılmaz.
- **EXIF/GPS tuzağı:** repoya görsel commit'i zaten yasak (kapı ihlali); README'ye konacak ekran görüntülerinde dahi EXIF temizliği (`exiftool -all=`) — kendi telefonla çekilen fotoğrafta GPS olabilir.
- Sahnede `cursor-agent`'a ham klasörü işaret eden bir prompt yazılmaz (AI otomasyonu yalnız türev JSON görür — 6.5'teki güvenlik sınırı cümlesi).

### 7.6 Riskli edge case'ler ve kararlar

| Edge case | Risk | Karar/önlem |
|---|---|---|
| Blur false negative (kaçan yüz/plaka) | En yüksek — ihlal | Düşük eşik (0.15–0.25) + %20 padding + fixture'daki TÜM karelerin demo öncesi insan gözüyle spot-check'i (8–15 kare = 2 dk iş) |
| Poster/billboard/manken üzerindeki yüzler | Orta — "gerçek kişi mi?" tartışması | **Ayrım yapmadan blur'la.** Model zaten yakalıyorsa maskele; "gerçek yüz/baskı yüz" sınıflandırması yapmak tam da yapmamamız gereken analiz |
| "Ahmet Usta" gibi şahıs adı taşıyan tabelalar | İnce nokta — ticari unvan kamusal alanda görünür, ancak ad-soyad kişisel veri tartışması (**varsayım, hukuki görüş değildir**) | Sistem hiçbir yerde **metin çıkarımı/OCR/indeksleme yapmaz**; tabela yalnızca `signage` sınıfı + bbox + skor olarak kaydedilir. "Tabelada ne yazdığını sistem bilmez ve bilemez" cümlesi jüri sorusuna hazır cevap |
| Çocuklar | Yüksek hassasiyet | Ek bir şey gerekmiyor çünkü zaten tüm yüzler maskelenir; demo fixture'ı seçerken okul önü vb. karelerden kaçın (görsel etik) |
| Açılı/kısmi plakalar | Orta — model kaçırabilir | Düşük eşik + padding çoğunu yakalar; fixture spot-check son ağ |
| Cam/vitrindeki yansıma yüzler | Düşük-orta | Model yakalarsa blur; yakalamazsa spot-check'te fark edilir → o kare fixture'dan çıkarılır (en ucuz çözüm) |
| Ham karenin loglara/hata mesajına sızması | Orta | Logger'a görsel/byte yazma yok; hata mesajları yalnızca `image_ref` taşır |

---

## 9. Demo Senaryosu (3–5 dk, jüri karşısında)

### 9.1 Zamanlı akış (hedef 4:30; rubrik eşlemeli)

| Zaman | Sahne | Söylenecek öz | Rubrik kalemi |
|---|---|---|---|
| 00:00–00:30 | **Hook/problem** — slayt yok, doğrudan harita | "Güngören'in çöp kamyonları zaten her sokaktan haftada birkaç kez geçiyor. Araca taktığınız kamera, sıfır ek araç maliyetiyle kentin gözü olur: tabela, konteyner, çukur envanteri kendiliğinden çıkar." | Kamu faydası (20) |
| 00:30–01:10 | **Canlı veri girişi** — haritada Güngören'de bir noktaya tıkla → fetch → pipeline durum adımları UI'da akar (alındı → anonimleştirildi → tespit → kaydedildi) | "Koordinat seçiyorum; sistem görüntüyü alıyor ve işliyor — adımları canlı izliyorsunuz." | Teknik/demo (30) |
| 01:10–01:45 | **Anonimleştirme kanıtı** — sayaçlar + güvenli before/after karesi | "Tespitten ÖNCE her yüz ve plaka geri döndürülemez maskelenir. Bu koşuda N yüz, M plaka. Google kendi blur'unda yüzlerin ~%89'unu yakalıyor; biz ikinci kat kapatıyoruz, belediye kamerasında ise ilk ve tek kapı biziz." | KVKK (10) + Teknik |
| 01:45–02:25 | **Tespit sonuçları** — kanıt görseli üstünde kutular, sınıf+skor | "Yalnızca cansız kentsel objeler: tabela, konteyner, yol hasarı. Skorlarıyla birlikte." | CV doğruluğu (25) |
| 02:25–03:05 | **Harita/liste → iş emri** — dashboard'da liste filtrele, bir tespiti "iş emri" durumuna çek | "Envanter kendi başına amaç değil: taşan konteyner temizlik ekibine, çukur fen işlerine iş emri olur. Veri → aksiyon." | Kamu faydası (20) |
| 03:05–03:30 | **KVKK anı** — `/kvkk` sayfası + silme tutanağı + yeşil `kvkk-gate` checklist'i | "Ne saklıyoruz, ne saklamıyoruz tek sayfada. Ham kareler imha edildi, tutanağı repoda. Her commit'te otomatik KVKK kapısı çalışıyor." | KVKK (10) |
| 03:30–04:00 | **AI/Cursor anı** — `.cursor/rules/` aç + `./scripts/demo-report.sh` çalıştır, üretilen raporu göster | "Tüm geliştirme Cursor ajanıyla, repo içi kural setiyle yapıldı. Az önceki koşunun raporunu Cursor SDK/CLI şimdi yazdı — belediyeye günlük saha raporu olarak gidecek format." | AI adaptasyonu (10) |
| 04:00–04:20 | **Tekrarlanabilirlik** — aynı `pano_id` ile koşuyu tekrarla → birebir aynı sayılar | "Aynı kare, aynı sonuç. Demo şansa değil, sabitlenmiş pano kimliğine dayanıyor." | Teknik + CV güvenilirlik |
| 04:20–04:40 | **Kapanış ask** | "Bugün Street View fixture'ı ile gösterdik; üretim hedefi belediyenin kendi araç kameraları. İlk pilot için tek ihtiyaç: bir kamyon, bir kamera." | Sunum (5) |

Toplam: **4:40** hedef; sıkışırsa 02:25 ve 04:00 sahneleri 10'ar sn kısaltılır (alt sınır ~3:50).

### 9.2 Sahne öncesi ısınma checklist'i (T-30 dk)

- [ ] **Render pre-warm:** free tier ~50 sn soğuk başlar → T-10 ve T-3'te `curl https://<api>.onrender.com/health` (telefondan da yedekle).
- [ ] Vercel sayfası + `/kvkk` sayfası bir kez açılıp ısıtıldı.
- [ ] Fixture'ın 8–15 panosu `demo_cache/anon/` içinde hazır; **hepsi insan gözüyle blur spot-check'ten geçti**.
- [ ] `cursor-agent` login durumu yeşil (`cursor-agent status`) **veya** `CURSOR_API_KEY` set; değilse demo-report şablon katmanıyla gösterilecek (rapor yine üretilir — cümle: "AI katmanı ağ ister, kapı offline da çalışır").
- [ ] `./scripts/demo-report.sh` bir kez koşturuldu, çıktı dosyası açık sekmede hazır (canlı koşu patlarsa bu gösterilir).
- [ ] Silme tutanağı + kvkk-checklist sekmelerde açık.
- [ ] Ekran: bildirimler kapalı (DND), dosya yöneticisi kapalı, terminal geçmişi temiz, yalnızca gerekli sekmeler.
- [ ] Telefon hotspot'u test edildi (aşağıdaki contingency).
- [ ] Ekran kaydı (tam mutlu-yol koşusu) yerel diskte: `demo_kayit.mp4`.

### 9.3 WiFi ölürse: kademeli geri çekilme yolu

1. **Salon WiFi → telefon hotspot** (önceden eşleşmiş, tek tıkla geçiş) — canlı akış aynen sürer.
2. **Hotspot da yoksa → tam offline mod:** `demo_cache/anon/` içindeki blur'lanmış türevlerle pipeline lokalde koşar (Street View fetch adımı cache'ten okur), UI `localhost`'ta; anlatı değişmez, yalnızca "canlı fetch yerine bu sabahki sabit fixture" cümlesi eklenir.
3. **Makine/ortam komple çökerse → ekran kaydı:** `demo_kayit.mp4` oynatılır, konuşma metni aynı; soru-cevapta repo GitHub'dan telefonla gösterilir.

### 9.4 Beklenen 5 jüri sorusuna tek cümlelik cevaplar

1. **"Doğruluk yüzdeniz ne?"** — "Hazır HF modelleriyle 6 saatlik kapsamda fixture üzerinde sınıf bazında spot-doğrulama yaptık (X tespitin Y'si doğru); üretim adımı Güngören görüntüleriyle fine-tune ve gerçek mAP raporu — sayıları abartmıyoruz, ölçüm metodumuz repoda." *(X/Y demo günü fixture'dan doldurulacak)*
2. **"Neden bu sınıflar?"** — "Belediyenin doğrudan iş emrine çevirebildiği ve kişisel veri içermeyen cansız objeler kesişimini seçtik: tabela, konteyner, yol hasarı — fayda en yüksek, KVKK riski sıfıra en yakın küme."
3. **"KVKK'yı nasıl garanti ediyorsunuz?"** — "Mimari garanti: tespit kodu yalnızca anonimleştirme fonksiyonunun çıktısını alabiliyor, ham kareye giden kod yolu yok; ayrıca düşük eşikle aşırı maskeleme, commit başına otomatik KVKK kapısı ve imha tutanağı."
4. **"Maliyet ve ölçek?"** — "Araçlar zaten sahada — ek tur maliyeti sıfır; işleme CPU'da kare başına ~100 ms olduğundan bir araç günü tek mütevazı sunucuda işlenir, API kotası cache ve pano sabitlemeyle korunur; üretimde Street View yerine belediyenin kendi kamerası olduğu için lisans/kota bağımlılığı da kalkar."
5. **"Sırada ne var?"** — "Üç adım: belediye araç kamerası entegrasyonu (ToS'tan tamamen bağımsız veri), Güngören'e özel sınıflarla fine-tune, ve tespit→iş emri webhook'unun belediyenin mevcut sistemine bağlanması."

---

## Kaynaklar

- Cursor CLI genel: https://cursor.com/cli · https://cursor.com/docs/cli/overview · https://cursor.com/blog/cli
- Headless kullanım: https://cursor.com/docs/cli/headless · https://cursor.com/docs/cli/using
- JSON çıktı şeması: https://cursor.com/docs/cli/reference/output-format
- Cursor SDK duyuru/doküman: https://cursor.com/changelog/sdk-release · https://cursor.com/blog/typescript-sdk
- SDK beta sınırlılıkları (3. taraf): https://thenewstack.io/cursor-sdk-ai-agents/ · https://www.datacamp.com/tutorial/cursor-sdk
- Rules formatı: https://cursor.com/docs/context/rules
- Yerel doğrulamalar (bu makine, 6 Haz 2026): `cursor-agent --help` bayrak dökümü, auth hata metni, `npm view @cursor/sdk time` sürüm tarihleri.
