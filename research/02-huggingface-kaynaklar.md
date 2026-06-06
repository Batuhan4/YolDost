# Hugging Face Kaynak Araştırması — Kentsel Nesne Tespiti (Güngören MVP)

> **Tarih:** 6 Haziran 2026 · **Araştırma yöntemi:** Tüm model/dataset kayıtları HF REST API (`/api/models/<id>`, `/api/datasets/<id>`, `paths-info`) üzerinden bugün doğrulandı. SHA256, dosya boyutu, lisans etiketi ve model kartları tek tek çekildi. Doğrulanamayan her iddia **"varsayım"** olarak işaretlendi.
> **KVKK çerçevesi:** Plaka ve yüz modelleri SADECE anonimleştirme (blur) için. Plaka OCR/okuma, yüz tanıma, kimliklendirme modelleri bu projede YASAK — aşağıda "kara liste" bölümünde açıkça işaretlendi.
> **Ölçüm ortamı:** Linux dev laptop, CPU-only (torch 2.12.0+cpu, ultralytics 8.4.60). Hız değerleri bu makinede bugün ölçüldü.

---

## 0. Yönetici Özeti

| Kategori | #1 Öneri | Lisans | Fallback |
|---|---|---|---|
| Çukur / yol hasarı | `rezzzq/yolo12s-road-damage-rdd2022` | MIT (kartta) | `keremberke/yolov8s-pothole-segmentation` |
| Trafik tabelası | Yerel `yolov8n.pt` COCO (stop sign + traffic light) + Grounding DINO zero-shot | AGPL-3.0 / Apache-2.0 | `cvtechniques/TrafficSignDetection` (MIT) |
| Billboard / tabela | `maco018/billboard-detection-Yolo11` (n veya s) | AGPL-3.0 | Grounding DINO zero-shot ("billboard", "shop sign") |
| Çöp konteyneri / atık | `shirabendor/YOLOV8-oiv7` (yolov8s-oiv7, "Waste container" sınıfı) | AGPL-3.0 | `IDEA-Research/grounding-dino-tiny` zero-shot |
| Kent mobilyası | Yerel `yolov8n.pt` COCO (bench, fire hydrant, parking meter…) + yolov8s-oiv7 | AGPL-3.0 | Grounding DINO zero-shot |
| Plaka anonimleştirme | Yerel `yolov8_plate.pt` = `Koushim/yolov8-license-plate-detection` (SHA256 doğrulandı) | MIT (kartta, tartışmalı) | `morsetechlab/yolov11-license-plate-detection` (v1n) |
| Yüz anonimleştirme | Yerel `yolov8_face.pt` = `arnabdhar/YOLOv8-Face-Detection` (SHA256 doğrulandı) | AGPL-3.0 | `AdamCodd/YOLOv11n-face-detection` (Apache-2.0) |
| Serverless fallback | `facebook/detr-resnet-50` (hf-inference "live" — doğrulandı) | Apache-2.0 | — (diğer hiçbir aday modelde provider yok) |

**MVP'nin tek "genel" tespit modeli seçilecekse:** `shirabendor/YOLOV8-oiv7` (yolov8s-oiv7.pt, 23 MB) — 601 Open Images V7 sınıfı tek modelde (çöp konteyneri, sokak lambası, bank, billboard, trafik tabelası/ışığı). Joker model: `IDEA-Research/grounding-dino-tiny` (Apache-2.0, zero-shot, her sınıfı metin prompt'uyla bulur ama CPU'da yavaş).

---

## 1. Yerel Modellerin Kimlik Tespiti (SHA256 ile KESİN doğrulama)

`models/` klasöründeki dosyalar HF'deki LFS oid'leriyle bayt bayt karşılaştırıldı:

