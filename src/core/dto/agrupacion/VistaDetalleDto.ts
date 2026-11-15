import type { PeriodoComparadoDto } from './PeriodoComparadoDto';

/** Vista comparada del detalle: un periodo por fila con A, B y C. */
export interface VistaDetalleDto {
  readonly periodos: readonly PeriodoComparadoDto[];
  readonly total: PeriodoComparadoDto;
}
