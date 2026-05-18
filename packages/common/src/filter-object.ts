/**
 * Create a new object which has a subset of keys.
 * 
 * @param object 
 * @param props 
 * @returns 
 */
export function filterObject<T extends object>(object : T, props : string[]): Partial<T> {
    return props.reduce((o, p) => (p in object ? o[p] = object[p] : undefined, o), {});
}