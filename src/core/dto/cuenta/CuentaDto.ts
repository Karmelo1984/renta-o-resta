import type { MetodoCalculo } from './MetodoCalculo';
import type { PeriodoLiquidacion } from './PeriodoLiquidacion';

/** Cuenta remunerada configurada por el usuario. */
export interface CuentaDto {
  /** Id estable (`[A-Za-z0-9_]`). */
  readonly id: string;
  /** Nombre visible; vacío si no tiene. */
  nombre: string;
  /** TIN anual en %. */
  tin: number;
  calculo: PeriodoLiquidacion;
  metodo: MetodoCalculo;
  /** Periodo de ingreso, nunca más frecuente que el de cálculo. */
  ingreso: PeriodoLiquidacion;
}
