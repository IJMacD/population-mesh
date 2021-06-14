const sqlite3 = require('sqlite3');
const https = require('https');
const fs = require('fs');

const db = new sqlite3.Database("geo.db");

const jsonOutput = "nomis.json";

const allBUAs = "1128267777...1128270836,1128270838...1128272832,1128272840,1128272842,1128272841,1128272833...1128272839,1128272843...1128273270";

const batchLimit = 10;

const list = expandList(allBUAs);

// console.log(list.length + " Built up areas");
// console.log(list);

// fetchAllBuiltUpAreas();
// fetchBoundaries();
// calculateAreaAndCentre();
generateJSON();

async function fetchAllBuiltUpAreas () {
    const fields = "geography,date_name,geography_name,geography_code,obs_value";
    const data = await fetch(`https://www.nomisweb.co.uk/api/v01/dataset/NM_144_1.data.csv?date=latest&geography=${allBUAs}&rural_urban=0&cell=0&measures=20100&select=${fields}`);

    const lines = data.trim().split("\n");

    const header = lines.shift();

    console.log(header);

    console.log(lines.length + " built up areas fetched");

    const stmt_bua = db.prepare("INSERT INTO built_up_areas (id, geography_code, name) VALUES ($id, $code, $name)");

    const stmt_census = db.prepare("INSERT INTO census (bua_id, year, population) VALUES ($id, $date, $population)");

    db.serialize(() => {
        db.exec("BEGIN TRANSACTION");

        for (const line of lines) {
            const fields = line.split(",").map(f => f.replace(/^"|"$/g, ""));

            const $id = +fields[0];

            const $date = +fields[1];

            const $name = fields[2].replace(/ BUA$/, "");

            const $code = fields[3];

            const $population = +fields[4];

            stmt_bua.run({ $id, $code, $name });

            stmt_census.run({ $id, $date, $population });

            // console.log({ $id, $date, $name, $code, $population });
        }

        db.exec("COMMIT", () => console.log("Finished"));

        console.log("Writing to database");
    });
}

async function fetchBoundaries () {
    let result = 1;
    let added = 0;

    while (result) {
        result = await runBoundaryBatch();
        added += result;
        console.log("Added " + added + " so far");
    }

    console.log("Done");
}

function runBoundaryBatch () {
    return new Promise((resolve, reject) => {
        db.all("SELECT id FROM built_up_areas WHERE geometry IS NULL LIMIT " + batchLimit, (error, rows) => {
            if (error) {
                reject(error);
                return;
            }

            let completed = 0;

            rows.forEach(async row => {
                console.log("Fetching geometry for ID: " + row.id);
                const geoJSON = await fetchGeoJSON(row.id);

                const $geometry = JSON.stringify(geoJSON.features[0].geometry);

                function onComplete (error) {
                    if (error) {
                        reject(error);
                        return;
                    }

                    console.log("Inserted ID: " + row.id);
                    completed++;

                    if (completed === rows.length) {
                        resolve(completed);
                    }
                }

                db.run("UPDATE built_up_areas SET geometry = $geometry WHERE id = $id", { $id: row.id, $geometry }, onComplete);
            });
        });
    });
}

async function calculateAreaAndCentre () {
    let result = 1;
    let added = 0;

    while (result) {
        result = await runAreaCentreBatch();
        added += result;
        console.log("Added " + added + " so far");
    }

    console.log("Done");
}

function runAreaCentreBatch () {
    return new Promise((resolve, reject) => {
        db.all("SELECT id, geometry FROM built_up_areas WHERE area IS NULL LIMIT " + batchLimit, (error, rows) => {
            if (error) {
                reject(error);
                return;
            }

            let completed = 0;

            function onComplete (error) {
                if (error) {
                    reject(error);
                    return;
                }

                completed++;

                if (completed === rows.length) {
                    resolve(completed);
                }
            }

            rows.forEach(row => {
                const geometry = JSON.parse(row.geometry);

                let $latitude, $longitude, $area;

                if (geometry.type === "Polygon") {
                    const points = geometry.coordinates[0];
                    // All geojson areas are upside down so we need to negate the area.
                    $area = -getArea(points);
                    [$latitude, $longitude] = getCentre(points);
                } else if (geometry.type === "MultiPolygon") {
                    const groupsOfPoints = geometry.coordinates[0];
                    // All geojson areas are upside down so we need to negate the area.
                    $area = -groupsOfPoints.map(getArea).reduce((a, b) => a + b, 0);
                    // Just use outer polygon for centre calculation
                    [$latitude, $longitude] = getCentre(groupsOfPoints[0]);
                } else {
                    console.warn("Unknown geometry type: " + geometry.type);
                    return;
                }

                db.run("UPDATE built_up_areas SET latitude = $latitude, longitude = $longitude, area = $area WHERE id = $id", { $id: row.id, $latitude, $longitude, $area }, onComplete);
            });
        });
    });
}

