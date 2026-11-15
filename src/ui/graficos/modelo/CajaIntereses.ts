import type { ResumenMensualDto } from '@/core/dto/resultado/ResumenMensualDto';
import type { CajaTrazado } from './CajaTrazado';

/** Estado del último dibujado del gráfico de intereses. */
export interface CajaIntereses extends CajaTrazado {
  readonly rows: readonly ResumenMensualDto[];
  readonly X: (i: number) => number;
}
