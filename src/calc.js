import { calculateDistance } from './calculateDistance';

/**
 * @typedef {import('./geoJSON').OverpassElement} OverpassElement
 */

/**
 * @param {OverpassElement[]} places
 * @param {number} [minLimit]
 * @param {number} [maxLimit]
 */
export function filterPlaces(places, minLimit = 0, maxLimit = Infinity) {
    return places.filter(place => minLimit <= +place.tags.population && +place.tags.population < maxLimit);
}

/**
 * @param {OverpassElement[]} places
 * @param {number} maxVertexLength
 * @param {[OverpassElement, OverpassElement][]} [exclude]
 */

export function makeConnectors(places, maxVertexLength, exclude = []) {
  /** @type {[OverpassElement, OverpassElement][]} */
  const out = [];

  for (const p1 of places) {
    for (const p2 of places) {
      if (p1.id < p2.id) {
        const dist = calculateDistance(p1, p2);

        if (dist < maxVertexLength && !includesPair(p1, p2, exclude)) {
          out.push([p1, p2]);
        }
      }
    }
  }

  return out;
}
/**
 * @param {OverpassElement} place1
 * @param {OverpassElement} place2
 * @param {[OverpassElement, OverpassElement][]} list
 */
function includesPair(place1, place2, list) {
  const a = place1.id < place2.id ? place1 : place2;
  const b = place1.id < place2.id ? place2 : place1;

  for (const [alpha, beta] of list) {
    if (a === alpha && b === beta)
      return true;
  }

  return false;
}
