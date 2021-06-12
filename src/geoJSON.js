
const tierColours = ['#00FFFF', '#029ACF', '#007FFF', '#0000CC'];
export function createCirclePaint(tier) {
  return {
    'circle-radius': {
      'base': 5 / tier,
      'stops': [
        [12, 10 / tier],
        [22, 180 / tier]
      ]
    },
    // color circles by ethnicity, using a match expression
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
 * @typedef OverpassElement
 * @property {number} id
 * @property {number} lat
 * @property {number} lon
 * @property {"node"|"way"|"relation"} type
 * @property {{ [key: string]: string }} tags
 */
/**
 *
 * @param {OverpassElement[]} places
 * @param {OverpassElement[][]} connectors
 * @returns
 */
export function createGeoJSON(places, connectors) {
  return {
    "type": "FeatureCollection",
    "features": [
      ...places.map(place => ({
        "geometry": {
          "type": "Point",
          "coordinates": [place.lon, place.lat]
        },
        "properties": {
          "name": place.tags.name
        }
      })),
      ...connectors.map(([p1, p2]) => ({
        "geometry": {
          "type": "LineString",
          "coordinates": [
            [p1.lon, p1.lat],
            [p2.lon, p2.lat],
          ]
        },
        "properties": {
          "name": `From ${p1.tags.name} to ${p2.tags.name}`
        }
      })),
    ]
  };
}

