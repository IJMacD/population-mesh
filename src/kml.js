import { calculateDistance } from "./calc";

/**
 * @typedef {import("./overpass").OverpassElement} OverpassElement
 */

export function generateKML (layers) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
        <Style id="tier1_places">
            <IconStyle>
                <color>ffffff00</color>
                <scale>2</scale>
                <Icon>
                    <href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href>
                </Icon>
                <hotSpot x="32" y="1" xunits="pixels" yunits="pixels"/>
            </IconStyle>
        </Style>
        <Style id="tier2_places">
            <IconStyle>
                <color>ffcf9a02</color>
                <scale>1.6666</scale>
                <Icon>
                    <href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href>
                </Icon>
                <hotSpot x="32" y="1" xunits="pixels" yunits="pixels"/>
            </IconStyle>
        </Style>
        <Style id="tier3_places">
            <IconStyle>
                <color>ffff7f00</color>
                <scale>1.25</scale>
                <Icon>
                    <href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href>
                </Icon>
                <hotSpot x="32" y="1" xunits="pixels" yunits="pixels"/>
            </IconStyle>
        </Style>
        <Style id="tier4_places">
            <IconStyle>
                <color>ffcc0000</color>
                <scale>1</scale>
                <Icon>
                    <href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href>
                </Icon>
                <hotSpot x="32" y="1" xunits="pixels" yunits="pixels"/>
            </IconStyle>
        </Style>
        <Style id="tier1_connectors">
            <LineStyle>
                <color>ffffff00</color>
                <width>5</width>
            </LineStyle>
        </Style>
        <Style id="tier2_connectors">
            <LineStyle>
                <color>ffcf9a02</color>
                <width>4</width>
            </LineStyle>
        </Style>
        <Style id="tier3_connectors">
            <LineStyle>
                <color>ffff7f00</color>
                <width>3</width>
            </LineStyle>
        </Style>
        <Style id="tier4_connectors">
            <LineStyle>
                <color>ffcc0000</color>
                <width>2</width>
            </LineStyle>
        </Style>
        <Style id="tier1_shapes">
            <PolyStyle>
                <color>ffffff00</color>
                <outline>0</outline>
            </PolyStyle>
        </Style>
        <Style id="tier2_shapes">
            <PolyStyle>
                <color>ffcf9a02</color>
                <outline>0</outline>
            </PolyStyle>
        </Style>
        <Style id="tier3_shapes">
            <PolyStyle>
                <color>ffff7f00</color>
                <outline>0</outline>
            </PolyStyle>
        </Style>
        <Style id="tier4_shapes">
            <PolyStyle>
                <color>ffcc0000</color>
                <outline>0</outline>
            </PolyStyle>
        </Style>
        ${layers.map(layer => generateFolder(layer)).join("")}
    </Document>
</kml>`;
}

/**
 *
 * @param {{
 *  label: string,
 *  points?: OverpassElement[],
 *  lines?: [OverpassElement, OverpassElement][],
 *  shapes?: import("./geoJSON").GeoJSONFeature[],
 *  style: string
 * }} layer
 */
function generateFolder (layer) {
    return `
    <Folder>
        <name>${layer.label}</name>
        ${layer.points ? layer.points.map(p => generatePointPlacemark(p, layer.style)).join("") : ""}
        ${layer.lines ? layer.lines.map(l => generateLineStringPlacemark(l, layer.style)).join("") : ""}
        ${layer.shapes ? layer.shapes.map(s => generatePolygonPlacemark(s, layer.style)).join("") : ""}
    </Folder>`;
}

/**
 * @param {OverpassElement} point
 */
function generatePointPlacemark (point, style) {
    return `
        <Placemark>
            <name>${point.tags.name}</name>
            <description>Population: ${point.tags.population}</description>
            <styleUrl>#${style}</styleUrl>
            <Point>
                <coordinates>${point.lon},${point.lat},0</coordinates>
            </Point>
        </Placemark>`;
}

/**
 * @param {[OverpassElement, OverpassElement]} line
 * @param {string} style
 */
function generateLineStringPlacemark ([ p1, p2 ], style) {
    return `
        <Placemark>
            <name>${p1.tags.name} to ${p2.tags.name}</name>
            <description>Distance: ${calculateDistance(p1, p2).toFixed(0)}m</description>
            <styleUrl>#${style}</styleUrl>
            <LineString>
                <coordinates>
                    ${p1.lon},${p1.lat},0
                    ${p2.lon},${p2.lat},0
                </coordinates>
            </LineString>
        </Placemark>`;
}

/**
 * @param {import("./geoJSON").GeoJSONFeature} geoJSON
 * @param {string} style
 */
function generatePolygonPlacemark (geoJSON, style) {
    let geometry = "";

    if (geoJSON.geometry.type === "Polygon") {
        const coords = geoJSON.geometry.coordinates[0];
        geometry = `<Polygon>
                        <outerBoundaryIs>
                            <LinearRing>
                                <coordinates>
                                    ${coords.map(c => `${c[0]},${c[1]},0`).join(" ")}
                                </coordinates>
                            </LinearRing>
                        </outerBoundaryIs>
                    </Polygon>`;
    } else if (geoJSON.geometry.type === "MultiPolygon") {
        const outerCoords = geoJSON.geometry.coordinates[0][0];
        const innerCoordsSet = geoJSON.geometry.coordinates[0].slice(1);
        geometry = `<Polygon>
            <outerBoundaryIs>
                <LinearRing>
                    <coordinates>
                    ${outerCoords.map(c => `${c[0]},${c[1]},0`).join(" ")}
                    </coordinates>
                </LinearRing>
            </outerBoundaryIs>
            ${innerCoordsSet.map(coords => 
            `<innerBoundaryIs>
                <LinearRing>
                    <coordinates>
                        ${coords.map(c => `${c[0]},${c[1]},0`).join(" ")}
                    </coordinates>
                </LinearRing>
            </innerBoundaryIs>`).join("")}
        </Polygon>`;
    }

    return `
        <Placemark>
            <name>${geoJSON.properties.name}</name>
            <styleUrl>#${style}</styleUrl>
            ${geometry}
        </Placemark>`;
}