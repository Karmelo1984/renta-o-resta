import type { EtiquetaPeriodoDto } from './EtiquetaPeriodoDto';
import type { ImportesPeriodoDto } from './ImportesPeriodoDto';

/** Fila agrupada: importes más etiqueta del periodo. */
export interface FilaAgrupadaDto extends ImportesPeriodoDto, EtiquetaPeriodoDto {}
