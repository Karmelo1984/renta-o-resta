import type { OpcionSegmentadaDto } from './OpcionSegmentadaDto';

/** Propiedades de un control segmentado. */
export interface ControlSegmentadoProps {
  readonly id: string;
  /** Nombre del atributo `data-*` donde va el valor de cada botón. */
  readonly clave: string;
  readonly opciones: readonly OpcionSegmentadaDto[];
  /** Id de la etiqueta que lo describe. */
  readonly etiquetadoPor?: string;
  /** Texto accesible si no hay etiqueta visible. */
  readonly ariaLabel?: string;
  /** Si es `true` los botones son conmutadores (`aria-pressed`). */
  readonly conmutador?: boolean;
  /** Clases adicionales. */
  readonly clase?: string;
}
