import './App.css';
import ReactMapboxGl, { ZoomControl, ScaleControl, GeoJSONLayer } from 'react-mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { generateKML } from './kml';
import { createGeoJSON, createCirclePaint, createLinePaint, makeConnectors } from './geoJSON';
import useSavedState from './useSavedState';

const Map = ReactMapboxGl({
  accessToken:
    'pk.eyJ1IjoiaWptYWNkIiwiYSI6ImNqZ2J6dnNvYjM5Y3QzMnFkYWNybzM2bnkifQ.OE6IZdjeV6XK-NGACNu60g'
});

const centreZoom = getLocalStorageJSON("POPMESH_CENTRE_ZOOM");

/** @type {[number,number]} */
const initialCentre = centreZoom ? centreZoom.slice(0,2) : [-3.667,56.66];
/** @type {[number]} */
const initialZoom = centreZoom ? centreZoom.slice(2) : [7];

function App() {
  const [ places, setPlaces ] = useState([]);
  /** @type {import('react').MutableRefObject<import('mapbox-gl').Map>} */
  const mapRef = useRef(null);

  const [ loadOnScroll, setLoadOnScroll ] = useSavedState("POPMESH_LOAD_ON_SCROLL", false);
  const [ loading, setLoading ] = useState(false);
  const [ error, setError ] = useState(null);
  const [ mapLoaded, setMapLoaded ] = useState(false);

  const [ showT1Nodes, setShowT1Nodes ] = useSavedState("POPMESH_NODES_T1", true, false);
  const [ showT1Vertices, setShowT1Vertices ] = useSavedState("POPMESH_VERTICES_T1", false, false);
  const [ maxT1VertexLength, setMaxT1VertexLength ] = useSavedState("POPMESH_VERTEX_LENGTH_T1", 105000, false);

  const [ showT2Nodes, setShowT2Nodes ] = useSavedState("POPMESH_NODES_T2", true, false);
  const [ showT2Vertices, setShowT2Vertices ] = useSavedState("POPMESH_VERTICES_T2", false, false);
  const [ maxT2VertexLength, setMaxT2VertexLength ] = useSavedState("POPMESH_VERTEX_LENGTH_T2", 80000, false);

  const [ showT3Nodes, setShowT3Nodes ] = useSavedState("POPMESH_NODES_T3", true, false);
  const [ showT3Vertices, setShowT3Vertices ] = useSavedState("POPMESH_VERTICES_T3", false, false);
  const [ maxT3VertexLength, setMaxT3VertexLength ] = useSavedState("POPMESH_VERTEX_LENGTH_T3", 60000, false);

  const [ showT4Nodes, setShowT4Nodes ] = useSavedState("POPMESH_NODES_T4", true, false);
  const [ showT4Vertices, setShowT4Vertices ] = useSavedState("POPMESH_VERTICES_T4", false, false);
  const [ maxT4VertexLength, setMaxT4VertexLength ] = useSavedState("POPMESH_VERTEX_LENGTH_T4", 50000, false);

  const debounced = useDebouncedCallback(loadData, 5000);

  function loadData () {
    if (mapRef.current) {
      fetchPlaces(mapRef.current.getBounds().toArray().flat())
        .then(d => {
          setPlaces(d.elements);
          setError(null);
        }, setError)
        .then(() => setLoading(false));
      setLoading(true);
    }
  }

  const havePlaces = places.length > 0;

  // Need to add callback manually because react-mapbox-gl retains
  // callback from first render.
  useEffect(() => {
    function cb () {
      if (loadOnScroll || !havePlaces) {
        debounced();
      }

      // Use this opportunity to save centre/zoom info
      const centre = mapRef.current.getCenter().toArray();
      const zoom = mapRef.current.getZoom();
      localStorage.setItem("POPMESH_CENTRE_ZOOM", JSON.stringify([ ...centre, zoom]))
    }

    if (mapRef.current) {
      mapRef.current.on("sourcedata", cb);

      return () => {
        mapRef.current.off("sourcedata", cb);
      };
    }
  }, [debounced, loadOnScroll, havePlaces, mapLoaded]);

  function handleSourceData (map) {
    if (!mapRef.current) {
      setMapLoaded(true);
    }

    mapRef.current = map;
  }

  const placesT1 = showT1Nodes ? filterPlaces(places, 100000) : [];
  const connectorsT1 = showT1Vertices ? makeConnectors(placesT1, maxT1VertexLength) : [];
  const geoJSONT1 = createGeoJSON(placesT1, connectorsT1);
  const circlePaintT1 = createCirclePaint(1);
  const linePaintT1 = createLinePaint(1);

  const placesT2 = showT2Nodes ? filterPlaces(places, 50000, 100000) : [];
  const connectorsT2 = showT2Vertices ? makeConnectors([...placesT1, ...placesT2], maxT2VertexLength) : [];
  const geoJSONT2 = createGeoJSON(placesT2, connectorsT2);
  const circlePaintT2 = createCirclePaint(2);
  const linePaintT2 = createLinePaint(2);

  const placesT3 = showT3Nodes ? filterPlaces(places, 10000, 50000) : [];
  const connectorsT3 = showT3Vertices ? makeConnectors([...placesT1, ...placesT2, ...placesT3], maxT3VertexLength) : [];
  const geoJSONT3 = createGeoJSON(placesT3, connectorsT3);
  const circlePaintT3 = createCirclePaint(3);
  const linePaintT3 = createLinePaint(3);

  const placesT4 = showT4Nodes ? filterPlaces(places, 5000, 10000) : [];
  const connectorsT4 = showT4Vertices ? makeConnectors([...placesT1, ...placesT2, ...placesT3, ...placesT4], maxT4VertexLength) : [];
  const geoJSONT4 = createGeoJSON(placesT4, connectorsT4);
  const circlePaintT4 = createCirclePaint(4);
  const linePaintT4 = createLinePaint(4);

  function handleDownload () {
    const layers = [];

    if (showT1Nodes) layers.push({ label: "100k+",      points: placesT1, style: "tier1_places" });
    if (showT2Nodes) layers.push({ label: "50k - 100k", points: placesT2, style: "tier2_places" });
    if (showT3Nodes) layers.push({ label: "10k - 50k",  points: placesT3, style: "tier3_places" });
    if (showT4Nodes) layers.push({ label: "5k - 10k",   points: placesT4, style: "tier4_places" });

    if (showT1Vertices) layers.push({ label: "Connections 100k+",      lines: connectorsT1, style: "tier1_connectors" });
    if (showT2Vertices) layers.push({ label: "Connections 50k - 100k", lines: connectorsT2, style: "tier2_connectors" });
    if (showT3Vertices) layers.push({ label: "Connections 10k - 50k",  lines: connectorsT3, style: "tier3_connectors" });
    if (showT4Vertices) layers.push({ label: "Connections 5k - 10k",   lines: connectorsT4, style: "tier4_connectors" });

    const kml = generateKML(layers);

    downloadFile("places.kml", kml);
  }

  return (
    <div className="App">
      <div className="Panel">
        { error ?
          <p style={{ color: "red" }}>{error.toString()}</p> :
          <p>{ loading ? "Loading…" : <Plural n={places.length} singular="Total Place" /> }</p>
        }
        <label>
          <input type="checkbox" checked={loadOnScroll} onChange={e => setLoadOnScroll(e.target.checked)} />
          Load on pan/zoom
        </label>
        <button onClick={loadData}>Load now</button>
        <h2>100k+</h2>
        <label>
          <input type="checkbox" checked={showT1Nodes} onChange={e => setShowT1Nodes(e.target.checked)} />
          <Plural n={placesT1.length} singular="Place" />
        </label>
        <label>
          <input type="checkbox" checked={showT1Vertices} onChange={e => setShowT1Vertices(e.target.checked)} />
          <Plural n={connectorsT1.length} singular="Connection" />
        </label>
        <label>
          Max Connection Length (km)
          <input type="number" min={0} value={maxT1VertexLength / 1000} onChange={e => setMaxT1VertexLength(e.target.valueAsNumber * 1000)} />
        </label>
        <h2>50k - 100k</h2>
        <label>
          <input type="checkbox" checked={showT2Nodes} onChange={e => setShowT2Nodes(e.target.checked)} />
          <Plural n={placesT2.length} singular="Place" />
        </label>
        <label>
          <input type="checkbox" checked={showT2Vertices} onChange={e => setShowT2Vertices(e.target.checked)} />
          <Plural n={connectorsT2.length} singular="Connection" />
        </label>
        <label>
          Max Connection Length (km)
          <input type="number" min={0} value={maxT2VertexLength / 1000} onChange={e => setMaxT2VertexLength(e.target.valueAsNumber * 1000)} />
        </label>
        <h2>10k - 50k</h2>
        <label>
          <input type="checkbox" checked={showT3Nodes} onChange={e => setShowT3Nodes(e.target.checked)} />
          <Plural n={placesT3.length} singular="Place" />
        </label>
        <label>
          <input type="checkbox" checked={showT3Vertices} onChange={e => setShowT3Vertices(e.target.checked)} />
          <Plural n={connectorsT3.length} singular="Connection" />
        </label>
        <label>
          Max Connection Length (km)
          <input type="number" min={0} value={maxT3VertexLength / 1000} onChange={e => setMaxT3VertexLength(e.target.valueAsNumber * 1000)} />
        </label>
        <h2>5k - 10k</h2>
        <label>
          <input type="checkbox" checked={showT4Nodes} onChange={e => setShowT4Nodes(e.target.checked)} />
          <Plural n={placesT4.length} singular="Place" />
        </label>
        <label>
          <input type="checkbox" checked={showT4Vertices} onChange={e => setShowT4Vertices(e.target.checked)} />
          <Plural n={connectorsT4.length} singular="Connection" />
        </label>
        <label>
          Max Connection Length (km)
          <input type="number" min={0} value={maxT4VertexLength / 1000} onChange={e => setMaxT4VertexLength(e.target.valueAsNumber * 1000)} />
        </label>
        <h2>Download</h2>
        <button onClick={handleDownload}>kml</button>
      </div>
      {/* eslint-disable-next-line */}
      <Map style="mapbox://styles/mapbox/streets-v9"
        containerStyle={{
          height: '100vh',
          width: '100vw'
        }}
        onSourceData={handleSourceData}
        center={initialCentre}
        zoom={initialZoom}
      >
        <GeoJSONLayer data={geoJSONT1} circlePaint={circlePaintT1} linePaint={linePaintT1} />
        <GeoJSONLayer data={geoJSONT2} circlePaint={circlePaintT2} linePaint={linePaintT2} />
        <GeoJSONLayer data={geoJSONT3} circlePaint={circlePaintT3} linePaint={linePaintT3} />
        <GeoJSONLayer data={geoJSONT4} circlePaint={circlePaintT4} linePaint={linePaintT4} />
        <ZoomControl />
        <ScaleControl />
      </Map>
    </div>
  );
}

