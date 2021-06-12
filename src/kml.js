import { calculateDistance } from "./calc";

/**
 * @typedef {import("./geoJSON").OverpassElement} OverpassElement
 */

export function generateKML (layers) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
        <Style id="tier1_places">
            <IconStyle>
                <color>ffffff00</color>
            </IconStyle>
        </Style>
        <Style id="tier2_places">
            <IconStyle>
                <color>ffcf9a02</color>
            </IconStyle>
        </Style>
        <Style id="tier3_places">
            <IconStyle>
                <color>ffff7f00</color>
            </IconStyle>
        </Style>
        <Style id="tier4_places">
            <IconStyle>
                <color>ffcc0000</color>
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
 *  style: string
 * }} layer
 */
function generateFolder (layer) {
    return `
    <Folder>
        <name>${layer.label}</name>
        ${layer.points ? layer.points.map(p => generatePointPlacemark(p, layer.style)).join("") : ""}
        ${layer.lines ? layer.lines.map(l => generateLineStringPlacemark(l, layer.style)).join("") : ""}
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
            <name>From ${p1.tags.name} to ${p2.tags.name}</name>
            <description>Distance: ${calculateDistance(p1, p2).toFixed(0)}m</description>
            <styleUrl>#${style}</styleUrl>
            <Point>
                <coordinates>
                    ${p1.lon},${p1.lat},0
                    ${p2.lon},${p2.lat},0
                </coordinates>
            </Point>
        </Placemark>`;
}