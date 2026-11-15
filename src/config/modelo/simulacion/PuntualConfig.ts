/** Límites de las aportaciones puntuales. */
export interface PuntualConfig {
  /** Importe máximo por mes. */
  readonly max: number;
  /** Paso de los botones ±. */
  readonly step: number;
}
