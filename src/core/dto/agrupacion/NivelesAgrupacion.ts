import type { NivelAgrupacion } from './NivelAgrupacion';

/** Catálogo de niveles de agrupación en orden de presentación. */
export class NivelesAgrupacion {
  /** Niveles disponibles. */
  public static readonly TODOS: readonly NivelAgrupacion[] = [
    'dia',
    'quincena',
    'mes',
    'trimestre',
    'semestre',
    'anio',
  ];
}
