import type { EscenarioId } from '../escenario/EscenarioId';
import type { ResultadoSimulacionDto } from './ResultadoSimulacionDto';

/** Resultados de los tres escenarios para una cuenta. */
export type ResultadosCuentaDto = Readonly<Record<EscenarioId, ResultadoSimulacionDto>>;
