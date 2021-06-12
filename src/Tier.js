import React from "react";
import { GeoJSONLayer } from "react-mapbox-gl";
import { createCirclePaint, createGeoJSON, createLinePaint } from "./geoJSON";

export function Tier ({ places = [], connectors = [], tier }) {
    const placesGeoJSON = createGeoJSON(places, []);
    const connectorsGeoJSON = createGeoJSON([], connectors);
    const circlePaint = createCirclePaint(tier);
    const linePaint = createLinePaint(tier);

    return <>
        <GeoJSONLayer data={placesGeoJSON} circlePaint={circlePaint} />
        <GeoJSONLayer data={connectorsGeoJSON} linePaint={linePaint} />
    </>;
}