import type { ModoCalendario } from '../calendario/ModoCalendario';
import type { CuentaDto } from '../cuenta/CuentaDto';
import type { AportacionesPuntualesDto } from './AportacionesPuntualesDto';

/** Estado completo de la simulación; es la entrada del motor de cálculo. */
export interface EstadoSimulacionDto {
  capital: number;
  prestamo: number;
  tinPrestamo: number;
  meses: number;
  retencion: number;
  periodicaB: number;
  cuentas: CuentaDto[];
  puntualesB: AportacionesPuntualesDto;
  calendario: ModoCalendario;
  /** Mes de inicio `YYYY-MM`. */
  inicio: string;
}
