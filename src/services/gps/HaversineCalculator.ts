/**
 * Haversine formula for calculating distance between two GPS points.
 * Used as fallback when position.coords.speed returns -1.
 */

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate speed from two GPS positions using Haversine distance.
 * @returns speed in m/s
 */
export function calculateSpeed(
  lat1: number,
  lon1: number,
  timestamp1: number,
  lat2: number,
  lon2: number,
  timestamp2: number,
): number {
  const distance = haversineDistance(lat1, lon1, lat2, lon2);
  const timeDelta = (timestamp2 - timestamp1) / 1000; // ms → s

  if (timeDelta <= 0) {
    return 0;
  }

  return distance / timeDelta;
}
