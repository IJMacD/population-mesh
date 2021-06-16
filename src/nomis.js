/**
 *
 * @param {[number,number,number,number]} bounds
 * @returns {Promise<import("./overpass").OverpassElement[]>}
 */
export async function fetchNomisPlaces (bounds) {
    const data = (await import("./data/nomis.json")).default;

    const filtered = data.filter(p => isInBounds(p, bounds));

    return filtered.map(p => ({
        id: p.id,
        type: "node",
        lat: p.lat,
        lon: p.lon,
        tags: {
            name: p.name,
            population: p.pop.toString(),
            place: "built_up_area",
        },
    }));
}

/**
 *
 * @param {{ lat: number, lon: number }} point
 * @param {[number,number,number,number]} bounds
 */
function isInBounds (point, bounds) {
    return point.lon >= bounds[0] && point.lon < bounds[2] && point.lat >= bounds[1] && point.lat < bounds[3];
}