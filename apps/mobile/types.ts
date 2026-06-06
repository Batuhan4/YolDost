import type * as Location from 'expo-location';

import type { DemoOffer } from './offerProximity';

export type DemoRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface HealthResponse {
  status: string;
  services?: Record<string, string>;
}

export interface DemoRun {
  id: string;
  name: string;
  status: DemoRunStatus;
  image_count: number;
  detection_count: number;
  anonymized_region_count: number;
  model_id: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface ListResponse<T> {
  data: T[];
  count: number;
}

export interface ApiSnapshot {
  health: HealthResponse | null;
  demoRuns: DemoRun[];
  demoRunCount: number;
  checkedAt: string | null;
  errors: string[];
}

export type SensorStatus =
  | 'idle'
  | 'requesting'
  | 'tracking'
  | 'unavailable'
  | 'denied'
  | 'error';

export interface SensorSnapshot {
  status: SensorStatus;
  locationPermission: string;
  notificationPermission: string;
  location: Location.LocationObject | null;
  distanceMeters: number | null;
  offerSent: boolean;
  notificationId: string | null;
  notificationTrigger: string;
  message: string;
  error: string | null;
}

export interface DemoPartner extends DemoOffer {
  areaLabel: string;
  offer: string;
}

export type TabKey = 'guide' | 'routes' | 'stops' | 'offers';
