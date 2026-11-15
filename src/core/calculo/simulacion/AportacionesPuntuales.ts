import type { EstadoSimulacionDto } from '@/core/dto/estado/EstadoSimulacionDto';
import { Logger } from '@/core/log/Logger';

/** Consultas sobre las aportaciones puntuales de un estado. */
export class AportacionesPuntuales {
  private static readonly log = new Logger('puntuales');

  /**
   * Aportaciones dentro del plazo (el motor ignora el resto).
   * @param estado - Estado de la simulación.
   * @returns Pares `[mes, importe]` con importe positivo.
   */
  public static dentroDelPlazo(estado: EstadoSimulacionDto): [string, number][] {
    return Object.entries(estado.puntualesB).filter(([m, a]) => Number(m) <= estado.meses && a > 0);
  }

  /**
   * Suma de las aportaciones puntuales dentro del plazo.
   * @param estado - Estado de la simulación.
   * @returns Total en €.
   */
  public static total(estado: EstadoSimulacionDto): number {
    const dentro = AportacionesPuntuales.dentroDelPlazo(estado);
    const total = dentro.reduce((t, [, a]) => t + a, 0);
    AportacionesPuntuales.log.debug('Total de aportaciones puntuales', {
      dentroDelPlazo: dentro.length,
      total,
    });
    return total;
  }
}
