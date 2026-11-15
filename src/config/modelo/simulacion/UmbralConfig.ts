/** Parámetros de la búsqueda binaria del TIN máximo rentable. */
export interface UmbralConfig {
  readonly min: number;
  readonly max: number;
  readonly iteraciones: number;
  readonly tolerancia: number;
}
