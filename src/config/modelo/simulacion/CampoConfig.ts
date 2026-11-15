/** Límites y valor inicial de un campo numérico del formulario. */
export interface CampoConfig {
  /** Valor inicial. */
  readonly valor: number;
  /** Mínimo admitido. */
  readonly min: number;
  /** Máximo admitido. */
  readonly max: number;
  /** Paso de los botones ± y del deslizador. */
  readonly step: number;
  /** Máximo visible del deslizador (puede ser menor que `max`). */
  readonly rangeMax: number;
}
