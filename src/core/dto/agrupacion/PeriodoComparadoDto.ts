import type { EscenarioId } from '../escenario/EscenarioId';
import type { FilaAgrupadaDto } from './FilaAgrupadaDto';

/** Un periodo con los tres escenarios; la etiqueta viaja en A. */
export type PeriodoComparadoDto = Readonly<Record<EscenarioId, FilaAgrupadaDto>>;
