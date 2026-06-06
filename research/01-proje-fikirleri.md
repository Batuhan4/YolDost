# Araştırma 1: Proje Fikri Adayları ve Seçim Matrisi (Bölüm 1 + 2)

> Tarih: 6 Haziran 2026 — Cursor x ALT+TAB Hackathon günü.
> Kapsam: research.md'deki 1. ve 2. başlıklar — en az 8 kentsel CV fikri + puanlama matrisi + ilk 3 seçim.
> Bu rapor, kardeş araştırmaların bugün doğruladığı bulguları temel alır:
> `research/02-huggingface-kaynaklar.md` (HF model/lisans taraması) ve `research/03-street-view-api.md` (Street View teknik/ToS).
> Bu raporda ek olarak bugün yapılan doğrulamalar: HF API'den grafiti/kaldırım/ağaç/kaçak döküm/Türk trafik işareti aramaları, `segments/sidewalk-semantic` lisansı, OIV7 sınıf listesinin lokal ultralytics paketinden teyidi, Güngören yeşil alan endeksi haber taraması. Doğrulanmayan her iddia **"varsayım"** olarak işaretlendi.

---

## 0. Yönetici Özeti

- **11 fikir** değerlendirildi (8 zorunlu + grafiti + kaçak döküm + kombo), 3 fikir de "değerlendirilip elendi" olarak kısaca gerekçelendirildi (kaçak park, yaya yoğunluğu, cephe hasarı).
- **Kazanan: Kombo fikir — "Güngören Saha Gözü: Kentsel Envanter ve Saha Tespit Paneli" (58/70).** Tek pipeline, iki model: OIV7 (çöp konteyneri + billboard/tabela + sokak lambası) + RDD2022 (yol hasarı/çukur). İkinci: Yol hasarı tek başına (57/70). Üçüncü: Çöp konteyneri tek başına (55/70).
- **AGENTS.md'deki ön karar (atık aracı görüntüsü → kentsel obje tespiti → harita/durum paneli) #1 olarak HAYATTA KALIYOR**, ama sınıf seti netleştirilerek daraltılmalı: `Waste container` + `Billboard` + RDD yol hasarı (çukur "deneysel" rozetiyle) + opsiyonel `Street light`. Trafik işareti alt-tipi, kaldırım erişilebilirliği, yeşil alan analizi **kapsam dışı** bırakılmalı.
- En zayıf fikirler: kaldırım erişilebilirliği (36), grafiti (36), trafik işareti envanteri (37) — üçünün de ortak sorunu HF'de kullanılabilir model/dataset yokluğu (bugün API'den teyit edildi).

---

## 1. Değerlendirme Çerçevesi ve Ortak Varsayımlar

### 1.1 Rubrik eşlemesi

| Jüri kriteri | Puan | Fikir seçiminde karşılığı |
|---|---|---|
| Teknik çalışırlık + mimari + canlı demo | 30 | "6 saatte bitirme ihtimali" + "Teknik yapılabilirlik" |
| CV doğruluğu/güvenilirliği | 25 | "CV doğruluğu şansı" + "Veri/model bulunabilirliği" — amaca özel eğitilmiş model > genel model > zero-shot |
| Kamu faydası | 20 | "Kamu faydası" — belediye müdürlüğünün gerçek iş akışına oturma |
| AI adaptasyonu / Cursor / agentic | 10 | Fikirden bağımsız (her fikirde aynı şekilde alınır) |
| KVKK ve etik | 10 | "KVKK güvenliği" — kişi/araç teması ne kadar uzaksa o kadar güvenli |
| README/sunum | 5 | Fikirden bağımsız |

### 1.2 Her fikir için geçerli ortak zorunluluklar (fikre özel değil, zemin)

1. **KVKK blur gate her fikirde ilk adım:** `yolov8_face.pt` (~30 ms) + `yolov8_plate.pt` (~35 ms) → geri döndürülemez Gaussian blur. Google'ın kendi blur'u yetmez (~%89 yüz recall — bkz. 03 raporu §7). Ham kare hiçbir yere yazılmaz.
2. **Canlı demo CPU'da lokal koşar:** HF serverless yalnızca `facebook/detr-resnet-50` sunuyor (02 raporu §9). Ölçülen hızlar (30-43 ms/YOLO modeli) 5-20 görüntülük fixture için fazlasıyla yeterli.
3. **Street View 640×640 sınırı:** dükkân tabelası = kolay, konteyner = orta, uzak küçük çukur = zor (03 raporu §6.1). Kamera reçeteleri hazır (tabela: pitch +5…+15 / fov 75-90; yol: pitch −30…−45; konteyner: pitch −5…−15).
4. **Google ToS gerilimi her "envanter" fikrini kapsar:** ToS 3.2.3(c)(v) "şehir çapında obje konum endeksi" çıkarmayı yasaklıyor (yasak örnek birebir "tree locations"). Çerçeve: demo = geçici, inference-only, silinecek türevler; üretim hedefi = **belediye atık araçlarının kendi kameraları**. Bu çerçeve README'ye yazılır (03 raporu §4.3). Ürün adında "envanter" yerine **"saha tespit"** dili tercih edilebilir.
5. **AGPL-3.0 gerçeği:** tüm YOLO türevleri fiilen AGPL — hackathon reposu açık kaynak olacağı için sorun değil; README'de beyan edilir (02 raporu §10).

### 1.3 Puanlama kriterleri (her biri 1-10)

Teknik yapılabilirlik (TY) · CV doğruluğu şansı (CV) · Kamu faydası (KF) · Demo etkisi (DE) · KVKK güvenliği (KVKK) · Veri/model bulunabilirliği (VM) · 6 saatte bitirme ihtimali (6S). Toplam: /70.

