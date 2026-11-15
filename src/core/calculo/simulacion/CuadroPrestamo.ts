import type { CuotaPrestamoDto } from '@/core/dto/resultado/CuotaPrestamoDto';
import { Redondeo } from '../comun/Redondeo';

/** Cuadro de amortización del préstamo francés (cuota constante; la última ajusta el residuo). */
export class CuadroPrestamo {
  /** Una cuota por mes. */
  public readonly cuotas: readonly CuotaPrestamoDto[];

  /**
   * @param principal - Capital prestado en €.
   * @param tin - TIN anual en %.
   * @param meses - Número de cuotas mensuales.
   */
  public constructor(principal: number, tin: number, meses: number) {
    this.cuotas = CuadroPrestamo.calcular(principal, tin, meses);
  }

  private static calcular(principal: number, tin: number, meses: number): CuotaPrestamoDto[] {
    const tipo = tin / 1200;
    const nominal =
      principal === 0
        ? 0
        : tipo === 0
          ? principal / meses
          : (principal * tipo) / (1 - (1 + tipo) ** -meses);
    let deuda = Redondeo.aCentimos(principal);
    return Array.from({ length: meses }, (_, i): CuotaPrestamoDto => {
      const interest = Redondeo.aCentimos(deuda * tipo);
      const amount =
        i === meses - 1 ? Redondeo.aCentimos(deuda + interest) : Redondeo.aCentimos(nominal);
      const amortization = Redondeo.aCentimos(amount - interest);
      deuda = Redondeo.aCentimos(Math.max(0, deuda - amortization));
      return { amount, interest, amortization, debt: deuda };
    });
  }
}
