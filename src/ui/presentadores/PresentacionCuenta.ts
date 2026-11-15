import { CONFIG } from '@/config/Configuracion';
import type { CuentaDto } from '@/core/dto/cuenta/CuentaDto';
import type { PeriodoLiquidacion } from '@/core/dto/cuenta/PeriodoLiquidacion';
import type { EscenarioId } from '@/core/dto/escenario/EscenarioId';
import { Formateador } from '../base/Formateador';

/** Textos y colores con los que se muestra una cuenta remunerada. */
export class PresentacionCuenta {
  private static readonly INGRESO: Readonly<Record<PeriodoLiquidacion, string>> = {
    diario: 'Liquidación diaria',
    mensual: 'Liquidación mensual',
    anual: 'Liquidación anual',
  };

  /**
   * Nombre de la cuenta; si no tiene, el TIN.
   * @param cuenta - Cuenta.
   * @returns Nombre visible.
   */
  public static nombre(cuenta: CuentaDto): string {
    return (
      cuenta.nombre ||
      `Cuenta ${Formateador.porcentaje(cuenta.tin, CONFIG.formato.decimalesPctCorto)}`
    );
  }

  /**
   * Etiqueta del periodo de liquidación.
   * @param periodo - Periodo de ingreso.
   * @returns Texto, p. ej. «Liquidación diaria».
   */
  public static liquidacion(periodo: PeriodoLiquidacion): string {
    return PresentacionCuenta.INGRESO[periodo];
  }

  /**
   * Resumen de la configuración fija de la cuenta.
   * @param cuenta - Cuenta.
   * @returns Texto descriptivo.
   */
  public static describir(cuenta: CuentaDto): string {
    const calculo =
      cuenta.calculo === 'diario'
        ? 'Cálculo diario'
        : `Cálculo ${cuenta.calculo} (${cuenta.metodo === 'cierre' ? 'saldo a cierre' : 'saldo medio'})`;
    return `${calculo} · Ingreso ${cuenta.ingreso}`;
  }

  /**
   * Color por cuenta (tono) y escenario (luminosidad).
   * @param indice - Posición de la cuenta en la lista.
   * @param escenario - Escenario.
   * @returns Color `hsl()`.
   */
  public static color(indice: number, escenario: EscenarioId): string {
    const g = CONFIG.grafico;
    const tono = g.tonos[Math.max(0, indice) % g.tonos.length] ?? 0;
    return `hsl(${tono} ${g.saturacion}% ${g.luz[escenario]}%)`;
  }
}
