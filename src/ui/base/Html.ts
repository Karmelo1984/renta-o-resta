/** Utilidades de HTML seguro. */
export class Html {
  private static readonly ENTIDADES: Readonly<Record<string, string>> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  /**
   * Escapa HTML.
   * @param valor - Valor a insertar en `innerHTML`.
   * @returns Texto seguro.
   */
  public static escapar(valor: string | number): string {
    return String(valor).replace(/[&<>"']/g, (c) => Html.ENTIDADES[c] ?? c);
  }
}
