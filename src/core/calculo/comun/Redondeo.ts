/** Redondeo monetario compartido por todo el motor. */
export class Redondeo {
  /**
   * Redondea a 2 decimales (céntimos) con corrección de épsilon.
   * @param valor - Importe en €.
   * @returns Importe redondeado a céntimos.
   */
  public static aCentimos(valor: number): number {
    return Math.round((valor + Math.sign(valor || 1) * Number.EPSILON) * 100) / 100;
  }
}
