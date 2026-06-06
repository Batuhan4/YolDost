/**
 * TypeScript mirror of packages/contracts/schemas/*.schema.json.
 * Keep field names in sync with the JSON Schemas, the Go structs in
 * services/api/internal/domain/inventory/model and the CV worker output.
 */

export type DemoRunStatus = "pending" | "running" | "completed" | "failed";

export interface DemoRun {
  id: string;
  name: string;
  status: DemoRunStatus;
  image_count: number;
  detection_count: number;
  /** Total number of face/plate regions irreversibly masked in this run. */
  anonymized_region_count: number;
  /** Hugging Face model reference used for urban object detection. */
  model_id: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export type ImageProvider =
  | "google_street_view"
  | "google_maps_static"
  | "fixture"
  | "field_upload";

/**
 * Metadata for one input image. Raw pixels are never stored in the system of
 * record; there is intentionally no raw-image URI field (KVKK).
 */
export interface ImageSource {
  id: string;
  demo_run_id: string;
  provider: ImageProvider;
  /** Provider reference (Street View pano id, fixture key). Never an image payload. */
  external_ref: string | null;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  captured_at: string | null;
  /** True only after the irreversible face/plate anonymization gate completed. */
  anonymized: boolean;
  /** Location of the anonymized derivative. Raw image URIs are forbidden. */
  anonymized_uri: string | null;
}

/** Normalized [0,1] bounding box relative to image width/height. */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * One detected inanimate urban object on an anonymized image.
 * Person, face and license-plate classes are forbidden by contract.
 */
export interface Detection {
  id: string;
  demo_run_id: string;
  image_id: string;
  /** e.g. traffic_sign, billboard, pole, trash_bin, bench, traffic_light, pothole. */
  object_class: string;
  confidence: number;
  bbox: BoundingBox;
  lat: number | null;
  lng: number | null;
  /** Anonymized evidence crop only. */
  evidence_uri: string | null;
  model_id: string | null;
}

export type AnonymizedRegionType = "face" | "license_plate";
export type AnonymizationMethod = "gaussian_blur" | "solid_mask";

/**
 * Audit record proving an image passed the irreversible anonymization gate
 * before any product detection ran. Stores only counts — never region
 * contents, crops, embeddings, identities or plate text (KVKK).
 */
export interface AnonymizationEvent {
  id: string;
  demo_run_id: string;
  image_id: string;
  region_type: AnonymizedRegionType;
  region_count: number;
  method: AnonymizationMethod;
  /** Always true. Reversible masking is not a valid state. */
  irreversible: true;
  processed_at: string | null;
}
