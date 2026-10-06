/**
 * Utility for generating smooth GPS waypoints and calculating driving metrics.
 */

export interface SimulationState {
  isSimulating: boolean;
  currentIndex: number;
  totalWaypoints: number;
  progressPercent: number;
  speedMultiplier: number;
  remainingKm: number;
  etaMinutes: number;
  hasArrived: boolean;
}

/**
 * Calculate Great-Circle distance between two coordinates using Haversine formula
 */
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return +(R * c).toFixed(2);
};

/**
 * Estimate driving ETA in minutes assuming 25 km/h urban speed
 */
export const calculateEtaMinutes = (distanceKm: number, speedKmh = 25): number => {
  if (distanceKm <= 0.05) return 0;
  const hours = distanceKm / speedKmh;
  const minutes = Math.ceil(hours * 60);
  return Math.max(1, minutes);
};

/**
 * Generate smooth intermediate waypoints between start and destination coordinates.
 * Injects subtle sinusoidal road curve variations to simulate realistic street corners.
 */
export const generateRouteWaypoints = (
  start: [number, number],
  end: [number, number],
  steps = 36
): [number, number][] => {
  const waypoints: [number, number][] = [];
  const [startLat, startLng] = start;
  const [endLat, endLng] = end;

  // Vector perpendicular for natural city curves
  const deltaLat = endLat - startLat;
  const deltaLng = endLng - startLng;
  const perpLat = -deltaLng * 0.15;
  const perpLng = deltaLat * 0.15;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    // Linear progression
    let lat = startLat + t * deltaLat;
    let lng = startLng + t * deltaLng;

    // Add gentle multi-harmonic curve deviation (zero at start and end)
    const curveOffset = Math.sin(t * Math.PI) * Math.cos(t * Math.PI * 2);
    lat += curveOffset * perpLat;
    lng += curveOffset * perpLng;

    waypoints.push([+lat.toFixed(6), +lng.toFixed(6)]);
  }

  // Ensure absolute destination coordinate is the final waypoint
  waypoints[waypoints.length - 1] = [endLat, endLng];
  return waypoints;
};
