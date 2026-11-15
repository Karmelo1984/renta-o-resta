/** Un mes del calendario de simulación. */
export interface MesCalendarioDto {
  /** Año natural (solo en calendario real). */
  readonly anio?: number;
  /** Mes natural 1–12 (solo en calendario real). */
  readonly mes?: number;
  /** Días del mes. */
  readonly dias: number;
  /** Base anual del devengo (360, 365 o 366). */
  readonly base: number;
  /** Etiqueta larga, p. ej. `ene 2026` o `Mes 3`. */
  readonly label: string;
  /** Etiqueta corta, p. ej. `ene 26` o `M3`. */
  readonly corto: string;
}
