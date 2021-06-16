import React from "react";
import { GeoJSONLayer } from "react-mapbox-gl";
import { createCirclePaint, createFillPaint, createGeoJSON, createLinePaint } from "./geoJSON";

export function Tier ({ places = [], connectors = [], shapes = [], tier }) {
    const placesGeoJSON = createGeoJSON(places, []);
    const connectorsGeoJSON = createGeoJSON([], connectors);
    const shapesGeoJSON = {
        type: "FeatureCollection",
        features: shapes,
    };
    
    const circlePaint = createCirclePaint(tier);
    const fillPaint = createFillPaint(tier);
    const linePaint = createLinePaint(tier);

    return <>
        <GeoJSONLayer data={placesGeoJSON} circlePaint={circlePaint} />
        <GeoJSONLayer data={shapesGeoJSON} fillPaint={fillPaint} />
        <GeoJSONLayer data={connectorsGeoJSON} linePaint={linePaint} />
    </>;
}