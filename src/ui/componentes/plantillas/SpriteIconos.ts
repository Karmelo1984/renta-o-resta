import type { IconoNombre } from './IconoNombre';

/** Sprite SVG con todos los iconos; se inserta una sola vez en la página. */
export class SpriteIconos {
  private static readonly TRAZOS: Readonly<Record<IconoNombre, string>> = {
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />',
    print:
      '<path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 14h12v7H6z" />',
    down: '<path d="M12 3v12m-5-5 5 5 5-5" /><path d="M4 21h16" />',
    trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" />',
    calendar:
      '<rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M8 3v4M16 3v4" />',
    euro: '<path d="M18 6.5A7 7 0 1 0 18 17.5M4 10h9M4 14h9" />',
    range: '<path d="M4 12h16M16 8l4 4-4 4M4 7v10" />',
    repeat:
      '<path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4" />',
    plus: '<path d="M12 5v14M5 12h14" />',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" />',
    chevron: '<path d="M6 9l6 6 6-6" />',
    growth: '<path d="M3 17l6-6 4 4 8-9" /><path d="M15 6h6v6" />',
  };

  /**
   * HTML del sprite.
   * @returns Elemento `<svg>` oculto con un `<symbol>` por icono.
   */
  public render(): string {
    const simbolos = (Object.keys(SpriteIconos.TRAZOS) as IconoNombre[])
      .map(
        (n) =>
          `<symbol id="i-${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SpriteIconos.TRAZOS[n]}</symbol>`,
      )
      .join('');
    return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${simbolos}</defs></svg>`;
  }
}
