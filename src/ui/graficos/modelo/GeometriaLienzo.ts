/** Contexto de dibujo y geometría del área de trazado de un lienzo. */
export interface GeometriaLienzo {
  readonly ctx: CanvasRenderingContext2D;
  /** Ancho CSS del lienzo. */
  readonly w: number;
  /** Alto CSS del lienzo. */
  readonly h: number;
  /** `true` en pantallas estrechas. */
  readonly mobile: boolean;
  /** Margen izquierdo del trazado. */
  readonly left: number;
  /** Ancho del área de trazado. */
  readonly pw: number;
  /** Alto del área de trazado. */
  readonly ph: number;
}
