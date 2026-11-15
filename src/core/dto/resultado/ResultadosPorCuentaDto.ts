import type { ResultadosCuentaDto } from './ResultadosCuentaDto';

/** Resultados de todas las cuentas, por id de cuenta. */
export type ResultadosPorCuentaDto = Readonly<Record<string, ResultadosCuentaDto>>;
