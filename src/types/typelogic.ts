
/**
 * Provided an object type, this represents the union of its properties' values.
 */
export type ValueOf<T> = T[keyof T];