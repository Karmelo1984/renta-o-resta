import type { OpcionSelectorDto } from './OpcionSelectorDto';

/** Plantilla de `<select>` con el estilo de la aplicación. */
export class Selector {
  /**
   * HTML del selector.
   * @param id - Id del `<select>`.
   * @param opciones - Opciones iniciales (pueden rellenarse después).
   * @param ariaLabel - Etiqueta accesible si no tiene `<label>`.
   * @returns Elemento `<select>`.
   */
  public static render(
    id: string,
    opciones: readonly OpcionSelectorDto[] = [],
    ariaLabel?: string,
  ): string {
    const aria = ariaLabel ? ` aria-label="${ariaLabel}"` : '';
    const html = opciones.map((o) => `<option value="${o.valor}">${o.texto}</option>`).join('');
    return `<select class="selector" id="${id}"${aria}>${html}</select>`;
  }
}
