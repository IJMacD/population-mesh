import { useCallback, useEffect, useState } from "react";

/**
 *
 * @template T
 * @param {string} key
 * @param {T|(() => T)} defaultValue
 * @param {boolean} [tabSync] Keep all open tabs in sync
 * @returns {[T, (newValue: T) => void]}
 */
export default function useSavedState (key, defaultValue, tabSync = true) {
    const [ state, setState ] = useState(() => {
        const savedValue = localStorage.getItem(key);

        if (savedValue) {
            try {
                return JSON.parse(savedValue);
            } catch (e) {}
        }

        if (defaultValue instanceof Function) {
            return defaultValue();
        }

        return defaultValue;
    });

    useEffect(() => {
        if (tabSync) {
            const cb = (/** @type {StorageEvent} */ e) => {
                if (e.key === key) {
                    try {
                        setState(JSON.parse(e.newValue));
                    } catch (e) {}
                }
            };

            window.addEventListener("storage", cb);

            return () => window.removeEventListener("storage", cb);
        }
    }, [key, tabSync]);

    const updateValue = useCallback((newValue) => {
        setState(newValue);

        localStorage.setItem(key, JSON.stringify(newValue));
    }, [setState, key]);

    return [
        state,
        updateValue,
    ];
}