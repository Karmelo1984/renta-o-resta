/** Agrupa solicitudes rápidas de recálculo en una sola ejecución diferida. */
export class ActualizadorDiferido {
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  /**
   * @param accion - Acción a ejecutar.
   * @param retardoMs - Retardo antes de ejecutar.
   */
  public constructor(
    private readonly accion: () => void,
    private readonly retardoMs: number,
  ) {}

  /** Programa la acción, descartando una solicitud pendiente. */
  public solicitar(): void {
    if (this.temporizador !== null) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(this.accion, this.retardoMs);
  }
}
