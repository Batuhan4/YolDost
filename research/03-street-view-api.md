# Araştırma 4: Google Street View Static API — Güngören Kentsel Obje Tespiti

> Tarih: 6 Haziran 2026 · Hackathon günü araştırması
> Doğrulama yöntemi: Google'ın resmî dokümanları (developers.google.com / cloud.google.com) 06.06.2026 tarihinde canlı çekildi; Güngören koordinatları OSM Nominatim + Overpass API ile geocode edildi (ücretsiz, Google kotası harcanmadı). Doğrulanamayan her iddia **"varsayım"** olarak işaretlidir.
> **Hiçbir gerçek API anahtarı kullanılmadı; örneklerde `YOUR_API_KEY` placeholder'ı vardır. Faturalanabilir hiçbir Google çağrısı yapılmadı.**

---

## 0. TL;DR

| Soru | Cevap |
|---|---|
| İstek formatı | `GET https://maps.googleapis.com/maps/api/streetview?size=640x640&location=LAT,LNG&heading=H&pitch=P&fov=F&source=outdoor&return_error_code=true&key=...` |
| Maks. görüntü | **640×640 px** (standart API'de kesin üst sınır — doğrulandı) |
| Metadata endpoint | **Tamamen ücretsiz, kota tüketmez** (resmî dokümanda açıkça yazıyor) — kapsama ön-doğrulaması + `pano_id` + çekim tarihi buradan alınır |
| 2026 fiyat | Essentials kademesi: **ayda ilk 10.000 görüntü isteği ücretsiz**, sonrası **$7.00/1000**. $200 kredi modeli Mart 2025'te kaldırıldı |
| Ekibin "10.000 istek" varsayımı | **Birebir doğru** — Essentials SKU'larının aylık ücretsiz eşiği tam olarak 10.000 |
| Tekrarlanabilirlik | `pano_id` pinle (ToS gereği süresiz saklanabilen TEK içerik) + sabit heading/pitch/fov/size → deterministik aynı görüntü |
| En büyük hukuki risk | GMP ToS 3.2.3(c): Street View görüntülerinden **şehir çapında obje envanteri çıkarmak ToS'ta yasaklı örnek olarak birebir yazıyor**; ML train/test/validate de yasak. Hackathon-pragmatik yaklaşım aşağıda |
| Google blur yeterli mi | Hayır — Google'ın kendi makalesine göre ~%89 yüz, %94–96 plaka recall. **Kendi blur gate ZORUNLU** (KVKK + gelecekteki belediye aracı görüntülerinde Google blur hiç yok) |

---

## 1. Görüntü İsteği: Street View Static API formatı

**Base URL (doğrulandı):**

```
https://maps.googleapis.com/maps/api/streetview?PARAMETRELER
```

### Parametre tablosu (resmî dokümandan, 06.06.2026)

| Parametre | Zorunlu? | Varsayılan | Aralık / Not |
|---|---|---|---|
| `location` | `pano` yoksa evet | — | `lat,lng` (örn. `41.014490,28.874338`) veya adres metni. API **konuma en yakın panoramaya "snap" eder** — yani aynı lat/lng farklı günlerde farklı panoya düşebilir (yeni çekim yayınlanırsa) |
| `pano` | `location` yoksa evet | — | Belirli panorama ID'si. **Deterministik**: aynı pano + aynı parametreler = aynı görüntü. Dokümandaki uyarı: pano ID'ler zaman içinde (aylar/yıllar ölçeğinde, görüntü yenilenince) değişebilir — demo günü içinde fiilen sabittir |
| `size` | Evet | — | `{genişlik}x{yükseklik}`, **maksimum 640x640** |
| `key` | Evet | — | API anahtarı (`.env` → `GOOGLE_MAPS_API_KEY`) |
| `heading` | Hayır | Otomatik (en yakın panoya göre) | 0–360 pusula derecesi (0/360=Kuzey, 90=Doğu, 180=Güney, 270=Batı). **Mutlak yöndür**, aracın gidiş yönünden bağımsız → fixture'da sabitlenebilir |
| `pitch` | Hayır | 0 | −90…90. Pozitif=yukarı, negatif=aşağı (yol yüzeyi için negatif) |
| `fov` | Hayır | 90 | 10–120 derece yatay görüş açısı. Küçük fov = zoom (640 piksele daha az sahne sığar → obje başına daha çok piksel) |
| `radius` | Hayır | 50 | location etrafında pano arama yarıçapı (metre). Ara sokakta `ZERO_RESULTS` gelirse 100'e çıkar |
| `source` | Hayır | `default` | `outdoor` → iç mekân panoramalarını (dükkân içi vb.) eler. **Bizim senaryoda her istekte kullan** |
| `return_error_code` | Hayır | `false` | `true` → görüntü yoksa gri placeholder yerine **HTTP 404** döner. Pipeline'da hata yakalamak için **her istekte `true` kullan** |
| `signature` | Duruma göre | — | HMAC-SHA1 dijital imza. Standart API key kullanımında düşük hacimde zorunlu değil, Google "şiddetle önerilir" diyor. Hackathon hacminde (yüzlerce istek) key yeterli — **varsayım: imzasız günlük kota hackathon hacmimizi aşar**; takılırsak Cloud Console → Quotas → "Unsigned requests" kontrol edilir |

### Örnek istekler (Güngören, gerçek geocode edilmiş koordinatlar)

**a) Tabela / cephe (Posta Caddesi çarşı, Güven Mah.):**

