# Cursor x ALT+TAB Hackathon Agent Contract

Bu repo, 6 Haziran 2026 Cursor Hackathon: AI-Driven Kentsel Cozumler icin gelistirilir. Tum ajanlar once bu dosyayi okur, sonra isi tamamlanana kadar otonom sekilde ilerler.

## Ana Hedef

Gungoren Belediyesi atik toplama araclarindan gelen kamera/street-view benzeri goruntuler uzerinden, yalnizca kentsel objeleri tespit eden ve harita/durum paneline aktaran calisan bir demo uret.

Oncelikli MVP:
1. Goruntu kaynagini al.
2. Yuz ve plakalari geri dondurulemez sekilde bulaniklastir.
3. Tabela/kentsel obje tespiti yap.
4. Tespitleri konum, guven skoru ve kanit gorseli ile kaydet.
5. Web arayuzunde harita/liste/inceleme ekrani sun.
6. Canli demoda ayni girdiden tekrarlanabilir sonuc uret.

## Zorunlu Stack

- Web: Next.js
- Mobil: Expo; organizasyonun verdigi mimari sablona uy.
- Backend: Go; kesinlikle `masterfabric-go` GitHub reposundaki mimari kullanilir. Kendi Go mimarini kurma.
- Backend kaynak varsayimi: `https://github.com/gurkanfikretgunak/masterfabric-go`. Organizasyon farkli URL verirse once bu dosyayi guncelle.
- AI veri seti ve model kaynagi: Hugging Face platformu kullanilir. Lokal model agirliklari sadece demo/gelistirme cache'i olabilir.
- Hosting: Web icin Vercel. Backend icin Render.com zorunludur.
- Database: Render Postgres tercih edilir ve Go backend `DATABASE_URL` ile baglanir. Lokal demo icin gecici JSON/SQLite sadece offline fallback olarak kullanilabilir; final deploy'da kaynak gercegi Postgres olmalidir.
- Harici API: Google Street View API / Google Maps API, ilk 10.000 istek kotasini koruyacak sekilde cache ve rate-limit ile kullan.
- AI/CV: Hazir model veya servis kullanilabilir; insan kimligi, kisi profilleme, arac/kisi takibi yasaktir.

Yeni dependency ekleme, mimariyi buyutme veya stack disina cikma ancak acik teknik gerekce varsa yapilir ve README'de belgelenir.

## Cursor Ruleset ve AI Dokumantasyonu

- Cursor IDE kullanimi zorunludur.
- Agentic ruleset repo icinde `.cursor/rules/` altinda tutulur.
- Cursor CLI veya Cursor SDK kullanilirsa README'de hangi otomasyon icin kullanildigi belgelenir; bu AI Adaptasyonu icin bonus deger tasir.
- README, kullanilan AI araclarini, prompt tekniklerini, model/servis kararlarini, Hugging Face dataset/model akisini ve bu araclarin gelistirmeyi nasil hizlandirdigini acikca anlatmalidir.

## Ortam Degiskenleri ve CLI Yetkileri

- Gerekli tum anahtarlar `.env` icindedir veya `.env.example` icinde placeholder olarak listelenmelidir.
- `.env` dosyasini asla commit etme, terminalde tam icerigini yazdirma veya loglara dusurme.
- Vercel, Render, Railway, Google ve AI servis CLI/API islemlerinde once `.env` degerlerini kullan.
- CLI komutlari calisirken secret degerlerini maskele; debug ciktisi gerekiyorsa sadece degisken adini ve var/yok durumunu raporla.
- Eksik secret varsa once `.env.example` guncelle, sonra kullaniciya sadece eksik degisken adini soyle.

