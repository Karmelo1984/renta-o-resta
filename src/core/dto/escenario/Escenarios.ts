import type { EscenarioId } from './EscenarioId';

/** Catálogo de escenarios: orden de presentación y textos. */
export class Escenarios {
  /** Escenarios en orden de presentación. */
  public static readonly TODOS: readonly EscenarioId[] = ['A', 'B', 'C'];

  private static readonly ETIQUETAS: Readonly<Record<EscenarioId, string>> = {
    A: 'A · Solo capital',
    B: 'B · Capital y aportaciones',
    C: 'C · Capital, préstamo y aportaciones',
  };

  /**
   * Texto largo de un escenario.
   * @param id - Escenario.
   * @returns Etiqueta, p. ej. «A · Solo capital».
   */
  public static etiqueta(id: EscenarioId): string {
    return Escenarios.ETIQUETAS[id];
  }
}
