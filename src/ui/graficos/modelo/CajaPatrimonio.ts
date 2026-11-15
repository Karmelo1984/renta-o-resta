import type { CajaTrazado } from './CajaTrazado';
import type { SeriesPatrimonioDto } from './SeriesPatrimonioDto';

/** Estado del último dibujado del gráfico de patrimonio. */
export interface CajaPatrimonio extends CajaTrazado {
  readonly series: SeriesPatrimonioDto;
  /** Índice → coordenada horizontal. */
  readonly X: (i: number) => number;
  /** Clave de serie → nombre visible. */
  readonly nombres: Readonly<Record<string, string>>;
}
