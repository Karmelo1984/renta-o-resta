import type { ModoCalendario } from './ModoCalendario';

/** Datos mínimos para construir el calendario. */
export interface ParametrosCalendarioDto {
  readonly calendario: ModoCalendario;
  /** Mes de inicio `YYYY-MM` (solo calendario real). */
  readonly inicio: string;
}