| Yerel dosya | SHA256 eşleşmesi | HF Kaynağı | Lisans | Sınıf(lar) | CPU hızı (ölçüldü) |
|---|---|---|---|---|---|
| `yolov8_face.pt` (6.247.065 B) | ✅ BİREBİR | [arnabdhar/YOLOv8-Face-Detection](https://huggingface.co/arnabdhar/YOLOv8-Face-Detection) `model.pt` | **AGPL-3.0** | `FACE` (1 sınıf) | ~30 ms/görüntü |
| `yolov8_plate.pt` (6.248.291 B) | ✅ BİREBİR | [Koushim/yolov8-license-plate-detection](https://huggingface.co/Koushim/yolov8-license-plate-detection) `best.pt` | MIT (kartta) | `license_plate` (1 sınıf) | ~35 ms/görüntü |
| `yolov8n.pt` (6.549.796 B) | ❌ HF dosyasıyla eşleşMİYOR | Resmi Ultralytics ama **GitHub release sürümü**; HF'deki [Ultralytics/YOLOv8](https://huggingface.co/Ultralytics/YOLOv8) `yolov8n.pt` farklı build (6.534.387 B) | **AGPL-3.0** | 80 COCO sınıfı | ~43 ms/görüntü |

- Üç model de ultralytics 8.4.60 ile **bugün sorunsuz yüklendi ve çalıştı** (sınıf adları yukarıda API'den değil, modelin kendisinden okundu).
- **Aksiyon (README zorunluluğu için):** `yolov8n.pt`'yi HF kaynağından yeniden indirin ki README'de "model Hugging Face'ten alındı" beyanı dosya düzeyinde doğru olsun: `hf_hub_download(repo_id="Ultralytics/YOLOv8", filename="yolov8n.pt")`. Face/plate modelleri zaten HF kaynaklı — README'ye yukarıdaki iki HF linki yazılabilir.
- `arnabdhar/YOLOv8-Face-Detection`: WIDER FACE'in Roboflow rehost'u ile eğitilmiş (model kartında belirtiliyor), ~10k görüntü, 112 beğeni. HF arama API'sinde "downloads: 0" görünmesi HF'nin .pt-tipi dosyalarda indirme saymamasından kaynaklanan bilinen bir sayaç tuhaflığı; popülerlik göstergesi olarak beğeni sayısına bakın.
- `Koushim/yolov8-license-plate-detection`: YOLOv8n, 640×640, tek sınıf. Son 30 günde 22.500 indirme. Kartı MIT diyor — **ama AGPL'li yolov8n tabanından fine-tune edilmiş bir türevin MIT olarak yeniden lisanslanması hukuken tartışmalıdır** (aşağıda lisans bölümü).

---

## 2. Kategori: Çukur (Pothole) ve Yol Hasarı Tespiti

### Modeller (hepsi API'den doğrulandı)

| Model | Mimari / boyut | Sınıflar | Lisans | İndirme/Beğeni | CPU canlı demo | Not |
|---|---|---|---|---|---|---|
| [rezzzq/yolo12s-road-damage-rdd2022](https://huggingface.co/rezzzq/yolo12s-road-damage-rdd2022) | YOLOv12s, `yolo12s_RDD2022_best.pt` | **5: D00 boyuna çatlak, D10 enine çatlak, D20 timsah çatlağı, D40 çukur, Repair (yama)** | **MIT (kartta)** | 179 / 1 | ✅ s-boyut, uygun | RDD2022 ile eğitilmiş — Japonya/Hindistan/Çekya/Norveç/ABD/Çin sokak+araç kamerası görüntüleri; Street View'a en yakın domain. Belediye dili D00-D40 kodlarıyla konuşur: jüri için artı. |
| [keremberke/yolov8n-pothole-segmentation](https://huggingface.co/keremberke/yolov8n-pothole-segmentation) | YOLOv8n-seg, `best.pt` ~6 MB | `pothole` (1) | **Belirtilmemiş** (kart boş) | 1.512 / 17 | ✅ çok hızlı | Eğitim seti **sadece 80 görüntü**; karttaki mAP50 0.995 değeri 5 görüntülük validation'dan — anlamsız, genelleme şüpheli. Segmentasyon maskesi demo'da şık görünür. |
| [keremberke/yolov8s-pothole-segmentation](https://huggingface.co/keremberke/yolov8s-pothole-segmentation) | YOLOv8s-seg | `pothole` (1) | Belirtilmemiş | 659 / 2 | ✅ | Aynı 90 görüntülük veri. |
| [keremberke/yolov8m-pothole-segmentation](https://huggingface.co/keremberke/yolov8m-pothole-segmentation) | YOLOv8m-seg | `pothole` (1) | Belirtilmemiş | 1.089 / 6 | ⚠️ m-boyut CPU'da ~150-300 ms (varsayım) | Görevde örnek olarak anılan model. |
| [Harisanth/Pothole-Finetuned-YOLOv8](https://huggingface.co/Harisanth/Pothole-Finetuned-YOLOv8) | YOLOv8 (best.pt 22,5 MB ≈ s-boyut) | pothole (kart detayı zayıf) | MIT (kartta) | 188 / 2 | ✅ | Eğitim verisi belgelenmemiş — güvenilirlik **varsayım**. |
| [cazzz307/Pothole-Finetuned-YoloV8](https://huggingface.co/cazzz307/Pothole-Finetuned-YoloV8) | YOLOv8 (52 MB ≈ m-boyut) | pothole | Apache-2.0 (kartta) | 40 / 7 | ⚠️ | Tek .pt, eğitim detayı az. |
| [duongng2911/rt-detr-resnet-50-dc5-rdd2022-finetuned](https://huggingface.co/duongng2911/rt-detr-resnet-50-dc5-rdd2022-finetuned) | RT-DETR R50 (transformers, safetensors) | RDD2022 sınıfları | Apache-2.0 | 11 / 0 | ⚠️ R50 CPU'da ~1-2 s/görüntü (varsayım) | `transformers` pipeline ile çalışır; ultralytics'e alternatif temiz lisanslı yol. |

### Dataset'ler

| Dataset | Format | Lisans | İçerik |
|---|---|---|---|
| [keremberke/pothole-segmentation](https://huggingface.co/datasets/keremberke/pothole-segmentation) | HF datasets (COCO anotasyon) | **CC BY 4.0** (README'de doğrulandı) | 90 görüntü (80 train/5 val/5 test) — demo doğrulama görseli kaynağı olarak bile küçük |
| [Ryukijano/Pothole-detection-Yolov8](https://huggingface.co/datasets/Ryukijano/Pothole-detection-Yolov8) | YOLO format | openrail | <1K görüntü |
| [edwrdc/RDD2022](https://huggingface.co/datasets/edwrdc/RDD2022) | belirsiz (modality:text etiketi) | **Belirtilmemiş** | RDD2022 mirror'ı; orijinal RDD2022 sekilab sürümünün lisansı CC BY 4.0'dır (**varsayım** — orijinal repo'dan teyit edilmedi) |
| [ShixuanAn/RDD_2020](https://huggingface.co/datasets/ShixuanAn/RDD_2020) | imagefolder | **CC-BY-NC-3.0 — TİCARİ KULLANIM YASAK, RİSKLİ** | RDD2020; sadece atıf/akademik bağlamda anılmalı |

**#1 Öneri:** `rezzzq/yolo12s-road-damage-rdd2022` — domain (çok ülkeli gerçek yol görüntüsü) ve 5 sınıflı hasar taksonomisi puan kriterindeki "CV doğruluğu"na en çok katkıyı verir.
**⚠️ Entegrasyon riski (test şart):** Kart, sunsmarterjie YOLOv12 fork'unu öneriyor; ultralytics ≥8.3.78 YOLO12 mimarisini ana pakete aldı, dolayısıyla 8.4.60 ile `YOLO("yolo12s_RDD2022_best.pt")` **büyük olasılıkla doğrudan yüklenir (varsayım — ağırlık indirilmeden test edilemedi)**. Hackathon'da ilk 10 dakikada indirme + yükleme testi yapın; yüklenmezse fallback `keremberke/yolov8s-pothole-segmentation` (ultralytics 8.0.21 ile eğitilmiş eski checkpoint'lerin 8.4.x'te yüklenmesi de genelde sorunsuzdur — **varsayım**, yerel face/plate modellerinin sorunsuz yüklenmesi bunu destekliyor).
**Fallback:** `keremberke/yolov8s-pothole-segmentation` (maske görselleştirmesi demo'da etkileyici) veya temiz Apache lisans isteniyorsa `duongng2911/rt-detr-...` (transformers).

---

## 3. Kategori: Trafik Tabelası Tespiti

HF'de bu kategori şaşırtıcı derecede zayıf: sonuçların çoğu GTSRB üzerinde **sınıflandırma** (tespit değil) modeli.

| Model | Mimari | Sınıflar | Lisans | İndirme/Beğeni | Domain / Türkiye uyumu | Not |
|---|---|---|---|---|---|---|
| Yerel `yolov8n.pt` ([Ultralytics/YOLOv8](https://huggingface.co/Ultralytics/YOLOv8)) | YOLOv8n | COCO: `stop sign`, `traffic light` | **AGPL-3.0** | 8.118 / 354 (resmi repo) | ✅ Evrensel; TR'de dur tabelası ve ışıklar aynı | En güvenilir canlı demo seçeneği; 43 ms/görüntü ölçüldü |
| [cvtechniques/TrafficSignDetection](https://huggingface.co/cvtechniques/TrafficSignDetection) | YOLOv11n, `best.pt` | LISA tabanlı çoklu tabela sınıfı | MIT (kartta) | 56 / 0 | ⚠️ **LISA = ABD tabelaları**; TR (Viyana Konvansiyonu) tabelalarına transfer zayıf — "tabela var" tespiti tutabilir, sınıf adları yanılır | Mart 2026 tarihli, taze |
| [JakobJFL/yolov8-dk-Traffic-Signs](https://huggingface.co/JakobJFL/yolov8-dk-Traffic-Signs) | YOLOv8, `weights/best.pt` | Danimarka tabelaları | Apache-2.0 (kartta) | 0 / 1 | ✅ Avrupa/Viyana tipi tabela — TR'ye ABD'den daha yakın | Kart çok zayıf, sınıf listesi yok; **riskli, test şart** |
| [IDEA-Research/grounding-dino-tiny](https://huggingface.co/IDEA-Research/grounding-dino-tiny) | Grounding DINO (zero-shot) | prompt: "traffic sign" | **Apache-2.0** | 634K / 102 | ✅ domain bağımsız | 690 MB; CPU ~2-5 s/görüntü (varsayım) — 5-20 görüntülük demo için kabul edilebilir, ön-işlem olarak çalıştırın |

| Dataset | Format | Lisans | İçerik |
|---|---|---|---|
| [keremberke/german-traffic-sign-detection](https://huggingface.co/datasets/keremberke/german-traffic-sign-detection) | HF datasets (COCO bbox) | **CC BY 4.0** (README'de doğrulandı) | GTSDB Roboflow rehost; **43 sınıf** (hız limitleri, dur, yol ver…), 545 görüntü. Alman tabelaları ≈ TR tabelaları (Viyana). 6 saatte CPU'da fine-tune gerçekçi değil; değerlendirme/duvar görseli için kullanın |
| [tanganke/gtsrb](https://huggingface.co/datasets/tanganke/gtsrb) | parquet | Belirtilmemiş | GTSRB sınıflandırma (tespit değil), 11K indirme |
| [bazyl/GTSRB](https://huggingface.co/datasets/bazyl/GTSRB) | parquet | GPL-3.0 | Sınıflandırma |

**#1 Öneri:** Yerel COCO `yolov8n.pt` (`stop sign` + `traffic light`) ana sinyal + Grounding DINO `"traffic sign"` prompt'u ile genel tabela kutusu. Tabela ALT TİPİ sınıflandırmasına 6 saatte girmeyin — KVKK riski yok ama doğruluk riski yüksek.
**Fallback:** `cvtechniques/TrafficSignDetection` (MIT; "tabela var/yok" düzeyinde kullanın, ABD-domain uyarısıyla).

---

## 4. Kategori: Billboard / Tabela / Reklam Panosu

| Model | Mimari | Sınıf | Lisans | İndirme/Beğeni | Metrik (karttan) | Not |
|---|---|---|---|---|---|---|
| [maco018/billboard-detection-Yolo11](https://huggingface.co/maco018/billboard-detection-Yolo11) | YOLO11 **n/s/m/l/x beş boyut tek repoda** | billboard (1) | **AGPL-3.0** | 102 / 1 | mAP50: 0.704 (n) – 0.718 (l); mAP50-95 ~0.43 | Roboflow "Billboard" dataset'iyle eğitilmiş; akademik yazar (Mark Colley). CPU için `yolo11n.pt`/`yolo11s.pt` seçin |
| [maco018/billboard-detection-Yolo12](https://huggingface.co/maco018/billboard-detection-Yolo12) | YOLO12 | billboard | (doğrulandı: var; lisans karttan teyit edilmedi) | 66 / 0 | — | Aynı yazar, v12 sürümü |
| [ljamesdatascience/BillboardAdvertDetectionYOLOV5](https://huggingface.co/ljamesdatascience/BillboardAdvertDetectionYOLOV5) | YOLOv5 | billboard | Belirtilmemiş | 0 / 0 | — | Ölü/az bakımlı görünüyor — önermiyoruz |

**#1 Öneri:** `maco018/billboard-detection-Yolo11` (yolo11n/yolo11s). mAP50 ~0.70 canlı demo için yeterli; Güngören'de bina cephesi reklam panoları için domain makul (Roboflow karışık sokak görüntüleri — **genelleme testi şart**).
**Fallback:** Grounding DINO zero-shot (`"billboard"`, `"advertising sign"`, `"shop sign"` prompt'ları) — dükkân tabelası gibi alt türleri de yakalar.

---

## 5. Kategori: Çöp / Atık / Çöp Konteyneri Tespiti

Belediye senaryosunda iki ayrı hedef var: **(a) sokağa atılmış çöp/moloz yığını**, **(b) çöp konteyneri (dolu/devrik/eksik)**. COCO'da "çöp kutusu" sınıfı YOK — bu yüzden Open Images V7 veya zero-shot gerekiyor.

| Model | Mimari | Sınıflar | Lisans | İndirme/Beğeni | Not |
|---|---|---|---|---|---|
| [shirabendor/YOLOV8-oiv7](https://huggingface.co/shirabendor/YOLOV8-oiv7) | YOLOv8s-oiv7 (23 MB) + YOLOv8m-oiv7 (53 MB) | **Open Images V7, 601 sınıf** — "Waste container" dahil; ayrıca Street light, Bench, Billboard, Traffic sign, Traffic light, Fountain, Tree (sınıf listesi Ultralytics OIV7 dokümantasyonundan — **varsayım, indirince `model.names` ile teyit edin**) | **AGPL-3.0** | 0 / 0 | Resmi Ultralytics OIV7 ağırlıklarının üçüncü-taraf HF mirror'ı (**varsayım** — dosya boyutları resmi assets ile tutarlı). README'ye HF linki yazılabilir; ek güvence için Ultralytics docs'u da atıf verin |
| [keremberke/yolov5m-garbage](https://huggingface.co/keremberke/yolov5m-garbage) | YOLOv5m | `biodegradable, cardboard, glass, metal, paper, plastic` (6) | **Belirtilmemiş** | 167 / 11 | mAP50 **0.427** (kartta) — düşük. Malzeme-düzeyi sınıflar yakın çekim atık için; sokak panoraması domain'inde zayıf kalır. `pip install yolov5` (ayrı paket!) ister — entegrasyon sürtünmesi |
| [HrutikAdsare/waste-detection-yolov8](https://huggingface.co/HrutikAdsare/waste-detection-yolov8) | YOLOv8, `best.pt` | 8: cardboard, e-waste, glass, medical, metal, organic, paper, plastic | MIT (kartta) | 68 / 1 | ~250 görüntü/sınıf, yakın çekim atık; Street View'da genelleme şüpheli |
| [esapzoi/litter-detection-yolov8](https://huggingface.co/esapzoi/litter-detection-yolov8) | YOLOv8n | Litter (plastik poşet/şişe) | MIT (kartta) | 121 / 0 | **Sadece 8 epoch eğitilmiş** — zayıf, önermiyoruz |
| [Yorai/detr-resnet-50_finetuned_detect-waste](https://huggingface.co/Yorai/detr-resnet-50_finetuned_detect-waste) | DETR R50 (transformers) | TACO/detect-waste 7 kategori | Apache-2.0 | 41 / 2 | Temiz lisans, transformers pipeline; CPU ~1-2 s/görüntü (varsayım); litter odaklı |
| [IDEA-Research/grounding-dino-tiny](https://huggingface.co/IDEA-Research/grounding-dino-tiny) | zero-shot | prompt: "garbage bag", "garbage pile", "waste container", "dumpster", "overflowing garbage bin" | **Apache-2.0** | 634K / 102 | Sokağa dökülmüş çöp yığını gibi "açık uçlu" hedefler için en esnek çözüm |
| mrdbourke `*trashify*` ailesi (ör. [RahulKate-173/rt_detrv2_finetuned_trashify_box_detector_v1](https://huggingface.co/RahulKate-173/rt_detrv2_finetuned_trashify_box_detector_v1)) | RT-DETRv2 | bin, trash, hand | Apache-2.0 | 82 / 1 | **El-çekimi/yakın plan kurs projesi** — Street View domain'i değil; sadece bilgi amaçlı listelendi |

### Dataset'ler

| Dataset | Format | Lisans | İçerik / not |
|---|---|---|---|
| [keremberke/garbage-object-detection](https://huggingface.co/datasets/keremberke/garbage-object-detection) | HF datasets (COCO bbox) | **CC BY 4.0** (README'de doğrulandı) | 6 malzeme sınıfı, Roboflow rehost |
| [Yorai/detect-waste](https://huggingface.co/datasets/Yorai/detect-waste) | parquet (HF datasets) | **Belirtilmemiş** | TACO tabanlı detect-waste projesi; 7 sınıf (metals_and_plastic, other, non_recyclable, glass, paper, bio, unknown). TACO'nun kendi anotasyonları CC BY 4.0, görselleri Flickr karışık lisanslı (**varsayım**) |
| [1ease2/waste-garbage-management-dataset](https://huggingface.co/datasets/1ease2/waste-garbage-management-dataset) | imagefolder | MIT (kartta) | 10K-100K görüntü, sınıflandırma odaklı; 6.8K indirme |
| [Dataclusterlabspvtltd/Domestic-Trash-Garbage-Dataset](https://huggingface.co/datasets/Dataclusterlabspvtltd/Domestic-Trash-Garbage-Dataset) | imagefolder | **CC-BY-NC-ND-4.0 — RİSKLİ (ticari yasak + türev yasak), KULLANMAYIN** | <1K görüntü |
| Orijinal TACO | — | HF'de resmi tam tespit-formatlı kopyası **bulunamadı** (aramalar "taco" adlı alakasız LLM/uydu dataset'leri döndürdü); TACO'ya en yakın HF kaynağı `Yorai/detect-waste` | — |

**#1 Öneri:** `shirabendor/YOLOV8-oiv7` (yolov8s-oiv7) — "Waste container" sınıfı çöp konteynerlerini doğrudan verir, aynı modelden kent mobilyası sınıfları da bedavaya gelir. İndirir indirmez `model.names` ile sınıf listesini ve 2-3 Güngören görüntüsüyle isabeti test edin.
**Fallback:** `grounding-dino-tiny` zero-shot (çöp YIĞINI tespiti için zaten birincil araç; Apache-2.0 olması lisans hikâyesini de temizler).

---

## 6. Kategori: Kent Mobilyası / Sokak Donatıları (direk, bank, aydınlatma)

| Model | Mimari / boyut | Kapsam | Lisans | CPU demo | Not |
|---|---|---|---|---|---|
| Yerel `yolov8n.pt` ([Ultralytics/YOLOv8](https://huggingface.co/Ultralytics/YOLOv8)) | YOLOv8n, 6,5 MB | COCO: **bench (13), fire hydrant (10), stop sign (11), traffic light (9), parking meter (12)** + araç/insan bağlamı | AGPL-3.0 | ✅ 43 ms/görüntü ölçüldü | Bugün çalışır durumda; en az riskli yapı taşı |
| [shirabendor/YOLOV8-oiv7](https://huggingface.co/shirabendor/YOLOV8-oiv7) | YOLOv8s, 23 MB | OIV7: Street light, Bench, Billboard, Fountain, Waste container, Tree, Traffic sign… (varsayım — `model.names` ile teyit) | AGPL-3.0 | ✅ ~100-200 ms (varsayım, s-boyut) | Sokak lambası ve çöp konteyneri için tek gerçekçi eğitilmiş model |
| [facebook/mask2former-swin-large-mapillary-vistas-panoptic](https://huggingface.co/facebook/mask2former-swin-large-mapillary-vistas-panoptic) | Mask2Former Swin-**Large** | Mapillary Vistas panoptik (direkler, tabelalar, çöp kutusu, bank dahil sokak taksonomisi) | **"other" — araştırma kısıtlı, RİSKLİ** | ❌ CPU'da ~10-30 s/görüntü (varsayım) + 47K indirme | Domain mükemmel ama lisans + hız nedeniyle demo'ya UYGUN DEĞİL |
| [nvidia/segformer-b0-finetuned-cityscapes-1024-1024](https://huggingface.co/nvidia/segformer-b0-finetuned-cityscapes-1024-1024) | SegFormer-B0 (küçük) | Cityscapes 19 sınıf: pole, traffic sign, traffic light, sidewalk, road, vegetation | **"other" (NVIDIA araştırma lisansı) — ticari RİSKLİ** | ✅ hız uygun | Yol/kaldırım bağlam maskesi için cazip ama lisans bayraklı; MVP'ye almayın, "gelecek işler"e yazın |
| [IDEA-Research/grounding-dino-tiny](https://huggingface.co/IDEA-Research/grounding-dino-tiny) | zero-shot, 690 MB | prompt: "street light", "utility pole", "bench", "bus stop" | **Apache-2.0** | ⚠️ 2-5 s/görüntü (varsayım) | Eğitilmiş model olmayan her sınıf için joker |
| [google/owlv2-base-patch16-ensemble](https://huggingface.co/google/owlv2-base-patch16-ensemble) | OWLv2 zero-shot, 620 MB | serbest prompt | **Apache-2.0** | ⚠️ benzer | Grounding DINO alternatifi; 1M+ indirme |

### Mapillary durumu

- Resmî Mapillary Vistas HF'de yalnızca **gayriresmî mirror** olarak var: [candylion/mapillary-vistas-v2](https://huggingface.co/datasets/candylion/mapillary-vistas-v2) — **CC-BY-NC-SA-4.0 (ticari yasak)**, 87K indirme. Belediye ürünü hedefleyen bir projede eğitim verisi olarak **kullanmayın**; raporlarda atıf olarak kalabilir.
- [ThankGod/mapillary_traffic_sign_dataset](https://huggingface.co/datasets/ThankGod/mapillary_traffic_sign_dataset) ve türevleri mevcut (107-183 indirme) ama lisans kartları doğrulanmadı (**varsayım: orijinal Mapillary Traffic Sign Dataset araştırma-kısıtlıdır**).

**#1 Öneri:** Yerel `yolov8n.pt` (COCO beşlisi) + `yolov8s-oiv7` genişletmesi. **Fallback:** Grounding DINO zero-shot.
**İlginç yerel bulgu:** [eneskarabulut/istanbul-sidewalk-parking-detection](https://huggingface.co/datasets/eneskarabulut/istanbul-sidewalk-parking-detection) — Apache-2.0, 1K-10K görüntü, İstanbul kaldırım/park ihlali (README'si boş; içerik kalitesi **doğrulanamadı**). Demo hikâyesinde "İstanbul domain'inde HF dataset'i" olarak anılabilir; üretim değeri varsayım.

---

## 7. Kategori: Plaka Tespiti — SADECE ANONİMLEŞTİRME (KVKK)

> **KVKK sınırı:** Aşağıdaki modeller yalnızca kutu bul → Gaussian blur uygula akışında kullanılacak. Plaka METNİ okunmayacak, saklanmayacak, loglanmayacak. Ham (blursuz) kare diske/repo'ya yazılmayacak.

| Model | Mimari | Lisans | İndirme/Beğeni | Not |
|---|---|---|---|---|
| **Yerel `yolov8_plate.pt`** = [Koushim/yolov8-license-plate-detection](https://huggingface.co/Koushim/yolov8-license-plate-detection) | YOLOv8n, 640px, 1 sınıf | MIT (kartta; AGPL-türev tartışması saklı) | 22.500 / 7 | ✅ SHA256 doğrulandı, bugün 35 ms/görüntüyle çalıştı. Eğitim verisi kartında belgelenmemiş (**varsayım: Roboflow tipi karışık ülke plakaları**); TR plakası AB formatına yakın — 2-3 görüntüyle isabet testi yapın |
| [morsetechlab/yolov11-license-plate-detection](https://huggingface.co/morsetechlab/yolov11-license-plate-detection) | YOLOv11 n/s/m/l/x + **ONNX** sürümleri | **AGPL-3.0** | 18.734 / 35 | Bakımlı (Mayıs 2026 güncellemesi), Roboflow License Plate Recognition dataset'i (10K+ görüntü); v1n.pt 5,5 MB. Yerel model zayıf kalırsa ilk alternatif |
| [keremberke/yolov5m-license-plate](https://huggingface.co/keremberke/yolov5m-license-plate) | YOLOv5m | Belirtilmemiş (YOLOv5 tabanı AGPL-3.0 — türev de öyle sayılmalı) | 25.767 / 54 | mAP50 **0.988** (kartta). Dataset: [keremberke/license-plate-object-detection](https://huggingface.co/datasets/keremberke/license-plate-object-detection) (CC BY 4.0). `pip install yolov5` ayrı paket ister — entegrasyon sürtünmesi |
| [nickmuchi/yolos-small-finetuned-license-plate-detection](https://huggingface.co/nickmuchi/yolos-small-finetuned-license-plate-detection) | YOLOS-small (transformers) | **Belirtilmemiş — risk** | 5.385 / 41 | transformers pipeline ile çalışır; CPU'da ViT tabanlı = yavaşça |

### ❌ KVKK KARA LİSTESİ (arama sonuçlarında çıkan, bu projede YASAK modeller)
`DunnBC22/trocr-base-printed_license_plates_ocr`, `hezarai/crnn-fa-license-plate-recognition(-v2)`, `alyhassankamel/egyptian-license-plate-ocr`, `0xnu/european-license-plate-recognition` → **plaka okuma/OCR**. `dima806/man_woman_face_image_detection`, `dima806/faces_age_detection`, `abhilash88/face-emotion-detection`, `dima806/celebs_face_image_detection` → **profilleme/kimliklendirme**. Bunlar README'de, kodda, demo'da YER ALMAYACAK.

**#1 Öneri:** Mevcut `yolov8_plate.pt` (çalışıyor, hızlı, HF kaynaklı). **Fallback:** `morsetechlab/yolov11-license-plate-detection` v1n (+ONNX seçeneği). Blur güvenliği için: tespit eşiğini düşük tutun (conf≈0.15-0.2) ve kutuyu %20 büyüterek blur'layın — kaçan plaka, fazla blur'dan daha kötü.

---

## 8. Kategori: Yüz Tespiti — SADECE ANONİMLEŞTİRME (KVKK)

| Model | Mimari | Lisans | Beğeni | Not |
|---|---|---|---|---|
| **Yerel `yolov8_face.pt`** = [arnabdhar/YOLOv8-Face-Detection](https://huggingface.co/arnabdhar/YOLOv8-Face-Detection) | YOLOv8n (WIDER FACE Roboflow rehost, ~10K görüntü) | **AGPL-3.0** | 112 | ✅ SHA256 doğrulandı, 30 ms/görüntü. WIDER FACE = kalabalık/uzak yüzler içerir → sokak görüntüsü domain'ine uygun |
| [AdamCodd/YOLOv11n-face-detection](https://huggingface.co/AdamCodd/YOLOv11n-face-detection) | YOLOv11n, model.pt 5,5 MB + **ONNX (fp16 dahil)** | **Apache-2.0 (kartta)** | 40 | Kasım 2025 güncellemesi. Daha temiz lisans etiketi; ancak base_model=Ultralytics/YOLO11 (AGPL) → Apache iddiası da hukuken tartışmalı (aşağıya bakın) |
| [qualcomm/MediaPipe-Face-Detection](https://huggingface.co/qualcomm/MediaPipe-Face-Detection) | BlazeFace | "other" (Qualcomm lisansı) | 33 | Kısa menzil/selfie odaklı — Street View'daki küçük/uzak yüzlerde zayıf kalır; önermiyoruz |

**#1 Öneri:** Mevcut `yolov8_face.pt` — proje açık kaynak olacağı için AGPL sorun değil. Lisans tablosunu sadeleştirmek isterseniz `AdamCodd/YOLOv11n-face-detection`'a geçilebilir; pratik fark beklenmez (**varsayım**).
**KVKK notu:** Yüz tespiti çıktısı yalnızca blur koordinatı olarak kullanılacak; embedding/croplanmış yüz saklanmayacak.

---

## 9. HF Inference API / Serverless Durumu (2026 — bugün doğrulandı)

API üzerinden `inferenceProviderMapping` alanı tek tek kontrol edildi:

| Model | Serverless sağlayıcı | Durum |
|---|---|---|
| `facebook/detr-resnet-50` | **hf-inference: "live"**, task=object-detection, model "warm" | ✅ ÇALIŞAN tek doğrulanmış serverless tespit fallback'i |
| `hustvl/yolos-tiny`, `IDEA-Research/grounding-dino-tiny`, `google/owlv2-base-patch16-ensemble`, `nickmuchi/yolos-...`, tüm `keremberke/*` | mapping BOŞ | ❌ serverless yok |

- 2025 ortasından beri hf-inference sağlayıcısı ağırlıkla CPU dostu görevlere odaklandı; üçüncü-taraf sağlayıcılar (Together, fal, Replicate vb.) görüntü-tespit görevini genel olarak sunmuyor. Kaynaklar: [Inference Providers dokümantasyonu](https://huggingface.co/docs/inference-providers/index), [HF Inference sağlayıcı sayfası](https://huggingface.co/docs/inference-providers/en/providers/hf-inference), [desteklenen modeller](https://huggingface.co/inference/models).
- **Pratik sonuç:** Plan A = yerel CPU inference (ölçümler bunu rahat destekliyor: 5-20 görüntü × 4 model ≤ ~10-20 sn). Plan B = `huggingface_hub.InferenceClient().object_detection(image, model="facebook/detr-resnet-50")` — yalnızca COCO sınıfları (bank, dur tabelası, trafik ışığı) döner; çukur/çöp sınıfları serverless'ta YOK. Yani **canlı demo yerel çalışmak zorunda**; serverless yalnızca kısmi yedek.
- HF Inference Endpoints (ücretli, dedicated) keremberke/rezzzq tipi repolarda teoride kurulabilir ama 6 saatlik hackathon'da gereksiz maliyet/karmaşa.

---

## 10. Lisans ve KVKK Risk Matrisi

### AGPL-3.0 gerçeği (en önemli lisans konusu)
- `Ultralytics/YOLOv8`, `Ultralytics/YOLO11` ve TÜM YOLOv8/v11/v12 fine-tune türevleri fiilen **AGPL-3.0** ekosistemindedir. Kartında MIT/Apache yazan türevler (`Koushim`, `rezzzq`, `HrutikAdsare`, `cvtechniques`, `Harisanth`, `AdamCodd`, `esapzoi`) AGPL'li taban ağırlıklardan eğitildiği için bu yeniden-lisanslamalar **hukuken tartışmalıdır** — güvenli varsayım: hepsine AGPL muamelesi yapın.
- **Hackathon için sonuç: SORUN DEĞİL.** Proje repo'su public/açık kaynak olacaksa AGPL yükümlülüğü (kaynağı paylaş) zaten karşılanıyor. README'ye "Bu proje AGPL-3.0 ile lisanslanmıştır / Ultralytics YOLOv8 kullanır" yazın.
- **Gelecek riski:** Belediye ürünü kapalı kaynak/SaaS olarak ticarileşirse Ultralytics Enterprise lisansı veya Apache'li alternatif mimari (RT-DETR/transformers) gerekir. Sunumda bir cümleyle söylenebilir — olgunluk puanı kazandırır.

### Kırmızı bayraklı (KULLANMAYIN / sadece atıf)
| Kaynak | Sorun |
|---|---|
| `candylion/mapillary-vistas-v2` | CC-BY-NC-SA-4.0 — ticari yasak |
| `ShixuanAn/RDD_2020` | CC-BY-NC-3.0 — ticari yasak |
| `Dataclusterlabspvtltd/Domestic-Trash-Garbage-Dataset` | CC-BY-NC-ND-4.0 — ticari + türev yasak |
| `facebook/mask2former-*-mapillary-*` | "other" lisans (Mapillary araştırma kısıtı) + Swin-Large CPU'da çok yavaş |
| `nvidia/segformer-*-cityscapes-*` | NVIDIA araştırma lisansı ("other") + Cityscapes verisi araştırma-kısıtlı |
| `keremberke/*` model kartları | Lisans alanı BOŞ (dataset'leri CC BY 4.0, modeller belirsiz) — kullanılırsa README'de "lisans belirtilmemiş, YOLOv5/v8 tabanı AGPL varsayıldı" notu düşün |
| Plaka OCR + yüz analiz modelleri (bölüm 7-8 kara listesi) | **KVKK ihlali** — kesinlikle yok |

### Temiz lisanslılar (Apache-2.0, doğrulandı)
`IDEA-Research/grounding-dino-tiny`, `google/owlv2-base-patch16-ensemble`, `facebook/detr-resnet-50`, `hustvl/yolos-tiny`, `duongng2911/rt-detr-...-rdd2022`, `Yorai/detr-...detect-waste`, `eneskarabulut/istanbul-sidewalk-parking-detection` (DS). Dataset tarafında: `keremberke/german-traffic-sign-detection`, `keremberke/garbage-object-detection`, `keremberke/pothole-segmentation`, `keremberke/license-plate-object-detection` (hepsi CC BY 4.0).

---

## 11. MVP Pipeline Önerisi (25 puanlık CV kriterine hedefli)

```
Görüntü (Street View / çöp kamyonu karesi)
  1) KVKK katmanı (ZORUNLU, her zaman önce):
     yolov8_face.pt  -> yüz kutuları  -> Gaussian blur (kutu +%20)
     yolov8_plate.pt -> plaka kutuları -> Gaussian blur (kutu +%20)
  2) Tespit katmanı (anonimleştirilmiş kare üzerinde):
     a. yolov8n.pt (HF: Ultralytics/YOLOv8)   -> bench, fire hydrant, stop sign, traffic light, parking meter
     b. rezzzq/yolo12s-road-damage-rdd2022    -> D00/D10/D20/D40(çukur)/Repair
     c. shirabendor/YOLOV8-oiv7 (yolov8s)     -> Waste container, Street light, Billboard, ...
     d. (opsiyonel joker) grounding-dino-tiny -> "garbage pile", "billboard", eksik kalan sınıflar
  3) Çıktı: sınıf + bbox + güven + foto konumu -> harita/dashboard
```

- **Toplam ek indirme:** ~25-30 MB (b+c) + istenirse 690 MB (d). Hepsi `hf_hub_download` ile — README'de 6-8 HF linki = "HF zorunlu kaynak" şartı fazlasıyla belgelenmiş olur.
- **İlk 15 dakikada yapılacak doğrulama sırası:** (1) rezzzq modelinin `YOLO(...)` ile yüklendiğini test et (YOLOv12 fork riski), (2) yolov8s-oiv7 `model.names` içinde "Waste container" var mı bak, (3) 3 Güngören Street View karesinde uçtan uca koş. Birinde takılırsan tabloda yazılı fallback'e geç — hepsi hazır.
- **Demo güvenilirliği:** Ölçülen hızlarla 20 görüntü × 4 model ≈ 15-25 sn CPU'da; canlı demo için görüntüleri önceden işleyip sonuçları cache'lemek + 1-2 görüntüyü sahnede canlı işlemek en sağlam strateji.

## 12. Doğrulama Kayıtları / Varsayım Listesi

**API ile bugün doğrulananlar:** Bu rapordaki her HF linki, lisans etiketi, indirme/beğeni sayısı, dosya adı/boyutu ve yerel SHA256 eşleşmeleri 6 Haz 2026'da HF REST API'den çekildi. Yerel üç model ultralytics 8.4.60 ile gerçekten yüklendi, sınıf adları ve CPU süreleri gerçekten ölçüldü. `facebook/detr-resnet-50`'nin hf-inference'ta "live/warm" olduğu API yanıtından okundu.

**Varsayımlar (test edilmeden güvenilmemeli):** (1) rezzzq YOLOv12 checkpoint'inin mainline ultralytics 8.4.60 ile yüklenmesi; (2) keremberke 8.0.21-dönemi checkpoint'lerinin 8.4.x ile yüklenmesi; (3) yolov8s-oiv7'nin tam sınıf listesi ve "Waste container" isabet kalitesi; (4) shirabendor repo'sunun resmi Ultralytics OIV7 ağırlıklarıyla birebir aynı olduğu; (5) zero-shot modellerin CPU süreleri (2-5 s/görüntü tahmini); (6) orijinal RDD2022/TACO lisansları; (7) Koushim plaka modelinin TR plakalarındaki isabeti; (8) keremberke pothole modellerinin 90 görüntülük eğitimle Güngören'e genellemesi.
