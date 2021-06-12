/**
 * @typedef {import('./geoJSON').OverpassElement} OverpassElement
 */

/**
 * @typedef {{lat: number;lon: number;}} BasicPoint
 */

/**
 * @typedef {[BasicPoint, BasicPoint]} BasicLine
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
 * @param {number} narrowAngleLimit
 * @param {[OverpassElement,OverpassElement][]} excludedConnectors
 */
export function prepareConnectors (places, maxVertexLength, narrowAngleLimit, excludedConnectors = []) {
  let connectors = makeConnectors(places, maxVertexLength);

  if (narrowAngleLimit > 0) {
    connectors = narrowAngleOptimise(connectors, narrowAngleLimit);
  }

  if (excludedConnectors.length > 0) {
    connectors = connectorsExcept(connectors, excludedConnectors);
  }

  return connectors;
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

/**
 *
 * @template T
 * @param {(T & BasicLine)[]} connectors
 * @param {number} minAngle in degrees
 * @returns {T[]}
 */
export function narrowAngleOptimise (connectors, minAngle = 1) {
  if (minAngle <= 0) {
    return connectors;
  }

  connectors.sort(connectorLengthComparator);

  const outList = [];

  for (const item of connectors) {
    let includeLine = true;

    for (const other of outList) {
      // Try to join the lines to make sure the lines are connected and the points are in the correct order.
      //
      // e.g if the lines are [C -> B] and [A -> C] then this function will return [B -> C -> A]
      const joinedLines = joinLines(item, other);

      if (joinedLines) {
        // If the points are B -> C -> A
        // then the angle will be calculated between [C -> B] and [C -> A]
        const angle = calculateAngle([joinedLines[1],joinedLines[0]], [joinedLines[1], joinedLines[2]]);

        if (angle < minAngle) {
          includeLine = false;
          break;
        }
      }
    }

    if (includeLine) {
      outList.push(item);
    }
  }

  return outList;
}

/**
 * @param {BasicLine} a
 * @param {BasicLine} b
 */
function connectorLengthComparator (a, b) {
  const distA = calculateDistance(a[0], a[1]);
  const distB = calculateDistance(b[0], b[1]);

  return distA - distB;
}

/**
 *
 * @param {BasicPoint} p1
 * @param {BasicPoint} p2
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

/**
 *
 * @param {BasicLine} lineA
 * @param {BasicLine} lineB
 */
function calculateAngle(lineA, lineB) {
  const bearingA = calculateBearing(lineA[0], lineA[1]);
  const bearingB = calculateBearing(lineB[0], lineB[1]);

  let delta = Math.abs(bearingB - bearingA);
  const smallAngle = delta > 180 ? (180 - (delta - 180)) : delta;

  return smallAngle;
}


/**
 *
 * @param {BasicPoint} point1
 * @param {BasicPoint} point2
 * @returns {number} Bearing in degrees
 */
function calculateBearing (point1, point2) {
  const φ1 = point1.lat * Math.PI / 180; // φ, λ in radians
  const φ2 = point2.lat * Math.PI / 180;
  const Δλ = (point2.lon - point1.lon) * Math.PI / 180;

  const X = Math.cos(φ2) * Math.sin(Δλ);
  const Y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return Math.atan2(Y, X) * 180 / Math.PI;
}

/**
 * Assumes connectors all follow convention of lower id first
 * @template T
 * @param {(T & BasicLine)[]} connectors
 * @param {(T & BasicLine)[]} except
 * @returns {T[]}
 */
export function connectorsExcept (connectors, except) {
  return connectors.filter(c => typeof except.find(e => c[0] === e[0] && c[1] === e[1]) === "undefined");
}

/**
 * Finds the common node of two line segments then returns a three point line if it finds one.
 * Returns undefined if the two lines are not connected.
 * @param {BasicLine} segmentA
 * @param {BasicLine} segmentB
 * @returns {[BasicPoint, BasicPoint, BasicPoint]}
 */
function joinLines (segmentA, segmentB) {
  if (segmentA[0] === segmentB[0]) {
    return [segmentA[1], segmentA[0], segmentB[1]];
  }
  if (segmentA[0] === segmentB[1]) {
    return [segmentA[1], segmentA[0], segmentB[0]];
  }
  if (segmentA[1] === segmentB[0]) {
    return [segmentA[0], segmentA[1], segmentB[1]];
  }
  if (segmentA[1] === segmentB[1]) {
    return [segmentA[0], segmentA[1], segmentB[0]];
  }
}