---

## 2. Fikir Kartları

### 2.1 Tabela Tespiti / Envanteri (dükkân tabelası + reklam panosu)

- **Kamu faydası:** İlan-reklam vergisi ve tabela ruhsatı denetimi ilçe belediyesinin öz gelir kalemidir (2464 sayılı Belediye Gelirleri Kanunu; ana arterlerde yetki İBB'ye geçer — idari ayrıntı **varsayım**, bugün ayrıca doğrulanmadı). Tespit edilen tabela konumları, Mali Hizmetler/Zabıta'nın beyan-saha karşılaştırması için aday listesi üretir. Güngören yoğun ticaretli (Merter tekstil bölgesi) bir ilçe — tabela yoğunluğu yüksek, hikâye yerine oturur.
- **SV / araç görüntüsü uyumu:** ✅ En uygun hedef sınıf: tabelalar büyük, kontrastlı, kameraya yakın; 640px'te "kolay" (03 raporu §6.1).
- **HF durumu:** `maco018/billboard-detection-Yolo11` (AGPL, mAP50 ~0.70-0.72, n/s boyutları CPU dostu — API'den doğrulandı); `shirabendor/YOLOV8-oiv7` `Billboard` sınıfı (ID 46 — bugün lokal ultralytics OIV7 yaml'ından teyit edildi); fallback `grounding-dino-tiny` ("shop sign", "billboard" prompt'ları, Apache-2.0). Dükkân tabelası ile "billboard" sınıfı tam örtüşmez — genelleme testi şart (**varsayım**).
- **6 saatte MVP:** ✅ Evet — hazır model + tek sınıf + standart pipeline.
- **Canlı demo:** Posta Caddesi fixture'ından kareler → blur gate → tabela kutuları → haritada pin + "sokak başına tabela sayısı" listesi.
- **KVKK riski:** Düşük. Tabela içeriği işletme verisidir; **OCR yapılmaz** (tabela metni okunup saklanırsa şahıs şirketi adları kişisel veriye dönüşebilir — bilinçli olarak kapsam dışı bırakıldığı README'ye yazılır). Yüz/plaka gate standart.
- **Jüri avantaj/dezavantaj:** + Gelir bağlantılı somut fayda, + yüksek tespit isabeti beklenir; − tek sınıf "demo oyuncağı" görünebilir, − "envanter" dili ToS örneğine yaklaşır.
- **Teknik risk: düşük** · **Demo etkisi: orta**

### 2.2 Çöp Kutusu / Atık Noktası Tespiti

- **Kamu faydası:** Temizlik İşleri Müdürlüğü'nün konteyner varlık takibi: nerede konteyner var/yok, devrik/hasarlı mı (hasar tespiti MVP'de iddia edilmez), hangi sokak setsiz. Atık toplama aracı senaryosuyla **birebir uyum**: araç zaten her sokaktan periyodik geçiyor; kamera eklemek sıfır ek tur maliyetiyle sürekli güncel veri demek. Bu, AGENTS.md'deki üretim hikâyesinin çekirdeği.
- **SV / araç görüntüsü uyumu:** ✅ Orta zorluk — konteyner ~1 m, kaldırımda 3-10 m mesafede; pitch −5…−15, fov 70-80 reçetesi hazır.
- **HF durumu:** Tek gerçekçi eğitilmiş model `shirabendor/YOLOV8-oiv7` — `Waste container` sınıfı (ID 576, bugün lokal yaml'dan teyit). COCO'da çöp kutusu sınıfı YOK. Fallback: `grounding-dino-tiny` ("waste container", "dumpster"). Özel konteyner modeli HF'de yok (02 raporu §5).
- **6 saatte MVP:** ✅ Evet — en basit fikir; tek model, tek sınıf.
- **Canlı demo:** Harita üzerinde konteyner pinleri + kanıt görseli (blurlu) + güven skoru; "bu sokakta konteyner görülmedi" boşluk listesi.
- **KVKK riski:** Çok düşük — tamamen kamusal nesne. Konteyner çevresindeki kişiler blur gate ile çözülür.
- **Jüri avantaj/dezavantaj:** + Üretim hikâyesi en güçlü fikir (atık aracı), + KVKK en temiz; − tek sınıf görsel olarak sönük kalabilir, − OIV7 genel modelinin Güngören isabeti test edilmeden bilinmiyor (**varsayım**; ilk 15 dk'da 3 görüntüyle test planı 02 raporunda hazır).
- **Teknik risk: düşük** · **Demo etkisi: orta**

### 2.3 Yol Bozukluğu / Çukur / Asfalt Hasarı

- **Kamu faydası:** Fen İşleri Müdürlüğü'nün asfalt bakım programı — ilçe belediyelerinin en büyük bütçeli, en şikâyet-yoğun kalemlerinden. D00/D10/D20/D40 hasar taksonomisi (RDD standardı) belediye diliyle örtüşür; "öncelikli onarım listesi" çıktısı doğrudan iş emrine dönüşebilir.
- **SV / araç görüntüsü uyumu:** ⚠️ En zor hedef: 640px'te uzak küçük çukur ezilir. Ama literatür GSV'den yol hasarı tespitinin yapılabildiğini gösteriyor (SVRDD: Pekin'den 8.000 GSV karesi, 6 hasar sınıfı — Scientific Data 2024; 03 raporu §6.1). Taktik: pitch −35, şerit başına ayrı heading. Çatlak türleri (D00/D10/D20) çukurdan daha görünür.
- **HF durumu:** **Kategorinin en iyi modeli mevcut:** `rezzzq/yolo12s-road-damage-rdd2022` (MIT kartlı, RDD2022 — 6 ülkenin araç kamerası görüntüleri; Street View'a en yakın domain). Fallback: `keremberke/yolov8s-pothole-segmentation` (90 görüntülük zayıf eğitim — sadece yedek), temiz lisans alternatifi `duongng2911/rt-detr-...-rdd2022` (Apache-2.0). Riski: YOLOv12 checkpoint'inin ultralytics 8.4.60'ta yüklenmesi **varsayım** — ilk 10 dk'da test edilmeli (02 raporu §2).
- **6 saatte MVP:** ✅ Evet — model hazır, kamera reçetesi hazır.
- **Canlı demo:** Yol yüzeyi karelerinde renkli hasar kutuları (sınıf koduyla) → haritada "hasar yoğunluğu" işaretleri → "öncelikli 5 nokta" listesi. Çukur kutusu jürinin anında anladığı bir görüntü.
- **KVKK riski:** Düşük — pitch −35'te kadraj çoğunlukla asfalt; yine de blur gate standart (ön plandaki araç tamponları plaka içerebilir).
- **Jüri avantaj/dezavantaj:** + Amaca özel eğitilmiş model = CV doğruluğu kriterinde (25p) en savunulabilir fikir, + hasar taksonomisi profesyonellik sinyali; − 640px'te recall düşük kalabilir → beklenti yönetimi: "çatlaklar güvenilir, çukur deneysel" çerçevesi, − pozitif örnek içeren fixture bulmak zaman alabilir (Güngören asfaltı yeniyse demo görseli zorlaşır — **varsayım**).
- **Teknik risk: orta** · **Demo etkisi: yüksek**

### 2.4 Kaldırım Engeli / Erişilebilirlik Sorunu

- **Kamu faydası:** Çok güçlü sosyal anlatı: engelli/yaşlı erişimi, bebek arabası geçişi; Zabıta'nın kaldırım işgali denetimi. Belediyelerin Erişilebilirlik İzleme denetimlerine girdi olabilir.
- **SV / araç görüntüsü uyumu:** ⚠️ Kaldırım araç kamerasından yan açıyla görünür; "engel" tanımı (motosiklet, tezgâh, sandviç pano, araç işgali, kırık kaplama, rampa eksikliği) çok heterojen — tek modelle yakalanamaz.
- **HF durumu:** ❌ Kategorinin Aşil topuğu. `segments/sidewalk-semantic` dataset'i **CC-BY-NC-4.0 + gated** (bugün HF API'den doğrulandı) → ondan fine-tune edilmiş tüm segformer-sidewalk modelleri (tobiasc/nickmuchi vb.) NC-türevi = ticari anlatılı projede kırmızı bayrak. Project Sidewalk verisi açık ama hazır model değil (**varsayım**: 6 saatte dönüştürülemez). `eneskarabulut/istanbul-sidewalk-parking-detection` (Apache-2.0, İstanbul!) var ama README'si boş, içerik kalitesi doğrulanamadı (02 raporu §6). Zero-shot "obstacle on sidewalk" prompt'u muğlak — düşük isabet (**varsayım**).
- **6 saatte MVP:** ❌ Gerçekçi değil — segmentasyon + kural katmanı + tanım belirsizliği.
- **Canlı demo:** Çalışırsa dokunaklı (kaldırımda engel kutusu + "erişilemez sokak" haritası) ama çalışmama olasılığı yüksek.
- **KVKK riski:** Orta — kaldırım kadrajı yaya-yoğun; blur yükü artar. "Engel" olarak işaretlenen şey park halindeki araçsa plaka/araç teması gri alana yaklaşır (takip yok ama araç-nesne işaretleme hassas).
- **Jüri avantaj/dezavantaj:** + Kamu faydası anlatısı en yükseklerden; − CV doğruluğu kriterinde (25p) çökme riski, − model yokluğu README'deki HF zorunluluğunu zayıflatır.
- **Teknik risk: yüksek** · **Demo etkisi: orta** (çalışırsa yüksek, çalışmazsa sıfır)

### 2.5 Trafik İşareti / Yönlendirme Levhası Envanteri

- **Kamu faydası:** Eksik/hasarlı/dönük işaret tespiti trafik güvenliği için değerli — ama İstanbul'da işaretleme yetkisi büyük ölçüde İBB/UKOME'dedir; ilçe belediyesi çoğunlukla bildirim yapar (**varsayım** — idari yapı bugün ayrıca doğrulanmadı). "Güngören Belediyesi paneli" anlatısında fayda zinciri kopuk kalır.
- **SV / araç görüntüsü uyumu:** ⚠️ İşaretler küçük ve yüksekte; 640px'te orta-zor. "İşaret var" kutusu çalışır, alt-tip sınıflandırma zorlaşır.
- **HF durumu:** ❌ Zayıf (02 raporu §3): HF'de TR işareti için model/dataset **sıfır** (bugün "turkish traffic" araması: 0 sonuç). Mevcutlar GTSRB **sınıflandırma** (tespit değil) ya da LISA = ABD işaretleri. Genel kutu için: COCO `stop sign` + OIV7 `Traffic sign` (ID 549) + grounding-dino. Alman GTSDB dataset'i (CC BY 4.0) Viyana Konvansiyonu sayesinde TR'ye benzer ama 6 saatte fine-tune gerçekçi değil.
- **6 saatte MVP:** ⚠️ Sadece "işaret var/yok" düzeyinde evet; envanter iddiası (hangi işaret, sağlam mı) hayır.
- **Canlı demo:** Genel "traffic sign" kutuları — jüri "hangi işaret peki?" diye sorduğunda cevap yok.
- **KVKK riski:** Düşük.
- **Jüri avantaj/dezavantaj:** − CV doğruluğu kriterinde alt-tipsiz envanter zayıf görünür, − ilçe yetkisi sorusu kamu faydasını törpüler; + kombo içinde "ek sınıf" olarak bedava gelir (OIV7).
- **Teknik risk: orta** · **Demo etkisi: düşük-orta**

### 2.6 Sokak Lambası / Direk / Kent Mobilyası

- **Kamu faydası:** Aydınlatma direği envanteri + bank/çeşme/hidrant gibi donatılar. Sınır: genel aydınlatma bakımı Türkiye'de dağıtım şirketinin (İstanbul Avrupa yakası: BEDAŞ) sorumluluğundadır; belediye arıza bildirir (**bilinen mevzuat çerçevesi, bugün ayrıca doğrulanmadı — varsayım olarak işaretli**). Gündüz görüntüsünden "lamba arızalı mı" tespit edilemez — sadece varlık envanteri çıkar.
- **SV / araç görüntüsü uyumu:** ⚠️ Direkler ince/uzun, 640px karede tepesi kadraj dışı kalabilir; orta zorluk.
- **HF durumu:** ✅ OIV7 `Street light` (ID 497), `Bench` (41), `Fire hydrant` (190 — COCO'da da var); lokal `yolov8n.pt` COCO beşlisi (bench, fire hydrant, stop sign, traffic light, parking meter) bugün çalışır durumda. Fallback grounding-dino ("utility pole").
- **6 saatte MVP:** ✅ Evet.
- **Canlı demo:** Donatı katmanlı harita — temiz ama heyecansız.
- **KVKK riski:** Çok düşük.
- **Jüri avantaj/dezavantaj:** + Kolay ve güvenilir; − tek başına "ee, BEDAŞ'a mı vereceksiniz?" sorusuna açık, − fayda zinciri dolaylı. Kombo içinde ek katman olarak ideal.
- **Teknik risk: düşük** · **Demo etkisi: düşük-orta**

### 2.7 Kaçak/Uygunsuz Tabela, Görsel Kirlilik Skoru

- **Kamu faydası:** 2.1'in üstüne idari değer katmanı: sokak segmenti başına tabela yoğunluğu/boyut oranından "görsel kirlilik skoru"; aykırı (aşırı büyük/aşırı yoğun) cepheleri Zabıta'ya **insan-onaylı aday listesi** olarak sunma. "Kaçaklık" görsel değil idari bir niteliktir (ruhsat kaydıyla eşleşme ister) — model yalnızca aday üretir; bu dürüst çerçeve jüride olgunluk puanı kazandırır.
- **SV / araç görüntüsü uyumu:** ✅ 2.1 ile aynı.
- **HF durumu:** Model tarafı 2.1 ile aynı; "kaçak" etiketi için veri YOK → kural tabanlı skor (tespit sayısı, kutu alanı/kare oranı). Ek mantık katmanı = ek süre.
- **6 saatte MVP:** ⚠️ Tabela tespiti + basit yoğunluk skoru evet; "kaçak" iddiası hayır (aday listesi diliyle sunulur).
- **Canlı demo:** Sokak segmentleri renk skalasıyla (yeşil→kırmızı görsel kirlilik) + en yoğun 5 cephe kartı.
- **KVKK riski:** Orta-düşük — işletmeleri "kaçak" diye damgalama riski etik başlıkta eksi yazabilir; "inceleme adayı" dili şart. OCR yok.
- **Jüri avantaj/dezavantaj:** + Gelir + estetik çifte anlatı, + skor haritası görsel olarak ilginç; − doğruluğu savunmak zor (skorun doğrusu ne?), − yanlış damgalama sorusu etik kriterinde riskli.
- **Teknik risk: orta** · **Demo etkisi: orta-yüksek**

### 2.8 Yeşil Alan / Ağaç / Gölgelik Analizi

- **Kamu faydası:** Anlatı olarak ALTIN: TÜBİTAK + Marmara Üniversitesi "İstanbul Yeşil Şehir Endeksi" (Mart 2023–Mart 2025) çalışmasına göre **Güngören 39 ilçe içinde kişi başı aktif yeşil alanda SON SIRADA** ve geçirimsiz yüzey oranında ilk sırada (bugün haber taramasıyla doğrulandı — Cumhuriyet/Karar/Sabah). "Ağaç dikilebilir noktaların haritası" Park ve Bahçeler için somut çıktı.
- **SV / araç görüntüsü uyumu:** ⚠️ Ağaç kutusu kolay; ama gerçek "gölgelik/GVI analizi" piksel segmentasyonu ister (Treepedia/MIT yöntemi — referans).
- **HF durumu:** ❌ Zayıf: bugünkü aramada sokak-seviyesi ağaç tespit modeli yok (sonuçlar uydu/taç-tespiti domain'i). OIV7 `Tree` (ID 553) kutu verir. Vegetasyon segmentasyonu için `nvidia/segformer-*-cityscapes` **NVIDIA araştırma lisansı ("other") — kırmızı bayrak**; Mapillary tabanlılar NC (02 raporu §10).
- **ÖZEL UYARI — ToS:** Google ToS 3.2.3(c)(v)'teki yasak örnek **birebir "şehirdeki ağaç konumları endeksi"**. Bu fikri Street View ile yapmak, yasak örneğin kendisini yapmaktır — tüm fikirler arasında ToS açısından en savunulamaz olanı (03 raporu §4.2).
- **6 saatte MVP:** ⚠️ Ağaç kutusu + "yeşil görünüm yüzdesi yaklaşığı" (kutu alanı oranı — bilimsel olarak zayıf) evet; gerçek GVI hayır.
- **Canlı demo:** "En yeşilsiz ilçenin yeşil haritası" — duygusal etki yüksek.
- **KVKK riski:** Çok düşük.
- **Jüri avantaj/dezavantaj:** + Güngören'e özel en güçlü hikâye (TÜBİTAK verisiyle açılış slaytı yapılabilir — kombo sunumunda da kullanılabilir!); − model/lisans zemini en zayıflardan, − ToS yasak örneğiyle birebir çakışma, − kutu-tabanlı "GVI yaklaşığı" CV doğruluğu kriterinde savunulamaz.
- **Teknik risk: orta-yüksek** · **Demo etkisi: yüksek** (anlatı), tespit görseli orta

### 2.9 Grafiti / Duvar Yazısı Tespiti (ek fikir)

- **Kamu faydası:** Temizlik ekiplerine grafiti/kirli cephe listesi; kent estetiği. Güngören'de grafiti yoğunluğu bilinmiyor (**varsayım**).
- **SV / araç görüntüsü uyumu:** ✅ Cepheler görünür.
- **HF durumu:** ❌ Bugünkü aramada tespit modeli yok denecek kadar zayıf: sonuçların çoğu text-to-image LoRA; tek aday `Adriatogi/segformer-b0-finetuned-segments-graffiti` (28 indirme, kart zayıf — kalite **varsayım**). Zero-shot "graffiti" prompt'u denenebilir, isabet bilinmiyor.
- **6 saatte MVP:** ⚠️ Riskli.
- **Canlı demo:** Cephede grafiti maskesi — bulunursa şık.
- **KVKK riski:** Orta — grafiti içeriği politik/kişisel olabilir; içerik analizi/sınıflandırma YAPILMAZ, sadece konum işaretlenir (bu sınır README'ye yazılır).
- **Jüri avantaj/dezavantaj:** − Model zemini yok, − Güngören'de pozitif örnek bulunamayabilir; + özgünlük puanı.
- **Teknik risk: yüksek** · **Demo etkisi: orta**

### 2.10 Kaçak Döküm / Taşan Konteyner Tespiti (ek fikir)

- **Kamu faydası:** Operasyonel değeri en yüksek atık senaryosu: moloz/poşet yığını ve taşan konteyner, Temizlik İşleri'nin günlük müdahale konusu. Atık aracı entegrasyonunda "aynı gün tespit → aynı gün müdahale" döngüsü kurulabilir — üretim hikâyesi mükemmel.
- **SV / araç görüntüsü uyumu:** ⚠️ Araç görüntüsünde çok mantıklı; ama Street View kareleri **eski** (2015-2024 karışık) — döküm anlık/geçici bir durumdur, fixture'larda pozitif örnek bulunamayabilir (**ciddi demo riski**).
- **HF durumu:** ⚠️ Bugün doğrulandı: `manthankharote/Illegal-Dumping-YOLOv11` ve `rohitbinoj/illegal-dumping-yolov8m` (ikisi de MIT etiketli, `best.pt` mevcut, 2026 tarihli) — ama 0 indirme, kart detayı yok → kalite **tam varsayım**. Daha güvenilir yol: `grounding-dino-tiny` zero-shot ("garbage pile", "overflowing garbage bin") — Apache-2.0, CPU 2-5 sn/görüntü (**varsayım**). TACO-türevi litter modelleri yakın-çekim domain'i (02 raporu §5).
- **6 saatte MVP:** ⚠️ Tek başına riskli; kombo içinde "joker sınıf" olarak evet.
- **Canlı demo:** Taşan konteyner karesi bulunursa jüride anında etki; bulunamazsa elde hiçbir şey yok.
- **KVKK riski:** Düşük-orta (döküm yapan kişi/araç görüntüsü → blur gate; fail tespiti/takibi KESİNLİKLE yapılmaz, README'ye yazılır).
- **Jüri avantaj/dezavantaj:** + Kamu faydası ve hikâye çok güçlü; − veri/model zemini en zayıflardan, − SV'de pozitif örnek kumarı.
- **Teknik risk: yüksek** · **Demo etkisi: yüksek** (örnek bulunursa)

### 2.11 ⭐ KOMBO: "Güngören Saha Gözü" — Kentsel Envanter ve Saha Tespit Paneli

> Tek pipeline, iki tespit modeli, 3-4 sınıf grubu: **Çöp konteyneri + Tabela/Billboard + Yol hasarı (+ Sokak lambası)**. AGENTS.md'deki ön kararın netleştirilmiş hali.

- **Tanım:** Görüntü (SV fixture / atık aracı karesi) → blur gate → **Model A:** `yolov8s-oiv7` (sınıf filtresi: Waste container 576, Billboard 46, Street light 497; opsiyonel Bench 41, Tree 553) → **Model B:** `rezzzq/yolo12s-road-damage-rdd2022` (D00/D10/D20/D40/Repair) → tespitler Postgres'e (sınıf, bbox, güven, pano_id, tarih, blurlu kanıt görseli) → Next.js harita/durum paneli (kategori filtreli pinler, tespit kartları, müdürlük bazlı sayaçlar) + Expo'da aynı listenin "saha doğrulama" görünümü.
- **Kamu faydası:** Tek panelde üç müdürlük: Temizlik İşleri (konteyner), Fen İşleri (yol hasarı), Zabıta/Mali Hizmetler (tabela). Sunum cümlesi: *"Atık aracı zaten her sokaktan geçiyor — biz o rutin turu, belediyenin üç müdürlüğüne aynı anda veri üreten bir şehir taramasına çeviriyoruz."* Kamu faydası kriterinde (20p) tek-amaçlı fikirlerin hiçbirinin veremeyeceği genişlik.
- **SV uyumu:** ✅ Her sınıf grubu için kamera reçetesi hazır; aynı panodan 2-3 heading/pitch çekilir (istek bütçesi bol — 03 raporu §3).
- **HF durumu:** ✅ En sağlam zemin: iki ana model de doğrulanmış, fallback'leri tablolu (oiv7→grounding-dino; rezzzq→keremberke pothole→RT-DETR). README'de 6-8 HF linki = "HF zorunlu kaynak" şartı fazlasıyla belgeli.
- **6 saatte MVP:** ✅ Evet — kritik içgörü: **kombo, tek-amaçlı fikre göre marjinal olarak ucuz.** Pipeline, DB şeması, harita UI'ı, blur gate tek-amaçlı fikirde de aynen gerekiyor; sınıf grubu eklemek = model dosyası + sınıf filtresi + pin rengi. Gerçek ek maliyet: (a) ikinci modelin yükleme testi (~15 dk), (b) sınıf başına fixture/kamera reçetesi seçimi (~30 dk), (c) UI'da kategori filtresi (~20 dk).
- **Canlı demo:** "Demo Run" butonu → fixture'daki panolar sırayla işlenir (cache'den; 1-2 tanesi sahnede canlı) → harita katman katman dolar → KVKK sekmesinde blur önce/sonra kanıtı → kategori sayaçları. Çok katmanlı harita "ürün" hissi verir; tek sınıflı demoların "script" hissinden ayrışır.
- **KVKK riski:** Düşük — tüm sınıflar kamusal nesne; gate standart; "neyi saklamıyoruz" listesi README'de.
- **Jüri avantaj/dezavantaj:** + Rubrikteki 30+25+20'lik üç büyük kalemde aynı anda en güçlü aday; + RDD modeli "amaca özel model" doğruluk çıpası sağlarken OIV7 genişlik sağlar; − **ince yayılma riski** (aşağıda ayrıca analiz edildi); − jüri zayıf bir sınıfı kurcalayabilir → çözüm: sınıf başına güven eşiği + UI'da "güvenilir / deneysel" rozetleri (çukur = deneysel).
- **Teknik risk: orta (yönetilebilir)** · **Demo etkisi: yüksek**

**İnce yayılma (spreading thin) analizi — kombo neden yine de kazanıyor:**

| Endişe | Gerçeklik / önlem |
|---|---|
| "4 sınıf grubu = 4 kat iş" | Hayır: iş pipeline+UI'da; sınıf grubu config satırı. Gerçek ek maliyet ~1 saat (yukarıda kalemli). |
| İki model = iki entegrasyon riski | Sıralı düşürme planı: önce OIV7 (tek model, 3 sınıf) çalışsın → RDD eklenir. RDD yüklenmezse keremberke fallback; o da olmazsa kombo "konteyner+tabela+lamba" olarak yine ayakta. **Kombonun en kötü hâli = tek-amaçlı fikirlerin iyi hâli.** |
| Her sınıfa demo görseli bulmak | Fixture ön-uçuşu (preflight, ücretsiz metadata) 11:00'de; sınıf başına ≥2 pozitif kare hedefi. Bulunamayan sınıf demoda "deneysel" rozetiyle kalır ya da katman gizlenir — UI bozulmaz. |
| Anlatı dağılır | Tek cümlelik çatı anlatı hazır (atık aracı = veri toplayıcı). Sınıflar anlatının kanıtı, rakibi değil. |
| Doğruluk savunması zorlaşır | Küçük el-etiketli doğrulama seti (10-15 kare × tüm sınıflar) ile sınıf başına basit isabet tablosu README'ye — 25p kriterine doğrudan oynar. |

**Kapsam freni (kesin sınır):** En fazla 2 model + 4 sınıf grubu. Grounding-DINO joker'i ("garbage pile") yalnızca her şey bitmiş ve ≥45 dk kalmışsa, sadece ön-işlenmiş fixture üzerinde.

### 2.12 Değerlendirilip elenenler (matrise alınmadı)

| Fikir | Neden elendi |
|---|---|
| Kaçak/hatalı park tespiti | Aracı "ihlalci" olarak işaretlemek plaka olmadan yaptırıma bağlanamaz; plakayla KVKK ihlali, plakasız anlamsız. Araç-takip çağrışımı 10p KVKK kriterinde intihar. |
| Yaya yoğunluğu / kalabalık analizi | Kişi analizi — AGENTS.md ve KVKK kırmızı çizgisi (profilleme/kişi takibi yasak). Tartışmasız RED. |
| Bina cephesi hasarı / kentsel dönüşüm riski | HF'de uygun model yok; "riskli bina" damgası hukuken/etiken çok hassas; 6 saatte savunulamaz. |

---

## 3. Puanlama Matrisi

Kriterler (1-10): TY=Teknik yapılabilirlik, CV=CV doğruluğu şansı, KF=Kamu faydası, DE=Demo etkisi, KVKK=KVKK güvenliği, VM=Veri/model bulunabilirliği, 6S=6 saatte bitirme ihtimali.

| # | Fikir | TY | CV | KF | DE | KVKK | VM | 6S | **TOPLAM /70** |
|---|---|---|---|---|---|---|---|---|---|
| **2.11** | **⭐ Kombo: Saha Tespit Paneli (konteyner+tabela+yol hasarı+lamba)** | **8** | **7** | **10** | **9** | **9** | **8** | **7** | **58** |
| 2.3 | Yol bozukluğu / çukur (RDD2022) | 8 | 7 | 9 | 8 | 9 | 8 | 8 | **57** |
| 2.2 | Çöp konteyneri tespiti | 9 | 7 | 8 | 6 | 9 | 7 | 9 | **55** |
| 2.1 | Tabela tespiti / envanteri | 8 | 7 | 7 | 6 | 8 | 7 | 8 | **51** |
| 2.6 | Sokak lambası / direk / kent mobilyası | 8 | 6 | 6 | 5 | 9 | 7 | 9 | **50** |
| 2.7 | Kaçak tabela / görsel kirlilik skoru | 7 | 5 | 8 | 7 | 7 | 6 | 6 | **46** |
| 2.8 | Yeşil alan / ağaç / gölgelik (GVI) | 6 | 5 | 8 | 8 | 9 | 4 | 5 | **45** |
| 2.10 | Kaçak döküm / taşan konteyner | 6 | 4 | 9 | 8 | 8 | 3 | 5 | **43** |
| 2.5 | Trafik işareti envanteri | 6 | 4 | 5 | 5 | 8 | 3 | 6 | **37** |
| 2.4 | Kaldırım engeli / erişilebilirlik | 4 | 3 | 9 | 7 | 7 | 3 | 3 | **36** |
| 2.9 | Grafiti tespiti | 5 | 4 | 6 | 6 | 7 | 3 | 5 | **36** |

**Puan gerekçesi dipnotları (kritik olanlar):**
- 2.11 KF=10: tek fikirde üç müdürlük + üretim hikâyesi; DE=9: çok katmanlı harita "ürün" algısı; 6S=7: kapsam genişliği tek gerçek eksisi (önlemler §2.11 tablosunda).
- 2.3 VM=8: kategorideki tek "amaca özel + doğru domain + temiz kartlı" model; CV=7: 640px küçük çukur riski tavanı sınırlar.
- 2.2 6S=9: en hızlı bitirilebilir fikir; DE=6: tek sınıf haritası mütevazı.
- 2.8 VM=4 ve 2.4 VM=3: bugün HF API'den doğrulanan boşluklar (uydu-domain ağaç modelleri; CC-BY-NC sidewalk dataset'i; NVIDIA lisanslı cityscapes seg). 2.8 ayrıca ToS yasak örneğiyle birebir çakışıyor (matris dışı ek eksi).
- 2.5 VM=3: "turkish traffic sign" HF araması bugün 0 sonuç; tespit modelleri ABD-domain.
- 2.10 VM=3: bulunan 2 model 0 indirmeli/kartı boş (**varsayım** kalitesi); 6S=5: SV fixture'ında pozitif örnek kumarı.

---

## 4. İlk 3 Seçim ve Gerekçeler

### 🥇 #1 — Kombo "Güngören Saha Gözü: Kentsel Saha Tespit Paneli" (58/70)

**Neden:** Rubrikteki üç büyük kalemi aynı anda maksimize eden tek fikir. (1) Teknik 30p: zorunlu stack'in her parçası anlamlı bir işle dolar (Go API tespit CRUD'u, Postgres şeması, Next.js harita, Expo saha listesi); (2) CV 25p: RDD2022 amaca-özel modeli doğruluk çıpası + OIV7 genişliği + sınıf başına eşik ve küçük doğrulama seti; (3) Kamu faydası 20p: üç müdürlüğe tek panel + atık aracı üretim hikâyesi. Kombonun en kötü senaryosu (RDD düşer, OIV7 kalır) bile tek-amaçlı fikirlerin iyi senaryosuna eşdeğer — **asimetrik olarak güvenli bahis.**

**MVP sınıf seti (kesin öneri):**

| Öncelik | Sınıf grubu | Model | Demo rozeti |
|---|---|---|---|
| P0 | Çöp konteyneri (`Waste container`) | yolov8s-oiv7 | Güvenilir |
| P0 | Yol hasarı (D00/D10/D20/D40/Repair) | rezzzq yolo12s-RDD2022 | Çatlaklar güvenilir, çukur **deneysel** |
| P1 | Tabela/Billboard (`Billboard`) | yolov8s-oiv7 (fallback maco018) | Güvenilir |
| P2 | Sokak lambası (`Street light`) | yolov8s-oiv7 (bedava katman) | Envanter |
| Joker (≥45 dk artarsa) | Çöp yığını ("garbage pile") | grounding-dino-tiny | Deneysel |
| Kapsam DIŞI | Trafik işareti alt-tipi, kaldırım erişilebilirliği, GVI/ağaç analizi, grafiti, OCR her türü | — | README "gelecek işler" |

**AGENTS.md ön kararının durumu: HAYATTA KALIYOR — ama daraltılarak.** "Tabela/kentsel obje tespiti → harita/durum paneli" yönü doğru çıktı; bu araştırma onu şu üç düzeltmeyle keskinleştiriyor: (1) tabela tek başına değil, konteyner+yol hasarı çekirdeğiyle birlikte (tabela P1'e iner — konteyner ve yol hasarı kamu faydası/doğruluk açısından daha güçlü); (2) sınıf listesi yukarıdaki tabloyla sabitlenir, "kentsel obje" muğlaklığı kapatılır; (3) panel dili "envanter" değil "saha tespiti" (ToS 3.2.3(c)(v) endeks yasağına mesafe + üretim=araç kamerası çerçevesi README'ye).

### 🥈 #2 — Yol Bozukluğu / Çukur (57/70)

Tek amaçlı fikirlerin en güçlüsü: amaca özel model (RDD2022, doğru domain), belediye dilinde taksonomi, jüride anında anlaşılır görsel, güçlü literatür desteği (SVRDD). Kombo bir nedenle çökerse **geri çekilme hattı budur** — pipeline aynı kaldığı için geçiş maliyeti ~sıfır. Tek başına eksiği: tek müdürlüğe hitap, 640px çukur recall riski tüm demoyu tek sınıfın isabetine bağlar.

### 🥉 #3 — Çöp Konteyneri (55/70)

En hızlı ve en garantili bitirilen fikir; atık aracı hikâyesiyle birebir uyum; KVKK'sı en temiz. Eksiği: tek sınıf haritası görsel/anlatısal olarak mütevazı — "6 saatlik hackathon işi" algısı. Kombonun P0 bileşeni olarak zaten kazanıyor; OIV7'nin Güngören isabeti ilk testte zayıf çıkarsa kombo içindeki ağırlığı tabelaya kaydırılır.

### Kombo vs. tek amaç — nihai karar mantığı

Jüri puanlaması toplamsal olduğu için tek pipeline'dan N sınıf grubu çıkarmak, N ayrı fikir yapmak kadar değil ama N kat anlatı genişliği kadar puan getirir; maliyeti ise config düzeyinde. İnce yayılma riski gerçek ama §2.11'deki sıralı düşürme planı (P0→P1→P2, her adımda çalışan demo) riski "kombo başarısız olur"dan "kombo biraz küçülür"e çevirir. Bu yüzden öneri: **kombo ile başla, saat 14:30'da P0 iki sınıf grubu uçtan uca çalışmıyorsa P1/P2'yi kes ve #2/#3'ün birleşimi olan iki-sınıflı panele küçül.**

---

## 5. En Büyük Riskler (özet)

1. **OIV7 genel modelinin Güngören SV karelerindeki isabeti doğrulanmadı** (varsayım) → ilk 15 dk indirme + `model.names` + 3 kare testi; zayıfsa eşik düşür + grounding-dino fallback + sınıf ağırlığını RDD'ye kaydır.
2. **Zorunlu stack genişliği (Next.js+Expo+Go/masterfabric+Render+Vercel) 6 saatte zaman yiyor** → CV'yi ön-işlenmiş fixture + cache stratejisine bağla (03 raporu §5); canlı kısım 1-2 kare; Expo minimum (salt-okunur liste).
3. **rezzzq YOLOv12 checkpoint'inin ultralytics 8.4.60'ta yüklenmesi varsayım** → ilk 10 dk test; fallback zinciri hazır.
4. **Google ToS endeks yasağı** → "saha tespiti" dili + pano_id-only saklama + silme taahhüdü + üretim=araç kamerası çerçevesi README'de.
5. **Fixture'da sınıf başına pozitif örnek bulunamaması** → preflight'ta ana cadde noktaları + sınıf başına ≥2 kare hedefi; bulunamayan sınıf "deneysel" rozetle kalır.

---

## 6. Kaynaklar

**Kardeş raporlar (bugün, aynı repo):**
- `research/02-huggingface-kaynaklar.md` — tüm HF model/dataset/lisans doğrulamaları
- `research/03-street-view-api.md` — SV parametre/fiyat/ToS/fixture doğrulamaları

**HF modeller (02 raporunda API ile doğrulanmış):**
- https://huggingface.co/rezzzq/yolo12s-road-damage-rdd2022 (MIT kartlı, RDD2022 5 sınıf)
- https://huggingface.co/shirabendor/YOLOV8-oiv7 (AGPL, OIV7 601 sınıf)
- https://huggingface.co/maco018/billboard-detection-Yolo11 (AGPL, mAP50 ~0.70)
- https://huggingface.co/keremberke/yolov8s-pothole-segmentation (fallback, 90 görüntü)
- https://huggingface.co/IDEA-Research/grounding-dino-tiny (Apache-2.0, zero-shot joker)
- https://huggingface.co/facebook/detr-resnet-50 (Apache-2.0, tek canlı serverless fallback)

**Bugün bu rapor için HF API'den doğrulananlar:**
- https://huggingface.co/datasets/segments/sidewalk-semantic — **CC-BY-NC-4.0 + gated (kullanılamaz)**
- https://huggingface.co/Adriatogi/segformer-b0-finetuned-segments-graffiti — tek grafiti adayı (28 indirme, kalite varsayım)
- https://huggingface.co/manthankharote/Illegal-Dumping-YOLOv11 ve https://huggingface.co/rohitbinoj/illegal-dumping-yolov8m — MIT etiketli, 0 indirme, kart boş (kalite varsayım)
- "turkish traffic sign" model/dataset araması: 0 sonuç; "tree detection" sonuçları uydu/taç domain'i
- OIV7 sınıf ID'leri lokal `ultralytics 8.4.60` paketindeki `open-images-v7.yaml`'dan: Bench 41, Billboard 46, Fire hydrant 190, Street light 497, Traffic sign 549, Tree 553, **Waste container 576**

**Güngören yeşil alan (bugün haber taraması):**
- [Cumhuriyet — İstanbul'da yeşil alanı en az ilçe](https://www.cumhuriyet.com.tr/turkiye/istanbul-da-yesil-alani-en-az-ilce-belli-oldu-2418894)
- [Karar — Güngören yeşil alana erişimde son sırada](https://www.karar.com/guncel-haberler/istanbulun-yesil-haritasi-aciklandi-gungoren-yesil-alana-erisimde-son-1976469)
- [Sabah — TÜBİTAK: 39 ilçe arasında](https://www.sabah.com.tr/yasam/tubitak-acikladi-iste-istanbulun-yesil-alani-en-az-ilcesi-39-ilce-arasinda-7388572)

**Yöntem/literatür referansları:** SVRDD (Scientific Data 2024 — GSV'den yol hasarı, 03 raporunda); Treepedia/MIT Senseable City Lab (GVI yöntemi — genel referans); Project Sidewalk (kaldırım erişilebilirlik crowdsourcing — projectsidewalk.org, model değil veri projesi). Mevzuat referansları (2464 sayılı Belediye Gelirleri Kanunu ilan-reklam vergisi; genel aydınlatmada dağıtım şirketi sorumluluğu) bilinen çerçeve olup bugün ayrıca doğrulanmadı — **varsayım** olarak işaretlidir.
