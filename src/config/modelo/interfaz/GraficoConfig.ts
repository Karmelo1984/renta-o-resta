import type { EscenarioId } from '@/core/dto/escenario/EscenarioId';
import type { PeriodoLiquidacion } from '@/core/dto/cuenta/PeriodoLiquidacion';
import type { ColoresGraficoConfig } from './ColoresGraficoConfig';
import type { EtiquetasXConfig } from './EtiquetasXConfig';
import type { MargenGraficoConfig } from './MargenGraficoConfig';

/** Parámetros de dibujo de los gráficos. */
export interface GraficoConfig {
  /** Tono HSL por cuenta. */
  readonly tonos: readonly number[];
  readonly saturacion: number;
  /** Luminosidad por escenario. */
  readonly luz: Readonly<Record<EscenarioId, number>>;
  /** Patrón de trazo por periodo de ingreso. */
  readonly trazo: Readonly<Record<PeriodoLiquidacion, readonly number[]>>;
  readonly guia: readonly number[];
  readonly grosor: number;
  readonly radioPunto: number;
  readonly ratioMax: number;
  readonly anchoMovil: number;
  readonly minLado: number;
  readonly margen: MargenGraficoConfig;
  readonly divisionesY: number;
  readonly etiquetasX: EtiquetasXConfig;
  readonly holguraInf: number;
  readonly holguraSup: number;
  readonly spanMin: number;
  readonly colores: ColoresGraficoConfig;
}
