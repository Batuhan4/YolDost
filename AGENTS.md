# Cursor x ALT+TAB Hackathon Agent Contract

Bu repo, 6 Haziran 2026 Cursor Hackathon: AI-Driven Kentsel Cozumler icin gelistirilir. Tum ajanlar once bu dosyayi okur, sonra isi tamamlanana kadar otonom sekilde ilerler.

## Ana Hedef

Gungoren Belediyesi icin yetkilendirilmis arac/kamera goruntulerini veya acik
lisansli demo verisini kullanarak sokaklarin fiziksel yapisini analiz eden,
aciklanabilir sokak gostergelerini harita/durum paneline aktaran calisan bir
demo uret.

Urun konumlandirmasi:
- Urun: `OmniSight`.
- Ana kullanici: bir yerden bir yere yuruyen bireyler; ozellikle gece veya
  bilmedigi bir semtte rota secen kullanicilar, turistler, yaslilar,
  engelliler ve cocuklu aileler.
- Ana problem: standart haritalarin rotalari sure/mesafe ile karsilastirip
  sokagin fiziksel acikligini, kaldirimini, yesilligini ve aktif cephe
  potansiyelini gostermemesi.
- Urun vaadi: Google Routes alternatiflerini fiziksel cevre gostergeleriyle
  yeniden siralayarak kullaniciya tercihine uygun rota potansiyeli sunmak.
- Gelir modeli henuz dogrulanmamistir. Ilk hipotezler etik ve rotayi
  etkilemeyen yerel reklam/sponsorlu mekan, premium rota tercihleri ve kurumsal
  mobilite ortakliklaridir. Sponsor veya reklam, rota skorunu degistiremez.
- Belediyeler veri/entegrasyon ortagi veya gelecekte analitik musterisi
  olabilir; MVP'nin ana kullanicisi bireydir.

`Sokak yogunlugu`, insan/yaya sayimi anlamina gelmez. Bu terim yalnizca bina,
duvar, yol, kaldirim, gokyuzu, yesillik ve cansiz kent elemanlarindan uretilen
fiziksel yapi yogunlugu ve yaya konforu potansiyeli icin kullanilir. Sucluluk,
gercek guvenlik, demografi, psikolojik durum, ciro veya canli yaya yogunlugu
iddiasi uretilmez. Arayuz ve API "kesin guvenli" veya "guvenlik garantisi"
demez; `daha guvenli rota potansiyeli` ya da `fiziksel cevre gostergelerine
gore onerilen rota` der.

Oncelikli MVP:
1. Goruntu kaynagini al.
2. Yuz ve plakalari geri dondurulemez sekilde bulaniklastir.
3. Kentsel semantik segmentasyon ve cansiz obje tespiti yap.
4. Yol, kaldirim, bina, gokyuzu ve yesillik oranlarindan aciklanabilir sokak
   gostergeleri uret; konum, model surumu ve veri kaynagi ile kaydet.
5. Web arayuzunde harita/liste/inceleme ekrani sun.
6. Expo uygulamasinda saha/inceleme akisinin mobil karsiligini sun.
7. Canli demoda ayni girdiden tekrarlanabilir sonuc uret.
8. Web, mobil ve backend arasindaki final demo trafigini canli network endpointleri uzerinden calistir.

## Zorunlu Stack

- Web: Next.js
- Mobil: Expo; teslim kapsamindadir ve organizasyonun verdigi mimari sablona uy.
- Backend: Go; kesinlikle `masterfabric-go` GitHub reposundaki mimari kullanilir. Kendi Go mimarini kurma.
- Backend kaynak repo: `https://github.com/gurkanfikretgunak/masterfabric-go`.
- AI veri seti ve model kaynagi: Hugging Face platformu kullanilir. Lokal model agirliklari sadece demo/gelistirme cache'i olabilir.
- Hosting: Web icin Vercel. Backend icin Render.com zorunludur.
- Database: Render Postgres tercih edilir ve Go backend `DATABASE_URL` ile baglanir. Lokal demo icin gecici JSON/SQLite sadece offline fallback olarak kullanilabilir; final deploy'da kaynak gercegi Postgres olmalidir.
- Harici API: Google Street View API / Google Maps API, ilk 10.000 istek kotasini koruyacak sekilde cache ve rate-limit ile kullan.
- Rota: Google Routes API `WALK` alternatifleri kullanilir. Google rota
  icerigi kalici cache'lenmez; Google attribution ve politika gereklilikleri
  korunur.
