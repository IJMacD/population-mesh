/**
 *
 * @param {{ lat: number, lon: number }} p1
 * @param {{ lat: number, lon: number }} p2
 */
export function calculateDistance(p1, p2) {
  const R = 6371e3; // metres
  const φ1 = p1.lat * Math.PI / 180; // φ, λ in radians
  const φ2 = p2.lat * Math.PI / 180;
  const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
  const Δλ = (p2.lon - p1.lon) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}
