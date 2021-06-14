import { useEffect, useState } from "react";

/**
 * @typedef OverpassElement
 * @property {number} id
 * @property {number} lat
 * @property {number} lon
 * @property {"node"|"way"|"relation"} type
 * @property {{ [key: string]: string }} tags
 */

/**
 * @param {number[]} bounds
 */
export function fetchPlaces(bounds, options) {
  const bbox = bounds.map(b => b.toFixed(3)).join(",");
  const sanityLimit = 10000;

  const selectors = Object.entries(options).map(([key, value]) => {
    if (value === true) {
      return `[${key}]`;
    }

    if (Array.isArray(value)) {
      return `[${key}~"^${value.join("|")}$"]`;
    }

    return `[${key}="${value}"]`;

  }).join("");

  if (!selectors) {
    // I'm afraid I can't do that, Dave
    throw new Error("Too many nodes");
  }

  const url = `https://overpass-api.de/api/interpreter?data=[out:json][bbox];node${selectors};out ${sanityLimit};&bbox=${bbox}`;
  return cachedFetch(url);
}

/**
 *
 * @param {number[]} bounds
 * @param {object} options
 * @returns {[ OverpassElement[], Error, boolean ]}
 */
export function useOverpass (bounds, options) {
  const [ data, setData ] = useState([]);
  const [ error, setError ] = useState(null);
  const [ loading, setLoading ] = useState(false);

  useEffect(() => {
    fetchPlaces(bounds, options)
      .then(d => {
        setData(d.elements);
        setError(null);
      }, setError)
      .then(() => setLoading(false));
    setLoading(true);
  }, [bounds, options]);

  return [ data, error, loading ];
}

/*
 * Version 1 Cache
 */
// const cache = {};
// function cachedFetch (url) {
//   if (!cache[url]) {
//     cache[url] = fetch(url).then(r => r.ok ? r.json() : Promise.reject(r.text()));
//   }
//   return cache[url];
// }
/*
 * Version 2 attempts to prevent memory leaks
 */
const cache = [];
const cacheLimit = 10;
function cachedFetch(url) {
  let hit = cache.find(h => h.url === url);

  if (!hit) {
    hit = {
      url,
      result: fetch(url).then(r => r.ok ? r.json() : (r.status === 429 ? Promise.reject("Too many requests. Please wait a minute.") : Promise.reject("Error fetching data"))),
    };

    cache.unshift(hit);
    cache.length = Math.min(cacheLimit, cache.length);
  }

  return hit.result;
}
