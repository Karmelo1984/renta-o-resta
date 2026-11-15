import type { IconoNombre } from './IconoNombre';

/** Propiedades de un botón. */
export interface BotonProps {
  readonly id?: string;
  readonly texto?: string;
  readonly icono?: IconoNombre;
  readonly variante?: 'normal' | 'primario' | 'peligro';
  readonly tipo?: 'button' | 'submit';
  /** Clases adicionales. */
  readonly clase?: string;
  /** Atributos HTML adicionales ya serializados (`title="x" aria-label="y"`). */
  readonly atributos?: string;
}
