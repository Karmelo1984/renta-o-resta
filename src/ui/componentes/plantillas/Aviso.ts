/** Plantilla de aviso informativo con marca «i». */
export class Aviso {
  /**
   * HTML del aviso.
   * @param contenido - HTML interior (ya escapado si procede).
   * @param id - Id opcional del contenedor.
   * @param oculto - Si empieza oculto.
   * @returns Elemento `.aviso`.
   */
  public static render(contenido: string, id?: string, oculto = false): string {
    const idAttr = id ? ` id="${id}"` : '';
    return `<div class="aviso"${idAttr}${oculto ? ' hidden' : ''}><span class="aviso-marca">i</span><div>${contenido}</div></div>`;
  }
}
