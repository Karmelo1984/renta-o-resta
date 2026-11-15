import { CONFIG } from '@/config/Configuracion';
import type { EstadoSimulacionDto } from '@/core/dto/estado/EstadoSimulacionDto';
import { Logger } from '@/core/log/Logger';

/** Fábrica del estado inicial de la simulación. */
export class FabricaEstado {
  private static readonly log = new Logger('estado');

  /**
   * Mes de inicio por defecto.
   * @param ahora - Fecha de referencia.
   * @returns `YYYY-MM`.
   */
  public static mesInicio(ahora: Date = new Date()): string {
    const { anioInicio, mesInicio } = CONFIG.calendario;
    const mes = String(mesInicio ?? ahora.getMonth() + 1).padStart(2, '0');
    return `${anioInicio ?? ahora.getFullYear()}-${mes}`;
  }

  /**
   * Rango de años permitido para el inicio.
   * @param ahora - Fecha de referencia.
   * @returns Año actual y año actual más `aniosAdelante`.
   */
  public static rangoAnios(ahora: Date = new Date()): readonly [number, number] {
    const anio = ahora.getFullYear();
    return [anio, anio + CONFIG.calendario.aniosAdelante];
  }

  /**
   * Crea un estado nuevo con los valores por defecto (copia independiente).
   * @param ahora - Fecha de referencia para el mes de inicio.
   * @returns Estado de simulación inicial.
   */
  public static crearInicial(ahora: Date = new Date()): EstadoSimulacionDto {
    const { campos, cuentas, calendario } = CONFIG;
    const estado: EstadoSimulacionDto = {
      capital: campos.capital.valor,
      prestamo: campos.prestamo.valor,
      tinPrestamo: campos.tinPrestamo.valor,
      meses: campos.meses.valor,
      retencion: campos.retencion.valor,
      periodicaB: campos.periodicaB.valor,
      cuentas: cuentas.lista.map((cuenta) => ({ ...cuenta })),
      puntualesB: {},
      calendario: calendario.modo,
      inicio: FabricaEstado.mesInicio(ahora),
    };
    FabricaEstado.log.debug('Estado inicial creado', {
      capital: estado.capital,
      prestamo: estado.prestamo,
      meses: estado.meses,
      cuentas: estado.cuentas.length,
      inicio: estado.inicio,
    });
    return estado;
  }
}
