import type { ResumenMensualDto } from '@/core/dto/resultado/ResumenMensualDto';

/** Definición de una serie del gráfico de intereses. */
export interface SerieInteres {
  readonly k: keyof Pick<ResumenMensualDto, 'netoAbonado' | 'interesPrestamo'>;
  readonly label: string;
  readonly color: string;
}
