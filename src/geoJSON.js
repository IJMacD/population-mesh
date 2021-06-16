
export const tierColours = ['#00FFFF', '#029ACF', '#007FFF', '#0000CC'];
export function createFillPaint(tier) {
  return {
    'fill-color': tierColours[tier - 1],
  };
}
export function createCirclePaint(tier) {
  return {
    'circle-radius': {
      'base': 5 / tier,
      'stops': [
        [12, 10 / tier],
        [22, 180 / tier]
      ]
    },
    // https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-match
    'circle-color': tierColours[tier - 1],
  };
}
export function createLinePaint(tier) {
  return {
    'line-width': {
      'base': 3 / tier,
      'stops': [
        [12, 5 / tier],
        [22, 90 / tier]
      ]
    },
    // color circles by ethnicity, using a match expression
    // https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-match
    'line-color': tierColours[tier - 1],
  };
}


/**
 * @typedef {import("./overpass").OverpassElement} OverpassElement
 */

/**
 * @typedef GeoJSONFeature
 * @property {"Feature"} [type]
 * @property {string} [id]
 * @property {GeoJSONGeometry} geometry
 * @property {{ [key: string]: string }} properties
 */

/**
 * @typedef GeoJSONFeatureCollection
 * @property {"FeatureCollection"} type
 * @property {GeoJSONFeature[]} features
 */

/**
 * @typedef {GeoJSONGeometryPoint | GeoJSONGeometryLineString | GeoJSONGeometryPolygon | GeoJSONGeometryMultipPolygon} GeoJSONGeometry
 */

/**
 * @typedef GeoJSONGeometryPoint
 * @property {"Point"} type
 * @property {[number, number]} coordinates
 */

/**
 * @typedef GeoJSONGeometryLineString
 * @property {"LineString"} type
 * @property {[number, number][]} coordinates
 */

/**
 * @typedef GeoJSONGeometryPolygon
 * @property {"Polygon"} type
 * @property {[number, number][][]} coordinates
 */

/**
 * @typedef GeoJSONGeometryMultipPolygon
 * @property {"MultiPolygon"} type
 * @property {[number, number][][][]} coordinates
 */

/**
 *
 * @param {OverpassElement[]} places
 * @param {OverpassElement[][]} connectors
 * @returns {GeoJSONFeatureCollection}
 */
export function createGeoJSON(places, connectors) {
  return {
    "type": "FeatureCollection",
    "features": [
      ...places.map(place => ({
        "geometry": /** @type {GeoJSONGeometryPoint} */({
          "type": "Point",
          "coordinates": [place.lon, place.lat]
        }),
        "properties": {
          "name": place.tags.name
        }
      })),
      ...connectors.map(([p1, p2]) => ({
        "geometry": /** @type {GeoJSONGeometryLineString} */({
          "type": "LineString",
          "coordinates": [
            [p1.lon, p1.lat],
            [p2.lon, p2.lat],
          ]
        }),
        "properties": {
          "name": `From ${p1.tags.name} to ${p2.tags.name}`
        }
      })),
    ]
  };
}

