import { useEffect, useState } from "react";

/**
 *
 * @param {RequestInfo} input
 * @param {RequestInit} [init]
 * @returns {[ any, Error, boolean ]}
 */

export function useFetch(input, init = undefined) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch(input, init)
            .then(r => r.ok ? (r.headers.get("Content-Type").includes("application/json") ? r.json() : r.text()) : Promise.reject("Error fetching data"))
            .then(d => {
                setData(d);
                setError(null);
            }, setError)
            .then(() => setLoading(false));
        setLoading(true);
    }, [input, init]);

    return [data, error, loading];
}
