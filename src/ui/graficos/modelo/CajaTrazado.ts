/** Geometría mínima para localizar el punto más cercano al puntero. */
export interface CajaTrazado {
  readonly left: number;
  readonly pw: number;
  /** Número de puntos de la serie. */
  readonly n: number;
}
