import type { DatosLog } from './DatosLog';
import type { NivelLog } from './NivelLog';

const ORDEN: Readonly<Record<NivelLog, number>> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/**
 * Logger básico con nivel global.
 *
 * El nivel por defecto es `debug` en desarrollo y `warn` en producción
 * (según `import.meta.env.DEV`). Es el único punto del proyecto que escribe en la consola.
 *
 * @example
 * ```ts
 * const log = new Logger('calculos');
 * log.debug('Simulación iniciada', { meses: 12 });
 * ```
 */
export class Logger {
  private static nivelGlobal: NivelLog = import.meta.env.DEV ? 'debug' : 'warn';

  /**
   * @param ambito - Nombre del módulo que registra; se antepone a cada mensaje.
   */
  public constructor(private readonly ambito: string) {}

  /**
   * Cambia el nivel mínimo de todos los loggers.
   * @param nivel - Nuevo nivel mínimo.
   */
  public static establecerNivel(nivel: NivelLog): void {
    Logger.nivelGlobal = nivel;
  }

  /**
   * Nivel mínimo vigente.
   * @returns Nivel global actual.
   */
  public static obtenerNivel(): NivelLog {
    return Logger.nivelGlobal;
  }

  /**
   * Indica si un nivel se registraría con la configuración actual.
   * @param nivel - Nivel a comprobar.
   * @returns `true` si el nivel está habilitado.
   */
  public static habilitado(nivel: Exclude<NivelLog, 'silent'>): boolean {
    return ORDEN[nivel] >= ORDEN[Logger.nivelGlobal];
  }

  /**
   * Registra un mensaje de depuración (trazas de cálculo).
   * @param mensaje - Texto del mensaje.
   * @param datos - Contexto opcional.
   */
  public debug(mensaje: string, datos?: DatosLog): void {
    if (Logger.habilitado('debug')) console.debug(...this.formatear(mensaje, datos));
  }

  /**
   * Registra un mensaje informativo.
   * @param mensaje - Texto del mensaje.
   * @param datos - Contexto opcional.
   */
  public info(mensaje: string, datos?: DatosLog): void {
    if (Logger.habilitado('info')) console.info(...this.formatear(mensaje, datos));
  }

  /**
   * Registra una advertencia.
   * @param mensaje - Texto del mensaje.
   * @param datos - Contexto opcional.
   */
  public warn(mensaje: string, datos?: DatosLog): void {
    if (Logger.habilitado('warn')) console.warn(...this.formatear(mensaje, datos));
  }

  /**
   * Registra un error.
   * @param mensaje - Texto del mensaje.
   * @param datos - Contexto opcional.
   */
  public error(mensaje: string, datos?: DatosLog): void {
    if (Logger.habilitado('error')) console.error(...this.formatear(mensaje, datos));
  }

  private formatear(mensaje: string, datos?: DatosLog): [string] | [string, DatosLog] {
    const texto = `[${this.ambito}] ${mensaje}`;
    return datos ? [texto, datos] : [texto];
  }
}
