import React from "react";
import { Plural } from "./Plural";

export function TierControls ({ label, places, connectors, showNodes, setShowNodes, showVertices, setShowVertices, maxVertexLength, setMaxVertexLength, showShapes, setShowShapes }) {
    return <>
        <h2>{ label }</h2>
        <label>
          <input type="checkbox" checked={showNodes} onChange={e => setShowNodes(e.target.checked)} />
          <Plural n={places.length} singular="Place" />
        </label>
        { setShowShapes &&
          <label>
            <input type="checkbox" checked={showShapes} onChange={e => setShowShapes(e.target.checked)} />
            Show Built up Areas
          </label>
        }
        <label>
          <input type="checkbox" checked={showVertices} onChange={e => setShowVertices(e.target.checked)} />
          <Plural n={connectors.length} singular="Connection" />
        </label>
        <label>
          Max Connection Length (km)
          <input type="number" min={0} value={maxVertexLength / 1000} onChange={e => setMaxVertexLength(e.target.valueAsNumber * 1000)} />
        </label>
    </>;
}