```
https://maps.googleapis.com/maps/api/streetview?size=640x640&location=41.014490,28.874338&heading=131&pitch=10&fov=80&source=outdoor&return_error_code=true&key=YOUR_API_KEY
```

**b) Yol yüzeyi / çukur (Eski Londra Asfaltı, Merter kesimi):**

```
https://maps.googleapis.com/maps/api/streetview?size=640x640&location=41.016600,28.880863&heading=233&pitch=-35&fov=100&source=outdoor&return_error_code=true&key=YOUR_API_KEY
```

**c) Çöp konteyneri / kaldırım (İnönü Caddesi, Güven Mah.):**

```
https://maps.googleapis.com/maps/api/streetview?size=640x640&location=41.010974,28.873841&heading=28&pitch=-10&fov=80&source=outdoor&return_error_code=true&key=YOUR_API_KEY
```

**d) Pano ID pinlenmiş (demo modu — tekrarlanabilirlik garantisi):**

```
https://maps.googleapis.com/maps/api/streetview?size=640x640&pano=PANO_ID_BURAYA&heading=131&pitch=10&fov=80&return_error_code=true&key=YOUR_API_KEY
```

> Not: Görev tanımındaki "Güngören merkez ≈ 41.0036, 28.8728" koordinatı **ilçenin en güney ucuna** düşüyor (OSM'e göre ilçe bbox güney sınırı 41.0017 — neredeyse Bakırköy sınırı). Daha iyi merkez referansı: **Posta Caddesi çarşı ekseni ≈ 41.0144, 28.8743** (Güven/Gençosman). İlçe centroid'i: 41.0253, 28.8726.

---

## 2. Metadata Endpoint — ücretsiz ön-doğrulama (kota yakmadan)

**URL (doğrulandı):**

```
https://maps.googleapis.com/maps/api/streetview/metadata?location=41.014490,28.874338&source=outdoor&key=YOUR_API_KEY
```

Resmî dokümandan birebir alıntı: *"Street View Static API metadata requests are available at no charge. No quota is consumed when you request metadata."* → **Ücretsiz ve kotasız.** İstediğin kadar çağır (anahtar yine zorunlu; rate-limit nezaketi için saniyede birkaç istekle sınırla).

**Örnek yanıt (dokümandan):**

```json
{
  "copyright": "© 2017 Google",
  "date": "2016-05",
  "location": { "lat": 48.857832, "lng": 2.295226 },
  "pano_id": "tu510ie_z4ptBZYo2BGEJg",
  "status": "OK"
}
```

**Status kodları:** `OK` (pano var), `ZERO_RESULTS` (yakında pano yok / geçersiz pano ID), `NOT_FOUND` (adres çözülemedi), `OVER_QUERY_LIMIT`, `REQUEST_DENIED`, `INVALID_REQUEST`, `UNKNOWN_ERROR`.

### Zorunlu kullanım deseni (pipeline kuralı)

1. **Önce metadata** → `status == "OK"` değilse görüntü isteği hiç atma (gri placeholder'a/404'e kota yakma).
2. `pano_id` + `date` + snap edilmiş gerçek `location`'ı fixture'a yaz.
3. Görüntü isteğini **`pano=` ile** at (location ile değil) → tekrarlanabilirlik.
4. `date` alanını dashboard'da göster ("Görüntü tarihi: 2023-08" gibi) → jüriye şeffaflık + veri tazeliği puanı.

### Hack başlangıcında çalıştırılacak ön-uçuş scripti (sadece ücretsiz metadata çağırır)

```bash
#!/usr/bin/env bash
# preflight.sh — fixture'daki her noktanın kapsamasını ücretsiz doğrular, pano_id + tarih doldurur.
# Kullanım: GOOGLE_MAPS_API_KEY=... ./preflight.sh fixtures/gungoren.json
set -euo pipefail
FIXTURE="${1:-fixtures/gungoren.json}"
jq -c '.points[]' "$FIXTURE" | while read -r p; do
  lat=$(jq -r '.lat' <<<"$p"); lng=$(jq -r '.lng' <<<"$p"); id=$(jq -r '.id' <<<"$p")
  resp=$(curl -s "https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=75&source=outdoor&key=${GOOGLE_MAPS_API_KEY}")
  status=$(jq -r '.status' <<<"$resp")
  echo "${id}: ${status} pano=$(jq -r '.pano_id // "-"' <<<"$resp") date=$(jq -r '.date // "-"' <<<"$resp")"
  sleep 0.3   # nezaket rate limiti
done
```

---

## 3. Fiyatlandırma ve Kota (06.06.2026 itibarıyla doğrulandı)

Google, **1 Mart 2025**'te fiyat modelini değiştirdi: $200 aylık kredi kaldırıldı, yerine **SKU başına aylık ücretsiz çağrı eşiği** geldi (Essentials / Pro / Enterprise kademeleri).

### Static Street View SKU'su (SKU kodu: 9BD0-A2EE-44C3 — resmî fiyat sayfasından)

| Kalem | Değer |
|---|---|
| Kademe | **Essentials** |
| Aylık ücretsiz | **10.000 istek/ay** (her ay yenilenir) |
| 10.001 – 100.000 | **$7.00 / 1000 istek** |
| 100.001 – 500.000 | $5.60 / 1000 |
| 500.001 – 1.000.000 | $4.20 / 1000 |
| Metadata (Static Street View Metadata SKU) | **$0.00 — kota tüketmez** |
| Rate limit | **30.000 sorgu/dakika** (bizim için fiilen sınırsız) |
| Maks. görüntü boyutu | **640×640** (standart erişimde kesin sınır; daha büyüğü için Google ile özel anlaşma gerekir — hackathon'da yok sayılır) |
| Eski $200 kredi | Kaldırıldı (Mart 2025) |

**AGENTS.md'deki "ilk 10.000 istek kotasını koru" kuralının doğrulaması:** Bu varsayım **2026 modeline birebir oturuyor** — 10.000, Essentials SKU'larının aylık ücretsiz eşiğidir. 10.000'i aşan her görüntü isteği faturaya $7/1000 yazar.

**Önemli faturalama ayrıntısı:** *Her görüntü isteği ayrı faturalanır* — aynı panoramadan 3 farklı heading çekmek = 3 istek. Metadata istekleri hiç sayılmaz.

### Hackathon bütçe simülasyonu

| Senaryo | İstek | Kota durumu |
|---|---|---|
| 14 nokta × 3 heading × 1 kez fetch (cache'li pipeline) | 42 görüntü | %0,4 |
| Geliştirme boyunca 20 tam tekrar (cache'siz, en kötü durum) | 840 görüntü | %8,4 |
| Demo provası + sahne (cache'den; canlı fallback 50 istek) | +50 | toplam < %10 |

**Sonuç: fetch-once + cache disipliniyle ücretsiz eşiğin %10'unu bile harcamayız.** Tek tehlike: cache'i unutup her sayfa yeniliğinde yeniden fetch eden bir Next.js/Go kodu yazmak. Go backend'de görüntü fetch'i tek bir servis fonksiyonuna koy, önce disk/DB cache'e bak, yoksa fetch + kaydet; ayrıca process içi sayaç tut ve 1.000 istekte uyarı logla (rate-limit + kota koruması AGENTS.md şartı).

---

## 4. Cache Stratejisi ve ToS — EN KRİTİK HUKUKİ BÖLÜM

### 4.1 ToS'un fiilen söyledikleri (06.06.2026'da canlı çekilen metinden birebir alıntılar)

**Google Maps Platform Terms of Service, §3.2.3 "Restrictions Against Misusing the Services":**

> **(a) No Scraping.** "Customer will not export, extract, or otherwise scrape Google Maps Content for use outside the Services. For example, Customer will not: (i) pre-fetch, index, store, reshare, or rehost Google Maps Content outside the services; (ii) **bulk download** Google Maps tiles, **Street View images**, geocodes, …"

> **(b) No Caching.** "Customer will not cache Google Maps Content except as expressly permitted under the Maps Service Specific Terms."

> **(c) No Creating Content From Google Maps Content.** "Customer will not create content based on Google Maps Content. For example, Customer will not: … **(v) construct an index of tree locations within a city from Street View imagery**; … (vii) **use Google Maps Content to improve machine learning and artificial intelligence models, including to train, test, validate or fine-tune the models**."

**Maps Service Specific Terms, §3 "Google ID Caching":**

> "Customer may cache the Google ID values from the Services that return such field and allow caching… For example, Customer may cache … (b) **pano_ID, from Street View Static API**…"

Street View Static API policies sayfası bunu netleştiriyor: *"The panorama ID … is exempt from the caching restriction. Therefore, you can store panorama ID values **indefinitely**."*

### 4.2 Bunun bizim projeye çevirisi — açık konuşalım

| Eylem | ToS durumu |
|---|---|
| `pano_id` + kendi ürettiğimiz istek parametrelerini (heading/pitch/fov) süresiz saklamak | ✅ Açıkça izinli |
| Görüntüyü kullanıcıya API'den geldiği anda göstermek (proxy/passthrough) | ✅ Normal kullanım |
| Görüntüyü diske/DB'ye indirip saklamak (cache) | ❌ 3.2.3(a)(i) + (b) ihlali (pano_id istisnası görüntüyü kapsamaz) |
| Street View görüntülerinden **şehir çapında kentsel obje envanteri** çıkarmak | ❌ 3.2.3(c)(v)'teki yasak örnek ("construct an index of tree locations within a city from Street View imagery") **bizim senaryonun birebir karşılığı** — ağaç yerine tabela/konteyner/çukur |
| SV görüntüleriyle model **eğitmek/test etmek/doğrulamak/fine-tune etmek** | ❌ 3.2.3(c)(vii) açık yasak |

**Bu, projenin konseptiyle ToS arasında gerçek bir gerilim demektir.** Bunu yok saymak yerine şöyle yönetiyoruz:

### 4.3 Hackathon-pragmatik yaklaşım (önerilen karar)

Gerekçe zinciri: (1) Street View hackathon organizasyonunun **zorunlu kıldığı** veri kaynağı; (2) kullanım tek günlük, ticari olmayan, ~100 görüntülük bir **prototip demosu**; (3) ürünün gerçek hedefi zaten AGENTS.md'de yazdığı gibi **belediye atık araçlarının kendi kamera görüntüleri** — Street View yalnızca demo günü vekil (stand-in) veri. Buna göre:

1. **Sakladığımız tek Google verisi `pano_id` olsun** (+ kendi parametrelerimiz + metadata `date`). DB şemasında ham SV görüntüsü kolonu olmasın.
2. **Görüntü akışı:** fetch → bellekte/geçici dosyada → **anonimleştirme gate** (kendi blur'umuz) → tespit → **sadece blurlanmış kanıt görseli (derivative) + detection JSON** sakla. Ham (blursuz) SV görüntüsü kalıcı olarak hiçbir yere yazılmaz.
3. Blurlanmış türevler **public repoya, Vercel/Render artifact'ine, public bucket'a asla commit edilmez** (hem ToS "rehost" yasağı hem AGENTS.md ham veri kuralı). `demo_cache/` klasörü `.gitignore`'da.
4. **Hackathon sonunda tüm SV türevleri silinir** — KVKK silme taahhüdü belgesi aynı zamanda ToS temizliği olarak da iş görür (tek taşla iki kuş; README'ye tek paragraf).
5. README'de dürüst bir not: "Street View görüntüleri yalnızca hackathon demo'su için, organizasyon şartı gereği kullanılmıştır; üretim hedefi belediyenin kendi araç kameralarıdır. Google ToS'un içerik türetme kısıtları bilinmektedir ve SV verisi demo sonrasında silinmiştir." → Jüriye hukuki farkındalık puanı.
6. **Model eğitimi/fine-tune için SV görüntüsü KESİNLİKLE kullanma** (3.2.3(c)(vii)). Hugging Face'ten hazır model kullan, SV sadece **inference girdisi** olsun. (İnference da kelimenin tam anlamıyla (c)(v) kapsamında türetme sayılır; risk sıralamasında en savunulabilir nokta "hazır model + geçici demo verisi + silme".)

**Risk derecesi (değerlendirmem):** Pratik yaptırım riski hackathon bağlamında **çok düşük** (düşük hacim, 1 gün, ticari değil); teorik/hukuki uyumsuzluk **gerçek ve belgelenmeli**. Üretime giderken Street View tamamen bırakılmalı.

### 4.4 Tekrarlanabilirlik: pano_id mi lat/lng mi?

- `location=lat,lng` → API **en yakın panoya snap eder** (varsayılan radius 50 m). Aynı koordinat, görüntü güncellenirse **farklı bir panoya** düşebilir; ayrıca yol çift yönlüyse iki ayrı geçişten birine rastgele yakınlık olabilir. Sahne demosu için kumar.
- `pano=PANO_ID` → **deterministik**: aynı pano + aynı `size/heading/pitch/fov` = bayt bayt aynı render. Sahnedeki canlı demo şartını ("aynı koordinat aynı sonucu üretmeli") garanti eden tek yol.
- Nüans: Google dokümanı pano ID'lerin *zamanla* değişebileceğini söylüyor (görüntü yenilenince eski pano emekli olur — aylar/yıllar ölçeği). **Demo günü içinde fiilen %100 sabittir.** Yine de fixture'da lat/lng'yi yedek olarak tut; pipeline'da `pano` 404 verirse metadata ile lat/lng'den yeniden çöz (self-healing).

---

## 5. Tekrarlanabilir Demo: fixture + offline fallback

### 5.1 Akış

1. **Saat 11:00 civarı (kurulum):** `preflight.sh` çalıştır → 14 noktanın her biri için ücretsiz metadata'dan `pano_id`, `date`, snap edilmiş `location` al, `fixtures/gungoren.json`'a yaz. `ZERO_RESULTS` veren noktayı en yakın ana caddeye kaydır (radius=75–100 dene).
2. **Tek seferlik ingest:** her fixture noktası için görüntüleri fetch et → blur gate → tespit → sonuçları Postgres'e yaz. Bu andan itibaren demo **cache'den/DB'den** çalışır; sahnede Google'a bağımlılık sıfıra iner.
3. **Sahne modu:** UI'da "Demo Run" butonu fixture'daki pano_id'leri sırayla işler (DB'de varsa cache'den, yoksa canlı fetch). Aynı pano_id + aynı model + sabit seed/threshold = aynı tespitler → jüri şartı sağlanır. `model_version + threshold + pano_id` üçlüsünü detection kaydına yaz (denetlenebilirlik).

### 5.2 WiFi ölürse (offline fallback)

**Öneri: blurlanmış türev görüntüler demo makinesinin lokal diskinde `demo_cache/` altında tutulur (gitignored), sunum Next.js'i lokal çalıştırılabilir.**

- ✅ KVKK açısından güvenli: görüntüler kendi gate'imizden geçmiş (yüz/plaka geri döndürülemez blurlu).
- ⚠️ ToS açısından: teknik olarak "store" — §4.3'teki pragmatik çerçevede, lokal + geçici + silinecek olduğu için kabul edilen risk.
- ❌ **Yapma:** blurlu bile olsa SV görüntülerini public GitHub reposuna commit etmek (ToS "reshare/rehost" ihlali; ayrıca repo herkese açıksa Google attribution/lisans karmaşası). Commit edilecek olanlar: `fixtures/gungoren.json` (koordinat+pano_id+parametre — pano_id saklamak izinli), detection JSON çıktıları ve ekran görüntüsü YERİNE çizim/maket görseller.
- Sunum yedeği: demo akışının ekran kaydı (video) sunum makinesinde lokal dursun — sahnede her şey çökerse video oynat.

---

## 6. Türkiye / İstanbul / Güngören kapsaması

**Doğrulananlar:**
- Türkiye Street View'a **22 Ekim 2015**'te eklendi (Wikipedia, GSV Europe sayfası).
- İstanbul güncellemeleri sürüyor; VirtualStreets (Street View takip topluluğu) 2024 raporuna göre Türkiye'de **Ocak 2024 tarihli yeni görüntüler** dahil güncellemeler yayınlandı; Ekim 2023–Temmuz 2024 arası çekimler 2024'te yayına alındı.
- "Street View **Insights**" adlı ayrı (premium kapsama-analitik) üründe Türkiye **yok** — bu bizi etkilemez; klasik Street View Static API kapsaması ayrı bir konudur ve Türkiye'de mevcuttur. (Ekip bu sayfaya denk gelirse kafa karışmasın diye not.)

**Varsayımlar (per-sokak doğrulanamadı — metadata `date` alanı hack günü kesinleştirir):**
- Güngören gibi merkezi, yoğun bir ilçenin **ana arterlerinin** (Posta Cad., İnönü Cad., Fatih Cad., Eski Londra Asfaltı, Gen. Ali Rıza Gürcan Cad.) 2015'ten beri kapsandığı ve görüntülerin 2015–2024 arası karışık tarihli olduğu **yüksek olasılıklı varsayımdır**. Dar ara sokaklarda boşluk olabilir → fixture'ı ana caddelere kurduk.
- Görüntü yaşı riski: 2015 tarihli bir panoda bugün orada olmayan tabela/konteyner görülebilir. Demo anlatımında dürüst çerçeve: "Sistem, görüntünün çekim tarihindeki envanteri çıkarır; belediye aracı entegrasyonunda görüntüler günlük tazelikte olur." `date` alanını UI'da göstermek bu riski özelliğe çevirir.

### 6.1 640×640 sınırının küçük obje tespitine etkisi

| Hedef | 640px'te zorluk | Neden / taktik |
|---|---|---|
| Tabela (dükkan cephesi) | **Kolay** | Büyük, yüksek kontrast, kameraya yakın (5–15 m). fov 75–90 yeterli |
| Çöp konteyneri | **Orta** | ~1 m boyunda, kaldırımda 3–10 m mesafede. fov 70–80 (hafif zoom) + pitch −5…−15 ile çerçevenin alt yarısına al |
| Yol çukuru | **Zor** | Küçük, düşük kontrast, perspektifle ezilir. Literatür GSV'den çukur tespitinin yapılabildiğini gösteriyor (örn. SVRDD: Pekin'den 8.000 GSV görüntüsü, 20.804 kutu, çukur dahil 6 hasar sınıfı, YOLO formatı — Scientific Data 2024; ayrıca Springer 2025 "Pothole Detection and Mapping via Google Street View") ama recall düşük olur. Taktik: pitch −30…−45 (kamera ~2,5–3 m yükseklikte, bu açı 3–10 m önündeki asfaltı doldurur), fov 90–110 yerine **fov 70–90 + iki ayrı heading** (şerit başına bir kare) → piksel yoğunluğu artar. MVP mesajı: çukur "deneysel sınıf", tabela+konteyner "güvenilir sınıf" |

**Zoom hilesi:** fov'u düşürmek bedava optik zoom'dur (640 piksel daha dar açıya yayılır). fov 120 tek karede çok şey gösterir ama her obje minicik kalır — tespit için fov 70–90 bandında kal, gerekirse aynı panodan 2–3 heading çek (her biri 1 istek; bütçede bolca yer var).

### 6.2 Kullanım senaryosuna göre kamera reçeteleri

| Senaryo | heading | pitch | fov | Açıklama |
|---|---|---|---|---|
| (a) Dükkan tabelası | yol doğrultusu ± 90° (kaldırıma dik bakış) | **+5…+15** | **75–90** | Tabelalar vitrin üstünde ~3–5 m'de; hafif yukarı bak. İki cephe için iki heading (±90) |
| (b) Yol yüzeyi / çukur | yol doğrultusu (aracın baktığı eksen) | **−30…−45** | **70–100** | −60'tan aşağısı kamera aracının tavanını/nadir dikişini görmeye başlar, kaçın. −35 tatlı nokta (varsayım; sahada metadata+önizleme ile ayarla) |
| (c) Kaldırımdaki çöp konteyneri | yol doğrultusu ± 90° | **−5…−15** | **70–80** | Konteyner zemin seviyesinde; ufka değil hafif aşağı bak |

> Aşağıdaki fixture'daki `heading` değerleri OSM yol geometrisinden **hesaplanmış gerçek yol doğrultularıdır** (Overpass API ile); ±90 kaldırım yönleri de hesaplandı. `heading` mutlak pusula yönü olduğundan Google aracının gidiş yönünden bağımsız çalışır.

---

## 7. Google'ın yüz/plaka blur'u yeterli mi? → HAYIR, kendi gate'imiz şart

**Doğrulanmış veri:** Google'ın kendi yayını (Frome ve ark., *"Large-scale Privacy Protection in Google Street View"*, ICCV 2009): otomatik sistem yüzlerin **~%89**'unu, plakaların **%94–96**'sını blurluyor. Yani o ölçümde **yüzlerin ~%11'i, plakaların ~%4–6'sı açık kalıyor**. Aynı makale, en iyi yüz dedektörlerinin bile GSV'nin "vahşi" veri setinde %78'in altında kaldığını söylüyor. 2009'dan beri iyileşme olmuştur (**varsayım** — Google güncel oran yayınlamıyor) ama %100 olmadığı kesin: Google bu yüzden halen "blur talep et" aracı sunuyor.

**Bilinen kaçırma desenleri:** yan/eğik açıdaki yüzler, camlardaki/araç içindeki kişiler, yansımalar, kısmen kapalı plakalar, billboard/poster yüzleri (bazen blurlanır bazen blurlanmaz — tutarsız).

**Karar — kendi blur gate'i ZORUNLU, üç gerekçe:**
1. **KVKK savunma derinliği:** Google blur'una güvenmek "veri işleyenin kendi tedbiri" sayılmaz; %11 açık yüz, KVKK kapsamında işlenen biyometrik-benzeri veri sızıntısıdır. Kendi geri döndürülemez blur/mask katmanımız teslim kriterinin (10 puan) özüdür.
2. **Gelecek girdi kaynağı:** Ürünün hedefi belediye atık aracı kameraları — o görüntülerde **Google blur'u hiç yok**. Gate bugünden pipeline'ın değişmez parçası olursa mimari yarın da geçerli.
3. **Jüri kanıtı:** "Google zaten blurluyor" diyen rakip takıma karşı, kendi gate'inin önce/sonra örneğini (yüzü Google'ın kaçırdığı bir karede) göstermek güçlü demo anıdır.

Uygulama notu: gate, tespit edilen yüz/plaka kutularını **geri döndürülemez** doldurmalı (Gaussian blur yüksek kernel + üstüne solid renk en garantisi); yüz/plaka modeli SADECE anonimleştirme amaçlı (AGENTS.md kuralı — plaka OCR/yüz tanıma kesin yasak).

---

## 8. Fixture Önerisi: 14 nokta (gerçek koordinatlar, hesaplanmış heading'ler)

Koordinat kaynağı: OSM Nominatim geocoding + Overpass yol geometrisi (06.06.2026). **Street View kapsaması hiçbir nokta için canlı doğrulanAMAdı** (gerçek anahtarla çağrı yapılmadı) → tüm noktalar `"coverage": "varsayim"`; ana arter oldukları için kapsama olasılığı yüksek. Hack başında `preflight.sh` ücretsiz metadata ile hepsini kesinleştirir ve `pano_id`/`date`/`status` alanlarını doldurur.

```json
{
  "district": "Güngören, İstanbul",
  "crs": "WGS84",
  "image": { "size": "640x640", "source": "outdoor", "return_error_code": true },
  "note": "pano_id'ler hack başında ücretsiz metadata endpoint'i ile doldurulur (preflight.sh). heading'ler OSM yol geometrisinden hesaplandı. Tüm noktalar icin Street View kapsamasi 'varsayim' — ana arterler, yüksek olasılık.",
  "points": [
    { "id": "gx01", "name": "Posta Caddesi çarşı (Güven Mah.)",                "lat": 41.014490, "lng": 28.874338, "use_case": "tabela",         "heading": 131, "pitch": 10,  "fov": 80,  "alt_headings": [311], "pano_id": null, "coverage": "varsayim" },
    { "id": "gx02", "name": "Posta Caddesi batı (Haznedar Mah.)",              "lat": 41.014128, "lng": 28.864898, "use_case": "tabela",         "heading": 184, "pitch": 10,  "fov": 80,  "alt_headings": [4],   "pano_id": null, "coverage": "varsayim" },
    { "id": "gx03", "name": "Posta Caddesi doğu (Sanayi Mah.)",                "lat": 41.016412, "lng": 28.879140, "use_case": "tabela",         "heading": 175, "pitch": 10,  "fov": 80,  "alt_headings": [355], "pano_id": null, "coverage": "varsayim" },
    { "id": "gx04", "name": "İnönü Caddesi (Güven Mah.)",                      "lat": 41.010974, "lng": 28.873841, "use_case": "cop_konteyneri", "heading": 28,  "pitch": -10, "fov": 75,  "alt_headings": [208], "pano_id": null, "coverage": "varsayim" },
    { "id": "gx05", "name": "İnönü Caddesi (Akıncılar Mah.)",                  "lat": 41.014559, "lng": 28.870936, "use_case": "cop_konteyneri", "heading": 57,  "pitch": -10, "fov": 75,  "alt_headings": [237], "pano_id": null, "coverage": "varsayim" },
    { "id": "gx06", "name": "Güngören Belediyesi önü (Marmara Cad. 38)",       "lat": 41.010259, "lng": 28.874899, "use_case": "tabela",         "heading": 150, "pitch": 5,   "fov": 90,  "alt_headings": [330], "pano_id": null, "coverage": "varsayim", "note": "Demo açılış noktası. Bina adresi kaynaklarda çelişik (OSM: Marmara Cad./Haznedar; bel.tr: Gençosman Mah. Posta Cad. 38) — heading sahada ayarlanmalı (varsayim)" },
    { "id": "gx07", "name": "Marmara Caddesi (Haznedar Mah.)",                 "lat": 41.008328, "lng": 28.870443, "use_case": "tabela",         "heading": 329, "pitch": 5,   "fov": 85,  "alt_headings": [149], "pano_id": null, "coverage": "varsayim" },
    { "id": "gx08", "name": "Fatih Caddesi - Merter tekstil çarşısı",          "lat": 41.014460, "lng": 28.883274, "use_case": "tabela",         "heading": 273, "pitch": 10,  "fov": 80,  "alt_headings": [93],  "pano_id": null, "coverage": "varsayim" },
    { "id": "gx09", "name": "Fatih Caddesi güney (M. Nesih Özmen Mah.)",       "lat": 41.010339, "lng": 28.883455, "use_case": "cop_konteyneri", "heading": 254, "pitch": -10, "fov": 75,  "alt_headings": [74],  "pano_id": null, "coverage": "varsayim" },
    { "id": "gx10", "name": "Gen. Ali Rıza Gürcan Cad. (Tozkoparan, Merter)",  "lat": 41.006980, "lng": 28.894707, "use_case": "tabela",         "heading": 317, "pitch": 5,   "fov": 85,  "alt_headings": [137], "pano_id": null, "coverage": "varsayim" },
    { "id": "gx11", "name": "Gen. Ali Rıza Gürcan Cad. (A. Nafiz Gürman Mah.)","lat": 41.004202, "lng": 28.890469, "use_case": "yol_cukuru",     "heading": 56,  "pitch": -35, "fov": 90,  "alt_headings": [236], "pano_id": null, "coverage": "varsayim" },
    { "id": "gx12", "name": "Eski Londra Asfaltı (Merter kesimi)",             "lat": 41.016600, "lng": 28.880863, "use_case": "yol_cukuru",     "heading": 233, "pitch": -35, "fov": 100, "alt_headings": [53],  "pano_id": null, "coverage": "varsayim" },
    { "id": "gx13", "name": "Eski Londra Asfaltı (Haznedar yan yol)",          "lat": 41.008730, "lng": 28.875138, "use_case": "yol_cukuru",     "heading": 177, "pitch": -35, "fov": 100, "alt_headings": [357], "pano_id": null, "coverage": "varsayim" },
    { "id": "gx14", "name": "Eski Londra Asfaltı doğu (Tozkoparan/Cömertkent)","lat": 41.019232, "lng": 28.899100, "use_case": "cop_konteyneri", "heading": 142, "pitch": -10, "fov": 75,  "alt_headings": [322], "pano_id": null, "coverage": "varsayim" }
  ]
}
```

Dağılım: 7 tabela, 4 çöp konteyneri, 3 yol çukuru; mahalle çeşitliliği (Güven, Haznedar, Akıncılar, Sanayi, M. Nesih Özmen/Merter, Tozkoparan, A. Nafiz Gürman) → "ilçe genelinde envanter" hikayesini haritada güzel gösterir. Demo için 14'ünden en iyi sonuç veren 5–8'i sahne akışına alınır; kalanlar dashboard'da dolu durur.

**Heading mantığı:** `heading` = OSM'den hesaplanan yol doğrultusu ± 90° (tabela/konteyner için kaldırıma dik) veya yol doğrultusunun kendisi (yol yüzeyi için). `alt_headings` karşı kaldırım/karşı yön. Tabela noktalarında pratik taktik: `heading` ve `alt_headings`'in **ikisini de** fetch et (nokta başına 2 istek) — çift taraflı envanter + daha dolu demo haritası.

---

## 9. Risk Listesi (öncelik sırasıyla)

1. **ToS — içerik türetme (YÜKSEK teorik, DÜŞÜK pratik):** GMP ToS 3.2.3(c)(v) "Street View görüntülerinden şehir içi obje endeksi kurma" örneğini açıkça yasaklıyor; (c)(vii) ML train/test/validate yasağı. → §4.3 pragmatik çerçeve: yalnız inference, pano_id+JSON sakla, görüntü türevleri lokal+geçici, hackathon sonu silme belgesi, README'de şeffaf not, üretimde belediye kamerasına geçiş.
2. **KVKK — Google blur kaçırmaları (YÜKSEK):** ~%11 yüz açık kalabilir. → Kendi geri döndürülemez blur gate'i her görüntüde zorunlu; gate'ten geçmemiş hiçbir kare UI'a/diske/sahneye çıkmaz.
3. **ToS/KVKK — repo sızıntısı (YÜKSEK, kolay önlenir):** SV görüntüsü (blurlu bile olsa) public GitHub'a/Vercel artifact'ine commit edilirse hem ToS rehost ihlali hem AGENTS.md ihlali. → `demo_cache/` gitignore'da; CI'da görüntü uzantısı commit guard'ı (basit pre-commit kontrolü).
4. **Kapsama sürprizi (ORTA):** Fixture noktalarından bazıları `ZERO_RESULTS` verebilir (özellikle ara sokak). → Hack'in ilk yarım saatinde ücretsiz preflight; 14 noktadan 8 sağlam nokta kalsa demo yeter.
5. **Kota yakan döngü hatası (ORTA):** Cache'siz re-fetch loop'u 10.000'i eritebilir. → Tek fetch servisi + DB cache + istek sayacı + 1.000'de log uyarısı; Cloud Console'da günlük kota tavanı elle ~2.000'e çekilebilir (anahtar sahibinden istenir).
6. **Görüntü yaşı (DÜŞÜK):** 2015–2024 karışık tarihli görüntülerde bugünkü sokak durumu farklı olabilir. → `date` alanını UI'da göster; anlatıyı "çekim tarihli envanter" olarak kur.
7. **Attribution (DÜŞÜK, puan kaçağı):** Google attribution'ı (görüntü üstündeki "© Google" yazısı) kırpma/gizleme yasak. 640×640'ı olduğu gibi göster; UI'da ayrıca "Imagery © Google" alt yazısı ekle.
8. **Anahtar sızıntısı (DÜŞÜK):** İstek URL'leri client'a inerse key görünür. → Fetch'i Go backend'de proxy'le; key yalnız server-side `.env`'de; Next.js client'a asla `NEXT_PUBLIC_` ile koyma. (İsteğe bağlı: Cloud Console'da key'i Street View Static + Maps API'lerine ve sunucu IP'sine kısıtla.)

---

## 10. Kaynaklar

- İstek formatı: https://developers.google.com/maps/documentation/streetview/request-streetview (06.06.2026'da çekildi)
- Metadata (ücretsiz): https://developers.google.com/maps/documentation/streetview/metadata
- Kullanım/faturalama, 640×640 ve 30.000 QPM: https://developers.google.com/maps/documentation/streetview/usage-and-billing
- Güncel fiyat listesi (Essentials, 10.000 ücretsiz/ay, $7/1000): https://developers.google.com/maps/billing-and-pricing/pricing
- Mart 2025 model değişikliği: https://developers.google.com/maps/billing-and-pricing/march-2025
- ToS 3.2.3 (No Scraping / No Caching / No Creating Content): https://cloud.google.com/maps-platform/terms
- Service Specific Terms (pano_ID cache izni): https://cloud.google.com/maps-platform/terms/maps-service-terms
- Street View Static API policies (pano ID süresiz saklama + attribution): https://developers.google.com/maps/documentation/streetview/policies
- Dijital imza: https://developers.google.com/maps/documentation/streetview/digital-signature
- Google blur makalesi (%89 yüz / %94–96 plaka): https://research.google/pubs/large-scale-privacy-protection-in-google-street-view/ (ICCV 2009 PDF: https://research.google.com/archive/papers/cbprivacy_iccv09.pdf)
- Türkiye SV lansmanı (22 Eki 2015): https://en.wikipedia.org/wiki/Google_Street_View_in_Europe
- 2024 Türkiye güncellemeleri: https://virtualstreets.org/index.php/2025/01/01/2024-in-google-street-view-a-look-back-and-forward/
- GSV ile yol hasarı tespiti literatürü: SVRDD dataseti — https://www.nature.com/articles/s41597-024-03263-7 ; Springer 2025 — https://link.springer.com/chapter/10.1007/978-3-031-85923-6_12
- Koordinat/geometri: OSM Nominatim + Overpass API (ODbL lisansı; yalnızca koordinat üretiminde kullanıldı, Google kotası harcanmadı)
