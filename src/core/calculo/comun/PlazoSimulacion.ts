import { CONFIG } from '@/config/Configuracion';
import type { CuentaDto } from '@/core/dto/cuenta/CuentaDto';
import { Logger } from '@/core/log/Logger';

/** Reglas del plazo: debe ser múltiplo del periodo de ingreso/cálculo más largo. */
export class PlazoSimulacion {
  private static readonly log = new Logger('plazo');

  /** Rango de frecuencia de un periodo: cuanto mayor, menos frecuente. */
  public static readonly RANGO = { diario: 0, mensual: 1, anual: 2 } as const;

  /**
   * Paso del plazo: el periodo de ingreso o cálculo más largo de las cuentas.
   * @param cuentas - Cuentas remuneradas.
   * @returns 12 si alguna es anual; si no, 1.
   */
  public static pasoMeses(cuentas: readonly Pick<CuentaDto, 'ingreso' | 'calculo'>[]): number {
    return cuentas.some((a) => a.ingreso === 'anual' || a.calculo === 'anual')
      ? CONFIG.calendario.mesesAnio
      : 1;
  }

  /**
   * Menor plazo válido mayor o igual que `meses` y múltiplo de `paso`, acotado al máximo.
   * @param meses - Plazo deseado.
   * @param paso - Múltiplo exigido.
   * @returns Plazo ajustado.
   */
  public static ajustar(meses: number, paso: number): number {
    const ajustado = Math.min(CONFIG.campos.meses.max, Math.ceil(meses / paso) * paso);
    if (ajustado !== meses) PlazoSimulacion.log.debug('Plazo ajustado', { meses, paso, ajustado });
    return ajustado;
  }
}
