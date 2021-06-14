import './App.css';
import ReactMapboxGl, { ZoomControl, ScaleControl } from 'react-mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateKML } from './kml';
import { collapseConurbations, filterPlaces, prepareConnectors } from "./calc";
import useSavedState from './useSavedState';
import { Tier } from './Tier';
import { Plural } from './Plural';
import { TierControls } from './TierControls';

const Map = ReactMapboxGl({
  accessToken:
    'pk.eyJ1IjoiaWptYWNkIiwiYSI6ImNqZ2J6dnNvYjM5Y3QzMnFkYWNybzM2bnkifQ.OE6IZdjeV6XK-NGACNu60g'
});

const centreZoom = getLocalStorageJSON("POPMESH_CENTRE_ZOOM");

/** @type {[number,number]} */
const initialCentre = centreZoom ? centreZoom.slice(0,2) : [-3.667,56.66];
/** @type {[number]} */
const initialZoom = centreZoom ? centreZoom.slice(2) : [7];

const excludeHigherTiers = true;

function App() {
  const [ places, setPlaces ] = useState([]);
  /** @type {import('react').MutableRefObject<import('mapbox-gl').Map>} */
  const mapRef = useRef(null);

  const [ loadOnScroll, setLoadOnScroll ] = useSavedState("POPMESH_LOAD_ON_SCROLL", false);
  const [ loading, setLoading ] = useState(false);
  const [ error, setError ] = useState(null);
  const [ mapLoaded, setMapLoaded ] = useState(false);

  const [ showT1Nodes, setShowT1Nodes ] = useSavedState("POPMESH_NODES_T1", true, false);
  const [ showT1Vertices, setShowT1Vertices ] = useSavedState("POPMESH_VERTICES_T1", true, false);
  const [ maxT1VertexLength, setMaxT1VertexLength ] = useSavedState("POPMESH_VERTEX_LENGTH_T1", 105000, false);

  const [ showT2Nodes, setShowT2Nodes ] = useSavedState("POPMESH_NODES_T2", true, false);
  const [ showT2Vertices, setShowT2Vertices ] = useSavedState("POPMESH_VERTICES_T2", true, false);
  const [ maxT2VertexLength, setMaxT2VertexLength ] = useSavedState("POPMESH_VERTEX_LENGTH_T2", 100000, false);

  const [ showT3Nodes, setShowT3Nodes ] = useSavedState("POPMESH_NODES_T3", true, false);
  const [ showT3Vertices, setShowT3Vertices ] = useSavedState("POPMESH_VERTICES_T3", true, false);
  const [ maxT3VertexLength, setMaxT3VertexLength ] = useSavedState("POPMESH_VERTEX_LENGTH_T3", 95000, false);

  const [ showT4Nodes, setShowT4Nodes ] = useSavedState("POPMESH_NODES_T4", true, false);
  const [ showT4Vertices, setShowT4Vertices ] = useSavedState("POPMESH_VERTICES_T4", false, false);
  const [ maxT4VertexLength, setMaxT4VertexLength ] = useSavedState("POPMESH_VERTEX_LENGTH_T4", 90000, false);

  const [ narrowAngleLimit, setNarrowAngleLimit ] = useSavedState("POPMESH_NARROW_ANGLE", 15, false);
  const [ conurbationCollapse, setConurbationCollapse ] = useSavedState("POPMESH_CONURBATION_COLLAPSE", false, false);

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

  const collapsedPlaces = useMemo(() => {
    if (conurbationCollapse) {
      return collapseConurbations(places, 3500);
    }
    return places;
  }, [conurbationCollapse, places]);

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

  const placesT1 = filterPlaces(collapsedPlaces, 100000);
  let connectorsT1 = showT1Vertices ? prepareConnectors(placesT1, maxT1VertexLength, narrowAngleLimit) : [];

  const placesT2 = filterPlaces(collapsedPlaces, 50000, 100000);
  const cumlPlacesT2 = [...placesT1, ...placesT2];
  const excludeConnectionsT2 = excludeHigherTiers ? connectorsT1 : [];
  let connectorsT2 = showT2Vertices ? prepareConnectors(cumlPlacesT2, maxT2VertexLength, narrowAngleLimit, excludeConnectionsT2) : [];

  const placesT3 = filterPlaces(collapsedPlaces, 10000, 50000);
  const cumlPlacesT3 = [...placesT1, ...placesT2, ...placesT3];
  const excludeConnectionsT3 = excludeHigherTiers ? [...connectorsT1, ...connectorsT2] : [];
  let connectorsT3 = showT3Vertices ? prepareConnectors(cumlPlacesT3, maxT3VertexLength, narrowAngleLimit, excludeConnectionsT3) : [];

  const placesT4 = filterPlaces(collapsedPlaces, 5000, 10000);
  const cumlPlacesT4 = [...placesT1, ...placesT2, ...placesT3, ...placesT4];
  const excludeConnectionsT4 = excludeHigherTiers ? [...connectorsT1, ...connectorsT2, ...connectorsT3] : [];
  let connectorsT4 = showT4Vertices ? prepareConnectors(cumlPlacesT4, maxT4VertexLength, narrowAngleLimit, excludeConnectionsT4) : [];

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
          ( loading ?
            <p>Loading…</p> :
            <>
              <p><Plural n={places.length} singular="Total Place" /></p>
              { places.length !== collapsedPlaces.length && <p><Plural n={collapsedPlaces.length} singular="Conurbation" /></p> }
            </>
          )
        }
        <label>
          <input type="checkbox" checked={loadOnScroll} onChange={e => setLoadOnScroll(e.target.checked)} />
          Load on pan/zoom
        </label>
        <button onClick={loadData}>Load now</button>

        <TierControls
          label="100k+"
          places={placesT1}
          connectors={connectorsT1}
          showNodes={showT1Nodes}
          setShowNodes={setShowT1Nodes}
          showVertices={showT1Vertices}
          setShowVertices={setShowT1Vertices}
          maxVertexLength={maxT1VertexLength}
          setMaxVertexLength={setMaxT1VertexLength}
        />

        <TierControls
          label="50k - 100k"
          places={placesT2}
          connectors={connectorsT2}
          showNodes={showT2Nodes}
          setShowNodes={setShowT2Nodes}
          showVertices={showT2Vertices}
          setShowVertices={setShowT2Vertices}
          maxVertexLength={maxT2VertexLength}
          setMaxVertexLength={setMaxT2VertexLength}
        />

        <TierControls
          label="10k - 50k"
          places={placesT3}
          connectors={connectorsT3}
          showNodes={showT3Nodes}
          setShowNodes={setShowT3Nodes}
          showVertices={showT3Vertices}
          setShowVertices={setShowT3Vertices}
          maxVertexLength={maxT3VertexLength}
          setMaxVertexLength={setMaxT3VertexLength}
        />

        <TierControls
          label="5k - 10k"
          places={placesT4}
          connectors={connectorsT4}
          showNodes={showT4Nodes}
          setShowNodes={setShowT4Nodes}
          showVertices={showT4Vertices}
          setShowVertices={setShowT4Vertices}
          maxVertexLength={maxT4VertexLength}
          setMaxVertexLength={setMaxT4VertexLength}
        />

        <h2>Options</h2>
        <label>
          Narrow Angle Limit {' '}
          <input type="number" min={0} max={180} value={narrowAngleLimit} onChange={e => setNarrowAngleLimit(e.target.valueAsNumber)} />{' '}
          (degrees)
        </label>
        <label>
          Collapse Conurbations{' '}
          <input type="checkbox" checked={conurbationCollapse} onChange={e => setConurbationCollapse(e.target.checked)} />
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
        <Tier places={showT4Nodes ? placesT4 : []} connectors={connectorsT4} tier={4} />
        <Tier places={showT3Nodes ? placesT3 : []} connectors={connectorsT3} tier={3} />
        <Tier places={showT2Nodes ? placesT2 : []} connectors={connectorsT2} tier={2} />
        <Tier places={showT1Nodes ? placesT1 : []} connectors={connectorsT1} tier={1} />
        <ZoomControl />
        <ScaleControl />
      </Map>
    </div>
  );
}

export default App;

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
  const url = `https://overpass-api.de/api/interpreter?data=[out:json][bbox];node[population][place~"^city|town|village$"];out;&bbox=${bbox}`;
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