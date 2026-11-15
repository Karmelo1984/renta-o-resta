/** Formato numérico y umbral de cero. */
export interface FormatoConfig {
  readonly locale: string;
  readonly moneda: string;
  readonly decimales: number;
  readonly decimalesPct: number;
  readonly decimalesPctCorto: number;
  /** Por debajo de este valor un importe se considera 0. */
  readonly cero: number;
  readonly compactoDecimales: number;
}
