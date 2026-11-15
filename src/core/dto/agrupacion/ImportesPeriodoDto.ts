/** Importes agregados de un periodo. */
export interface ImportesPeriodoDto {
  readonly inicio: number;
  readonly aportes: number;
  readonly neto: number;
  readonly retencion: number;
  readonly bruto: number;
  readonly cuota: number;
  readonly interesPrestamo: number;
  readonly amortizacion: number;
  readonly deuda: number;
  readonly saldo: number;
  readonly patrimonio: number;
}
