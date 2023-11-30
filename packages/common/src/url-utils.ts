
/**
 * Create a query string from the given set of key/value pairs. 
 * Unlike using `new URLSearchParams({ ... })` directly, parameters with 
 * undefined values are excluded.
 * @param query 
 */
export function buildQuery(query: Record<string, any>) {
    let params = new URLSearchParams();
    for (let [ key, value ] of Object.entries(query)) {
        if (value === undefined)
            continue;

        params.append(key, value);
    }

    return params.toString();
}