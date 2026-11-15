/** Registro de un día simulado. */
export interface DiaSimuladoDto {
  readonly mes: number;
  readonly dia: number;
  /** Saldo al empezar el día. */
  readonly inicio: number;
  readonly aportes: number;
  readonly bruto: number;
  readonly retencion: number;
  readonly neto: number;
  readonly cuota: number;
  readonly interesPrestamo: number;
  readonly amortizacion: number;
  readonly deuda: number;
  readonly saldo: number;
  /** Interés bruto devengado pendiente de abono. */
  readonly pendiente: number;
}
