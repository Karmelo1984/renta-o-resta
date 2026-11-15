import type { IconoNombre } from './IconoNombre';

/** Referencia a un icono del sprite. */
export class Icono {
  /**
   * HTML de un icono decorativo.
   * @param nombre - Icono del sprite.
   * @param clase - Clases adicionales.
   * @returns Elemento `<svg>`.
   */
  public static render(nombre: IconoNombre, clase = ''): string {
    return `<svg class="icono ${clase}" aria-hidden="true"><use href="#i-${nombre}" /></svg>`;
  }
}
