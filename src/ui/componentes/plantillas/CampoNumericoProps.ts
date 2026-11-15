/** Propiedades de un campo numérico con deslizador opcional. */
export interface CampoNumericoProps {
  /** Id del `<input>`; el deslizador usa `${id}Range`. */
  readonly id: string;
  readonly etiqueta: string;
  /** Unidad mostrada a la derecha (€, %, meses…). */
  readonly unidad: string;
  /** Si es `true` se añade el deslizador. */
  readonly deslizador?: boolean;
  /** Deslizador en verde. */
  readonly verde?: boolean;
}
