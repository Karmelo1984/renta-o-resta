import type { MesesBloqueConfig } from './MesesBloqueConfig';

/** Parámetros de agrupación del detalle. */
export interface AgrupacionConfig {
  /** Último día de la primera quincena. */
  readonly diaQuincena: number;
  readonly mesesBloque: MesesBloqueConfig;
}
