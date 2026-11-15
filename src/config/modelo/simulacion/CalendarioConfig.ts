import type { ModoCalendario } from '@/core/dto/calendario/ModoCalendario';

/** Constantes del calendario financiero. */
export interface CalendarioConfig {
  readonly diasMes: number;
  readonly diasAnio: number;
  readonly diasAnioReal: number;
  readonly diasAnioBisiesto: number;
  readonly mesesAnio: number;
  readonly aniosAdelante: number;
  /** Modo de cálculo por defecto. */
  readonly modo: ModoCalendario;
  /** Mes de inicio (1–12); `null` = mes actual. */
  readonly mesInicio: number | null;
  /** Año de inicio; `null` = año actual. */
  readonly anioInicio: number | null;
  readonly mesesCorto: readonly string[];
  readonly mesesLargo: readonly string[];
}
