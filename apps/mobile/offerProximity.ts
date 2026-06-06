export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DemoOffer extends Coordinates {
  id: string;
  name: string;
  partnerName: string;
  radiusMeters: number;
}

export interface OfferProximity {
  distanceMeters: number;
  isNear: boolean;
}

const EARTH_RADIUS_METERS = 6_371_008.8;

export function metersBetween(start: Coordinates, end: Coordinates) {
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);
  const deltaLatitude = toRadians(end.latitude - start.latitude);
  const deltaLongitude = toRadians(end.longitude - start.longitude);

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function getOfferProximity(
  current: Coordinates,
  offer: DemoOffer,
): OfferProximity {
  const distanceMeters = metersBetween(current, offer);

  return {
    distanceMeters,
    isNear: distanceMeters <= offer.radiusMeters,
  };
}

export function formatDistance(meters: number) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
