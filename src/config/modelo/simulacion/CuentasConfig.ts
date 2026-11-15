import type { CuentaDto } from '@/core/dto/cuenta/CuentaDto';
import type { TinCuentaConfig } from './TinCuentaConfig';

/** Configuración de las cuentas remuneradas. */
export interface CuentasConfig {
  /** Número máximo de cuentas. */
  readonly max: number;
  /** Longitud máxima del nombre. */
  readonly maxLength: number;
  readonly tin: TinCuentaConfig;
  /** Cuentas por defecto. */
  readonly lista: readonly CuentaDto[];
}
