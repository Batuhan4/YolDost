# Street Analysis Run: 20260606T134500Z-local-baseline

## Evidence

- Dataset: `Reubencf/streetview-global` @ `a206537534dc0e8165e0e7d36f08df14795127db`
- Dataset license: `CC-BY-SA-4.0`
- Model: `nvidia/segformer-b0-finetuned-cityscapes-1024-1024` @ `21b3847fae21ddee674abd31129307b6a1235bd9`
- Device: `cpu`
- Images: 6
- Total inference time: 2.938 seconds
- Throughput: 2.042 images/second

## Aggregate Physical Indicators

| Indicator | Mean |
|---|---:|
| Built density | 15.38% |
| Openness score | 62.48/100 |
| Sidewalk availability proxy | 17.70/100 |
| Greenery score | 60.14/100 |
| Road share | 28.09% |
| Pedestrian comfort potential | 48.55/100 |

## Accuracy Status

**Segmentation accuracy is not measured in this run.** The open demo images
do not contain matching pixel-level ground truth. Throughput and class
coverage are benchmark results, not accuracy. Accuracy metrics such as
mIoU must only be reported after evaluating against a labeled validation set.

## Score Formula

- Built density: building + wall + fence pixel share.
- Openness: sky share normalized to a 30% reference.
- Sidewalk availability: sidewalk share normalized to a 20% reference.
- Greenery: vegetation + terrain share normalized to a 30% reference.
- Comfort potential: 35% openness + 35% sidewalk + 20% greenery +
  10% inverse built density.

These values are transparent planning proxies. They do not measure people,
crime, guaranteed safety, mental state, revenue, or live pedestrian traffic.
Person, rider, and vehicle model classes are discarded before persistence.

## Anonymization

- Faces masked: 0
- Plates masked: 1
- Method: `solid_mask`
- Raw streamed images were not written to disk.

## Per-Image Results

| Image | Built % | Open | Sidewalk | Green | Comfort |
|---|---:|---:|---:|---:|---:|
| `street-001.jpg` | 16.56 | 76.19 | 3.58 | 100.00 | 56.26 |
| `street-002.jpg` | 38.67 | 15.75 | 8.39 | 42.62 | 23.11 |
| `street-003.jpg` | 3.87 | 44.99 | 33.56 | 100.00 | 57.11 |
| `street-004.jpg` | 11.07 | 100.00 | 3.71 | 10.97 | 47.39 |
| `street-005.jpg` | 18.47 | 79.93 | 15.79 | 16.61 | 44.98 |
| `street-006.jpg` | 3.65 | 58.04 | 41.16 | 90.62 | 62.48 |