export default App;

function Plural ({ n, singular, plural = null }) {
  return <>{`${n} ${n === 1 ? singular : (plural || singular + 's')}`}</>;
}

/**
 * @param {import('./geoJSON').OverpassElement[]} places
 * @param {number} minLimit
 * @param {number} [maxLimit]
 */
function filterPlaces(places, minLimit, maxLimit = Infinity) {
  return places.filter(place => minLimit <= +place.tags.population && +place.tags.population < maxLimit);
}

/**
 *
 * @param {Function} callback
 * @param {number} timeout
 * @param {any[]} timeout
 */
function useDebouncedCallback (callback, timeout = 1000) {
  let readyRef = useRef(true);

  return useCallback((...args) => {
    if (readyRef.current) {
      callback(...args);
      readyRef.current = false;
      setTimeout(() => readyRef.current = true, timeout);
    }
  }, [callback, timeout]);
}

/**
 * @param {number[]} bounds
 */
function fetchPlaces (bounds) {
  const bbox = bounds.map(b => b.toFixed(3)).join(",")
  const url = `https://overpass-api.de/api/interpreter?data=[out:json][bbox];(node[population];);out;&bbox=${bbox}`;
  return cachedFetch(url);
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
function cachedFetch (url) {
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

function downloadFile (filename, data) {
  const blob = new Blob([data]);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  });
}

/**
 * @param {string} key
 */
function getLocalStorageJSON (key) {
  const saved = localStorage.getItem(key);

  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }

  return void 0;
}