Beklenen degisken aileleri:
- `GOOGLE_MAPS_API_KEY` veya `GOOGLE_STREET_VIEW_API_KEY`
- `VERCEL_TOKEN`
- `RENDER_API_KEY`
- `HUGGINGFACE_API_KEY` veya `HF_TOKEN`
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` veya kullanilan diger AI servis anahtarlari
- `GEMINI_API_KEY` veya kullanilan diger Google AI servis anahtarlari
- `GEMINI_MODEL`; varsayilan tercih `gemini-3.1-flash-lite`
- `DATABASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`

## KVKK ve Etik Kapilar

Bu proje icin KVKK uyumu teknik ozellik degil, teslim kriteridir.

- Model amaci yalnizca kentsel objeler: tabela, direk, cop konteyneri, yol/cevre envanteri gibi kamusal altyapi.
- Kimlik tespiti, kisi profilleme, yuz tanima, plaka okuma, arac/kisi takibi kesin yasak.
- Ham goruntuler egitim, test veya demo oncesinde yuz ve plaka anonimlestirme hattindan gecmelidir.
- Anonimlestirme geri dondurulemez olmali; blur veya solid mask yeterli guvenlikte uygulanmali.
- Ham veri sifrelenmemis buluta, acik GitHub reposuna, Vercel/Render/Railway build artifact'lerine veya public bucket'a yuklenemez.
- Hackathon sonunda ham goruntuler silinmeli; silme/anonimlestirme belgesi README veya ayri teslim dokumaninda yer almalidir.
- Kod ve README, hangi verinin saklandigini ve hangi verinin saklanmadigini acikca belirtmelidir.

## Gelistirme Oncelikleri

Puanlama agirliklarina gore calis:
1. Teknik calisirlilik: derlenen, deploy edilebilen, canli demo veren sistem.
2. Dogruluk ve guvenilirlik: tespit skorlari, tekrar calistirmada stabil sonuc, temel hata senaryolari.
3. Kamu faydasi: belediye is akisini kolaylastiran harita/liste/rapor ciktilari.
4. AI adaptasyonu: Cursor/ajan kurallari, promptlar, model/servis secimleri ve README dokumantasyonu.
5. KVKK ve etik: anonimlestirme, veri minimizasyonu, silme taahhudu.
6. Sunum ve dokumantasyon: kisa, net, calistirma adimlari olan README.

Dar zamanda "calisan dikey demo" her zaman genis ama yarim ozelliklerden once gelir.

## Repo ve Commit Kurallari

- Sik ve anlamli commit at; tek parca final upload kabul edilmez.
- Her anlamli asama icin commit yap: scaffold, anonymization, detection, API, UI, deploy, docs.
- Organizasyon/juri sureci commit loglarini inceleyecegi icin her checkpoint GitHub'a pushlanir.
- Commit mesajlari neden odakli olsun. Ornek: `Protect demo data with anonymization gate`.
- `.env`, ham veri, yuz/plaka iceren gorseller, buyuk model agirliklari ve local runtime dosyalari commit edilmez.
- User tarafindan yapilmis degisiklikleri geri alma. Gerekirse ustune uyumlu calis.

## Kod Kalitesi

- Once mevcut dosya ve mimariyi oku, sonra en kucuk dogru degisikligi yap.
- Next.js, Expo ve Go katmanlarini temiz ayir: UI, API, CV/job pipeline, storage.
- Go backend uzerinde `masterfabric-go` mimarisinin klasor/katman ayrimini bozma; yeni endpointleri mevcut patternlere ekle.
- Ortak sozlesmeleri typed/structured tut: JSON schema, Go struct, TypeScript type.
- Hata durumlarini demoda saklama: kullaniciya anlasilir hata, loglara teknik detay yaz.
- Rate limit, API kota ve retry davranisini dusun.
- Test eklemenin maliyeti dusukse ekle; kritik veri/anonimlestirme davranisini testle.

## Dogrulama

Bitirdim demeden once uygun olanlari calistir:
- Web: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- Go: `go test ./...`, `go vet ./...`
- Expo: `npx expo-doctor` veya mevcut proje scriptleri
- CV pipeline: sabit fixture ile tekrar calistir, ayni cikti formatini dogrula
- Deploy: Vercel/Render/Railway health check ve canli endpoint kontrolu

Calistiramadigin dogrulamayi final raporda acikca yaz.

## README Teslim Icerigi

README en az sunlari icermeli:
- Problem ve kamu faydasi
- Mimari diyagram veya metinsel akisi
- Kurulum ve calistirma adimlari
- `.env.example` aciklamasi
- AI araclari dokumantasyonu: Cursor IDE, ajan kurallari, kullanilan prompt/servis/model, gelistirmeyi nasil hizlandirdigi
- Hugging Face dataset/model kullanimi ve model secim gerekcesi
- Cursor CLI/SDK kullanildiysa otomasyon ve komutlar
- KVKK/etik uyum: anonimlestirme, veri minimizasyonu, ham veri silme taahhudu
- Demo senaryosu ve beklenen ciktilar
- Bilinen limitler ve sonraki adimlar

## Hackathon Akisi

- 10:00-11:00: Teknik zorunluluk kriter cizelgesini al, bu dosyayi gerekiyorsa guncelle.
- 11:00: Organizasyonun verdigi Expo/Go mimarisini uygula.
- 11:00-17:00: Calisan MVP, commit gecmisi, dokumantasyon ve deploy.
- 17:00 sonrasi: Canli demo, tekrar edilebilir sonuc ve KVKK belgesi.

## Ajan Davranisi

- Net islerde izin sorma; uygula, test et, sonucu raporla.
- Riskli veya geri donulmez islerde dur ve tek net soru sor.
- Secret, ham veri veya KVKK riski gordugunde koruyucu varsayimla hareket et.
- Plan gerekiyorsa once MVP teslim yolunu, sonra bonuslari yaz.
- Final raporda degisen dosyalari, calistirilan testleri ve kalan riskleri belirt.
