import { useEffect, useRef, useState } from "react";

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

/**
 * 
 * @param {number[]} ids 
 */
export function useNomisShapes (ids) {
    const [ shapes, setShapes ] = useState([]);
    const dbPromise = useDatabase();

    const stableIDs = useArrayMemo(() => ids, ids);

    useEffect(() => {
        dbPromise.then(async db => {
            const dbResults = await Promise.all(stableIDs.map(id => getDatabaseNomisShape(db, id)));

            const haves = dbResults.filter(r => r);
            const haveNots = stableIDs.filter((_,i) => !dbResults[i]);

            setShapes(haves);

            batchFetchShapes(db, haveNots, 10, setShapes);
        });

    // eslint-disable-next-line
    }, [stableIDs]);

    return shapes;
}

/**
 * @param {IDBDatabase} db
 * @param {number[]} ids
 * @param {number} batchSize
 * @param {(callback: (shapes: any[]) => any[]) => void} setShapes
 */
async function batchFetchShapes (db, ids, batchSize, setShapes) {
    let startIndex = 0;

    while (startIndex < ids.length) {
        const endIndex = startIndex + batchSize;
        const batchIDs = ids.slice(startIndex, endIndex);
        startIndex  = endIndex;

        const shapes = await Promise.all(batchIDs.map(fetchNomisShape));
        
        const transaction = db.transaction("shapes", "readwrite");
        const objectStore = transaction.objectStore("shapes");
        
        for (const shape of shapes) {
            objectStore.add(shape);
        }

        setShapes(prevShapes => [ ...prevShapes, ...shapes ]);
    }
}

/**
 * 
 * @param {number} id 
 * @returns 
 */
async function fetchNomisShape (id) {
    const r = await fetch(`https://www.nomisweb.co.uk/websvc/geojson.aspx?geogs=${id}`);
    
    if (!r.ok) {
        return r.text().then(t => Promise.reject(t));
    }
    
    const data = await r.json();

    return data.features[0];
}


/**
 * 
 * @param {IDBDatabase} db 
 * @param {number} id 
 * @returns 
 */
async function getDatabaseNomisShape (db, id) {
    const transaction = db.transaction("shapes");
    const objectStore = transaction.objectStore("shapes");
    
    const request = objectStore.get(id.toString());

    return new Promise ((resolve, reject) => {
        request.onerror = reject;

        request.onsuccess = event => {
            // @ts-ignore
            const shape = event.target.result;

            resolve(shape);
        }
    });
}

/**
 * @template T
 * @param {() => T} factory 
 * @param {any[]} array 
 * @returns {T}
 */
function useArrayMemo (factory, array) {
    /** @type {import("react").MutableRefObject<any[]>} */
    const arrayRef = useRef();
    /** @type {import("react").MutableRefObject<T>} */
    const resultRef = useRef();

    const recompute = !arrayRef.current || !compareArrays(arrayRef.current, array);

    if (recompute) {
        arrayRef.current = array;
        resultRef.current = factory();
    }

    return resultRef.current;
}

/**
 * 
 * @param {any[]} a 
 * @param {any[]} b 
 */
function compareArrays (a, b) {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

function useDatabase () {
    /** @type {import("react").MutableRefObject<Promise<IDBDatabase>>} */
    const ref = useRef();

    if (!ref.current) {
        ref.current = getDatabase();
    }

    return ref.current
}

/**
 * 
 * @returns {Promise<IDBDatabase>}
 */
function getDatabase () {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("POPMESH_NOMIS");

        request.onupgradeneeded = event => {
            /** @type {IDBDatabase} */
            // @ts-ignore
            const db = event.target.result;
        
            db.createObjectStore("shapes", { keyPath: "id" });
        };

        // @ts-ignore
        request.onsuccess = event => resolve(event.target.result);

        // @ts-ignore
        request.onerror = event => reject(event.target.errorCode);
    });
}