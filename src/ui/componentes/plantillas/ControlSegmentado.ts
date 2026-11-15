import type { ControlSegmentadoProps } from './ControlSegmentadoProps';

/** Plantilla de control segmentado (botones exclusivos o conmutadores). */
export class ControlSegmentado {
  /**
   * HTML del control.
   * @param p - Propiedades.
   * @returns Elemento `.segmentado`.
   */
  public static render(p: ControlSegmentadoProps): string {
    const etiqueta = p.etiquetadoPor
      ? `aria-labelledby="${p.etiquetadoPor}"`
      : `aria-label="${p.ariaLabel ?? ''}"`;
    const botones = p.opciones
      .map((o) => {
        const pressed = p.conmutador ? ` aria-pressed="${o.activa ? 'true' : 'false'}"` : '';
        return `<button type="button" data-${p.clave}="${o.valor}"${o.activa ? ' class="active"' : ''}${pressed}>${o.texto}</button>`;
      })
      .join('');
    return `<div class="segmentado ${p.clase ?? ''}" id="${p.id}" role="group" ${etiqueta}>${botones}</div>`;
  }
}
