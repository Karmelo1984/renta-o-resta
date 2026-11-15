import type { ValorLog } from './ValorLog';

/** Datos estructurados que acompañan a un mensaje. */
export type DatosLog = Readonly<Record<string, ValorLog>>;
