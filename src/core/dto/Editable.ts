/** Versión escribible de un tipo `readonly` (para objetos en construcción). */
export type Editable<T> = { -readonly [K in keyof T]: T[K] };
