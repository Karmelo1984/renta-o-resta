import type { FilaAgrupadaDto } from './FilaAgrupadaDto';

/** Resultado de agrupar un escenario. */
export interface AgrupacionDto {
  readonly periodos: readonly FilaAgrupadaDto[];
  readonly total: FilaAgrupadaDto;
}
