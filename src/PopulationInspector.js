import { tierColours } from "./geoJSON";
import { useOverpass } from "./overpass";
import { useFetch } from "./useFetch";

const overpassOptions = {
    place: ["city","town","village"],
};

/**
 * @param {object} props
 * @param {number[]} props.bounds
 */
export function PopulationInspector ({ bounds }) {
    const [ data, error, loading ] = useOverpass(bounds, overpassOptions);

    data.sort(placeTypeComparator);

    /** @type {import("react").CSSProperties} */
    const modalStyle = {
        backgroundColor: "white",
        width: "80%",
        position: "fixed",
        height: "90%",
        top: "5%",
        left: "10%",
        borderRadius: 30,
        padding: 20,
        boxSizing: "border-box",
        boxShadow: "-10px -10px 60px rgba(0,0,0,0.6), 15px 15px 20px rgba(0,0,0,0.6)",
        display: "flex",
        flexDirection: "column",
    }

    /** @type {import("react").CSSProperties} */
    const scrollContainerStyle = {
        flex: 1,
        overflowY: "auto",
    };

    return (
        <section style={modalStyle}>
            <h1>Population Inspector</h1>
            { loading && <p>Loading…</p> }
            { error && <p style={{color:"red"}}>{error.toString()}</p> }
            { data.length > 0 &&
                <div style={scrollContainerStyle}>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Population</th>
                                <th>Links</th>
                                <th>Wikidata</th>
                                <th>Wikipedia</th>
                            </tr>
                        </thead>
                        <tbody>
                            { data.map(place => (
                                <tr key={place.id}>
                                    <td>{place.tags.name}</td>
                                    <td>{place.tags.place}</td>
                                    <td>
                                        <PopulationIndicator population={+place.tags.population||0} />
                                        {place.tags.population||""}
                                    </td>
                                    <td>
                                        <a href={`https://www.openstreetmap.org/#map=12/${place.lat}/${place.lon}`} target="_blank" rel="noreferrer">Map</a>{' '}
                                        <a href={`https://www.openstreetmap.org/edit#map=20/${place.lat}/${place.lon}`} target="_blank" rel="noreferrer">Edit</a>{' '}
                                        <a href={`https://www.openstreetmap.org/node/${place.id}`} target="_blank" rel="noreferrer">View</a>{' '}
                                        <a href={`https://en.wikipedia.org/wiki/${place.tags.name}`} target="_blank" rel="noreferrer">Wikipedia</a>{' '}
                                        { place.tags.wikidata && <a href={`https://www.wikidata.org/wiki/${place.tags.wikidata}`} target="_blank" rel="noreferrer">Wikidata</a> }
                                    </td>
                                    <td>
                                        { !place.tags.population && place.tags.wikidata && <WikiData id={place.tags.wikidata} claim={WIKIDATA_CLAIMS.population} /> }
                                    </td>
                                    <td>
                                        { !place.tags.population && <WikipediaPopulation name={place.tags.wikipedia?.replace(/[a-z]+:/, "") || place.tags.name} /> }
                                    </td>
                                </tr>
                            )) }
                        </tbody>
                    </table>
                </div>
            }
        </section>
    )
}

/**
 * @typedef {import("./overpass").OverpassElement} OverpassElement
 */

/**
 * @param {OverpassElement} a
 * @param {OverpassElement} b
 */
function placeTypeComparator (a, b) {
    const result = {
        city:       { city: 0, town: -1, village: -1 },
        town:       { city: 1, town:  0, village: -1 },
        village:    { city: 1, town:  1, village:  0 },
    }[a.tags.place][b.tags.place];

    if (result === 0) {
        return a.tags.name.localeCompare(b.tags.name);
    }

    return result;
}

/**
 *
 * @param {object} props
 * @param {number} props.population
 * @returns
 */
function PopulationIndicator ({ population }) {
    let size, colour;

    if (population > 100000) {
        size = 12;
        colour = tierColours[0];
    } else if (population > 50000) {
        size = 6;
        colour = tierColours[1];
    } else if (population > 10000) {
        size = 4;
        colour = tierColours[2];
    } else if (population > 5000) {
        size = 3;
        colour = tierColours[3];
    }

    return (
        <svg width={24} height={24} viewBox="-12 -12 24 24" style={{verticalAlign: "text-top"}}>
            <circle r={size} fill={colour} />
        </svg>
    );
}

function WikipediaPopulation ({ name }) {
    const [ data, error, loading ] = useFetch(`https://en.wikipedia.org/api/rest_v1/page/html/${name}`);

    if (error) {
        return <span style={{color:"red"}}>{error.message}</span>;
    }

    if (loading) {
        return <span>Loading…</span>;
    }

    if (data) {
        const p = new DOMParser();
        const d = p.parseFromString(data, "text/html");
        const infobox = d.querySelector("[data-mw*=population_ref]");

        if (!infobox) {
            return null;
        }

        try {
            // @ts-ignore
            const template = JSON.parse(infobox.dataset.mw);
            const params = template.parts[0].template.params;

            const ref = sanitiseRef(params.population_ref?.wt);

            return <p>{params.population.wt} {params.population_ref?.wt.includes("Parish") && <span style={{color:"#FF0000",fontSize:"0.8em"}}>Parish</span> } <span style={{color:"#666",fontSize:"0.8em"}}>{ref}</span></p>;
        } catch (e) {
            console.error(e);
            return <p style={{color:"red"}}>Error parsing</p>;
        }
    }

    return <p style={{color:"red"}}>Shouldn't be here</p>;
}

function sanitiseRef(ref) {
    const match = /\[\[([^[\]]+)\]\]/.exec(ref);
    if (match) {
        return match[1].split("|")[0];
    }
    return ref.replace(/<.*>/, "").replace(/\[\[.*\]\]/, "").replace(/^\(|\)$/g, "");
}

const WIKIDATA_CLAIMS = {
    pointInTime: "P585",
    population: "P1082",
};

function WikiData ({ id, claim }) {
    const [ data, error, loading ] = useFetch(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`);

    if (error) {
        return <span style={{color:"red"}}>{error.message}</span>;
    }

    if (loading) {
        return <span>Loading…</span>;
    }

    if (data) {
        try {
            const claims = data.entities[id].claims[claim];

            if (claims) {
                claims.sort(claimComparatorDesc);

                const value = +claims[0].mainsnak.datavalue.value.amount;

                return <span>{value}</span>;
            }

            return null;
        } catch (e) {
            return <span style={{color:"red"}}>{e.message}</span>;
        }
    }

    return <span style={{color:"red"}}>Shouldn't be here!?</span>;
}

function claimComparatorDesc (a, b) {
    const dateA = a.qualifiers[WIKIDATA_CLAIMS.pointInTime]?.[0].datavalue.value.time;
    const dateB = b.qualifiers[WIKIDATA_CLAIMS.pointInTime]?.[0].datavalue.value.time;

    return -String(dateA).localeCompare(dateB);
}