- AI/CV: Hazir model veya servis kullanilabilir; insan kimligi, kisi profilleme, arac/kisi takibi yasaktir.
- Ana CV tabani: Hugging Face uzerindeki semantic segmentation modeli ile yol,
  kaldirim, bina, duvar, gokyuzu, yesillik ve cansiz kent elemanlari.
- Demo dataset adayi: `Reubencf/streetview-global` (Mapillary kaynakli,
  `CC-BY-SA-4.0`); attribution ve share-alike kosullari README/sunumda
  belgelenir. Tum kareler lokal anonymization gate'inden tekrar gecirilir.
- Model egitimi/fine-tuning compute'u: Modal kullanilabilir. Modal yalnizca lokal anonimlestirme kapisindan gecmis veriyle egitim, deney ve checkpoint uretimi icindir.
- Final demo entegrasyonlari network uzerinden canli calismalidir: web ve Expo, Render'da yayinlanan Go API'ye baglanir. Localhost yalnizca gelistirme ve kontrollu offline fallback icindir.

Yeni dependency ekleme, mimariyi buyutme veya stack disina cikma ancak acik teknik gerekce varsa yapilir ve README'de belgelenir.

## Cursor Ruleset ve AI Dokumantasyonu

- Cursor IDE kullanimi zorunludur.
- Agentic ruleset repo icinde `.cursor/rules/` altinda tutulur.
- Cursor SDK kullanimi hedeflenir; AI Adaptasyonu bonusu icin projede kucuk ama gercek bir otomasyonla kullan ve README'de belgeleyerek goster.
- Cursor CLI de kullanilabiliyorsa README'de hangi komut/otomasyon icin kullanildigi belgelenir; Cursor SDK onceliklidir.
- Cursor SDK entegrasyonu urun cekirdegini riske atmamalidir. Dar zamanda tercih edilen kapsam: README/checklist/demo raporu ureten veya proje kalite kapilarini calistiran yardimci script.
- README, kullanilan AI araclarini, prompt tekniklerini, model/servis kararlarini, Hugging Face dataset/model akisini ve bu araclarin gelistirmeyi nasil hizlandirdigini acikca anlatmalidir.

## Ortam Degiskenleri ve CLI Yetkileri

- Gerekli tum anahtarlar `.env` icindedir veya `.env.example` icinde placeholder olarak listelenmelidir.
- `.env` dosyasini asla commit etme, terminalde tam icerigini yazdirma veya loglara dusurme.
- Vercel, Render, Google ve AI servis CLI/API islemlerinde once `.env` degerlerini kullan.
- Modal CLI islemlerinde `MODAL_TOKEN_ID` ve `MODAL_TOKEN_SECRET` degerlerini `.env` uzerinden kullan; interaktif login veya token degerini komut satirina acik yazma.
- CLI komutlari calisirken secret degerlerini maskele; debug ciktisi gerekiyorsa sadece degisken adini ve var/yok durumunu raporla.
- Eksik secret varsa once `.env.example` guncelle, sonra kullaniciya sadece eksik degisken adini soyle.

