import type { CuentaDto } from './CuentaDto';

/** Datos del formulario de alta de una cuenta. */
export type NuevaCuentaDto = Omit<CuentaDto, 'id'>;
