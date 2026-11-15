import type { DiaSimuladoDto } from './DiaSimuladoDto';
import type { PuntoPatrimonioDto } from './PuntoPatrimonioDto';
import type { ResumenMensualDto } from './ResumenMensualDto';

/** Resultado de simular un escenario con una cuenta. */
export interface ResultadoSimulacionDto {
  readonly months: number;
  readonly saldo: number;
  readonly patrimonio: number;
  readonly beneficio: number;
  readonly aportacionPeriodica: number;
  readonly aportacionPuntual: number;
  readonly netoAbonado: number;
  readonly retencionAbonada: number;
  readonly descubierto: boolean;
  readonly valido: boolean;
  readonly rows: readonly ResumenMensualDto[];
  readonly points: readonly PuntoPatrimonioDto[];
  readonly dias: readonly DiaSimuladoDto[];
}
