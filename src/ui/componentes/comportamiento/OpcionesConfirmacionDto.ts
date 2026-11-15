/** Textos del modal de confirmación. */
export interface OpcionesConfirmacionDto {
  readonly titulo: string;
  readonly mensaje: string;
  /** Texto del botón de aceptar. */
  readonly aceptar?: string;
}
