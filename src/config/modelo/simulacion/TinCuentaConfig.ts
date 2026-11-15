/** Límites y valor inicial del TIN de una cuenta remunerada. */
export interface TinCuentaConfig {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly rangeMax: number;
  readonly valor: number;
}
