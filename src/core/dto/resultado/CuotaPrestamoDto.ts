/** Una cuota del cuadro de amortización. */
export interface CuotaPrestamoDto {
  /** Importe total de la cuota. */
  readonly amount: number;
  /** Intereses de la cuota. */
  readonly interest: number;
  /** Capital amortizado en la cuota. */
  readonly amortization: number;
  /** Capital pendiente tras la cuota. */
  readonly debt: number;
}
