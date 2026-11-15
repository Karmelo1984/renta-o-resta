import type { DiaSimuladoDto } from '@/core/dto/resultado/DiaSimuladoDto';

/** Texto y función de clave de un nivel de agrupación. */
export interface NivelInfo {
  readonly label: string;
  /** Clave que cambia cuando el día pertenece a otro grupo. */
  readonly clave: (dia: DiaSimuladoDto) => number;
}