function generateJSON () {
    db.all("SELECT id, name, ROUND(latitude, 4) AS latitude, ROUND(longitude, 4) AS longitude FROM built_up_areas", (error, rows) => {
        if (error) {
            console.error(error);
            return;
        }

        fs.writeFile(jsonOutput, JSON.stringify(rows), () => console.log("Written " + rows.length + " to " + jsonOutput));
    });
}

/**
 * @param {string} url
 * @return {Promise<string>}
 */
function fetch (url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode !== 200) {
                reject(res.statusMessage);
                return;
            }

            /** @type {string[]} */
            let buffer = [];

            res.on("data", chunk => buffer.push(chunk));

            res.on("end", () => {
                try {
                    resolve(buffer.join(""));
                } catch (e) {
                    reject(e);
                }
            });
        });
    });
}

function fetchGeoJSON (id) {
    return fetch(`https://www.nomisweb.co.uk/websvc/geojson.aspx?geogs=${id}`).then(data => JSON.parse(data));
}

/**
 * @param {string} spec
 */
function expandList (spec) {
    const parts = spec.split(",");
    const ranges = parts.map(part => part.includes("...") ? range(...part.split("...")) : [+part]);
    return ranges.flat();
}

/**
 * @param {string | number} start
 * @param {string | number} [end]
 */
function range (start, end) {
    const a = +start;
    const b = +end;
    const d = b - a + 1;
    return [...Array(d)].map((_,i) => a + i);
}

/**
 * @see https://en.wikipedia.org/wiki/Centroid#Of_a_polygon
 * The centroid of a non-self-intersecting closed polygon defined by n vertices (x0,y0), (x1,y1), ..., (xn−1,yn−1) is the point (Cx, Cy),[19] where
 * {\displaystyle C_{\mathrm {x} }={\frac {1}{6A}}\sum _{i=0}^{n-1}(x_{i}+x_{i+1})(x_{i}\ y_{i+1}-x_{i+1}\ y_{i}),}{\displaystyle C_{\mathrm {x} }={\frac {1}{6A}}\sum _{i=0}^{n-1}(x_{i}+x_{i+1})(x_{i}\ y_{i+1}-x_{i+1}\ y_{i}),} and
 * {\displaystyle C_{\mathrm {y} }={\frac {1}{6A}}\sum _{i=0}^{n-1}(y_{i}+y_{i+1})(x_{i}\ y_{i+1}-x_{i+1}\ y_{i}),}{\displaystyle C_{\mathrm {y} }={\frac {1}{6A}}\sum _{i=0}^{n-1}(y_{i}+y_{i+1})(x_{i}\ y_{i+1}-x_{i+1}\ y_{i}),}
 * and where A is the polygon's signed area,[19] as described by the shoelace formula:
 * {\displaystyle A={\frac {1}{2}}\sum _{i=0}^{n-1}(x_{i}\ y_{i+1}-x_{i+1}\ y_{i}).}{\displaystyle A={\frac {1}{2}}\sum _{i=0}^{n-1}(x_{i}\ y_{i+1}-x_{i+1}\ y_{i}).}
 */

/**
 * Cross Product Area
 * @see http://paulbourke.net/geometry/polygonmesh/#clockwise
 * @param {[number,number][]} points
 */
function getArea (points) {
    let sum = 0;
    for (let i = 0; i < points.length - 1; i++) {
        sum += points[i][0] * points[i+1][1] - points[i+1][0] * points[i][1];
    }
    return sum / 2;
}

/**
 *
 * @param {[number,number][]} points
 * @return {[number, number]}
 */
function getCentre (points) {
    let cx = 0, cy= 0, area = 0;

    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i][0] * points[i+1][1] - points[i+1][0] * points[i][1];
        cx += (points[i][0] + points[i+1][0]) * a;
        cy += (points[i][1] + points[i+1][1]) * a;
        area += a;
    }

    area = area / 2;

    return [
        cx / (6 * area),
        cy / (6 * area)
    ];
}