Beklenen degisken aileleri:
- `GOOGLE_MAPS_API_KEY` veya `GOOGLE_STREET_VIEW_API_KEY`
- `VERCEL_TOKEN`
- `RENDER_API_KEY`
- `HUGGINGFACE_API_KEY` veya `HF_TOKEN`
- `MODAL_TOKEN_ID`
- `MODAL_TOKEN_SECRET`
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` veya kullanilan diger AI servis anahtarlari yalnizca acik ihtiyac cikarsa eklenir; MVP odagi Hugging Face/CV ve Cursor SDK bonusudur.
- `DATABASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`

## KVKK ve Etik Kapilar

Bu proje icin KVKK uyumu teknik ozellik degil, teslim kriteridir.

- Model amaci yalnizca kentsel objeler: tabela, direk, cop konteyneri, yol/cevre envanteri gibi kamusal altyapi.
- Kisi/yaya sayimi, kalabalik yogunlugu, yas/cinsiyet tahmini veya anonim olsa
  dahi insan davranisi analizi MVP kapsaminda degildir.
- Belediye/MOBESE kamera goruntusu ancak yazili isleme yetkisi ve resmi erisim
  varsa modele girer. Halka acik izleme sayfasi veri isleme lisansi degildir.
- Kimlik tespiti, kisi profilleme, yuz tanima, plaka okuma, arac/kisi takibi kesin yasak.
- Ham goruntuler egitim, test veya demo oncesinde yuz ve plaka anonimlestirme hattindan gecmelidir.
- Anonimlestirme geri dondurulemez olmali; blur veya solid mask yeterli guvenlikte uygulanmali.
- Modal'a yalnizca lokal anonimlestirme tamamlandiktan sonra uretilen veri yuklenebilir. Ham veya anonimlestirilmesi dogrulanmamis gorsel Modal Volume, container, log ya da artifact'ine giremez.
- Ham veri sifrelenmemis buluta, acik GitHub reposuna, Vercel/Render build artifact'lerine veya public bucket'a yuklenemez.
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

- Per-feature commit zorunludur; tamamlanan her bagimsiz ozellik ayri, kucuk ve anlamli bir commit olur.
- Sik ve anlamli commit at; tek parca final upload veya birden fazla bagimsiz ozelligi tek committe toplamak kabul edilmez.
- Her anlamli asama ve ozellik icin commit yap: scaffold, anonymization, detection, API, web UI, Expo UI, deploy, presentation, docs.
- Organizasyon/juri sureci commit loglarini inceleyecegi icin her checkpoint GitHub'a pushlanir.
- Commit mesajlari neden odakli olsun. Ornek: `Protect demo data with anonymization gate`.
- `.env`, ham veri, yuz/plaka iceren gorseller, buyuk model agirliklari ve local runtime dosyalari commit edilmez.
- User tarafindan yapilmis degisiklikleri geri alma. Gerekirse ustune uyumlu calis.

## Canli Demo ve Sunum

- Sunum repo icinde versiyonlanir; `presentation/` altinda sunum kaynagi, kullanilan gorseller ve gerekiyorsa PDF export tutulur.
- Sunum da kod gibi commit gecmisinin parcasi olur; son anda repo disinda hazirlanan tek kopyaya guvenme.
- Canli demo web ve Expo istemcilerinin Render'daki Go backend/API'ye gercek network uzerinden baglandigini gostermelidir.
- Backend, health endpointi ve demo icin gereken API'ler internetten erisilebilir olmalidir.
- Vercel, Expo ve Render ortamlarinda API base URL ve gerekli anahtarlar environment variable ile yonetilir; final demoda localhost bagimliligi olmaz.
- Demo oncesi dis agdan health check, temel API istegi, web akisi ve Expo akisi ayri ayri prova edilir.
- Ag kesintisi riskine karsi anonimlestirilmis sabit fixture ve tekrar edilebilir sonuc fallback'i bulunabilir; ancak asil sunum canli network akisidir.

## Kod Kalitesi

- Once mevcut dosya ve mimariyi oku, sonra en kucuk dogru degisikligi yap.
- Next.js, Expo ve Go katmanlarini temiz ayir: UI, API, CV/job pipeline, storage.
- Go backend uzerinde `masterfabric-go` mimarisinin klasor/katman ayrimini bozma; yeni endpointleri mevcut patternlere ekle.
- Ortak sozlesmeleri typed/structured tut: JSON schema, Go struct, TypeScript type.
- Hata durumlarini demoda saklama: kullaniciya anlasilir hata, loglara teknik detay yaz.
- Rate limit, API kota ve retry davranisini dusun.
- Test eklemenin maliyeti dusukse ekle; kritik veri/anonimlestirme davranisini testle.

## Modal Egitim Akisi

- Modal, zorunlu hosting hedefi degildir; Render'daki Go backend'in veya canli urun API'sinin yerine gecmez.
- Egitim girdisi sirasi sabittir: lokal ham veri -> lokal yuz/plaka anonimlestirme -> anonimlestirme dogrulamasi -> Modal'a aktarim -> egitim/fine-tuning.
- Dataset ve baslangic modeli Hugging Face kaynakli veya Hugging Face uzerinde belgelenmis olmalidir.
- Checkpointler gecici olarak private Modal Volume'da tutulabilir; secilen final model private Hugging Face model reposuna aktarilir ve kaynak/versiyon README'de belirtilir.
- Modal job'u sabit seed, dataset/model revision, hyperparameter ve metrikleri kaydetmelidir; ayni konfigurasyonla tekrar calistirilabilir olmalidir.
- Modal loglarina gorsel, token, secret, yuz/plaka koordinati veya tanimlayici metadata yazma.
- Modal CLI kurulumu `modal --version` ile, yetki ise secret degerlerini gostermeden `modal token info` ile dogrulanir.

## Dogrulama

Bitirdim demeden once uygun olanlari calistir:
- Web: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- Go: `go test ./...`, `go vet ./...`
- Expo: `npx expo-doctor` veya mevcut proje scriptleri
- CV pipeline: sabit fixture ile tekrar calistir, ayni cikti formatini dogrula
- Deploy: Vercel web, Render API health/core endpoint ve Expo-to-Render canli baglanti kontrolu

Calistiramadigin dogrulamayi final raporda acikca yaz.

## README Teslim Icerigi

README en az sunlari icermeli:
- Problem ve kamu faydasi
- Mimari diyagram veya metinsel akisi
- Kurulum ve calistirma adimlari
- `.env.example` aciklamasi
- AI araclari dokumantasyonu: Cursor IDE, ajan kurallari, kullanilan prompt/servis/model, gelistirmeyi nasil hizlandirdigi
- Hugging Face dataset/model kullanimi ve model secim gerekcesi
- Modal egitim/fine-tuning akisi, GPU secimi, dataset/model revision, tekrar calistirma komutu ve final agirligin Hugging Face konumu
- Cursor SDK ile ek puan hedefi: hangi script/otomasyon icin kullanildigi, nasil calistirildigi ve ciktisi
- Cursor CLI kullanildiysa otomasyon ve komutlar
- KVKK/etik uyum: anonimlestirme, veri minimizasyonu, ham veri silme taahhudu
- Demo senaryosu ve beklenen ciktilar
- Canli Vercel web, Render API ve Expo demo baglantilari
- Repo icindeki `presentation/` sunumunun nasil acilacagi veya export edilecegi
- Bilinen limitler ve sonraki adimlar

## Hackathon Akisi

- 10:00-11:00: Teknik zorunluluk kriter cizelgesini al, bu dosyayi gerekiyorsa guncelle.
- 11:00: Organizasyonun verdigi Expo/Go mimarisini uygula.
- 11:00-14:00: Calisan dikey akisi kur, belirsizlikleri ve tek kritik soruyu topla.
- 14:00: Juriye ayrilan tek soru hakkini kullan. Soru, puanlamayi veya zorunlu mimariyi etkileyen en yuksek riskli belirsizligi kapatmalidir; cevap hemen `AGENTS.md`, Cursor rules ve karar kaydina islenir.
- 14:00-17:00: Web + Expo istemcileri, canli network API'leri, per-feature commit gecmisi, repo ici sunum, dokumantasyon ve deploy'u tamamla.
- 17:00 sonrasi: Canli demo, tekrar edilebilir sonuc ve KVKK belgesi.

## Ajan Davranisi

- Net islerde izin sorma; uygula, test et, sonucu raporla.
- Riskli veya geri donulmez islerde dur ve tek net soru sor.
- Secret, ham veri veya KVKK riski gordugunde koruyucu varsayimla hareket et.
- Plan gerekiyorsa once MVP teslim yolunu, sonra bonuslari yaz.
- Final raporda degisen dosyalari, calistirilan testleri ve kalan riskleri belirt.
