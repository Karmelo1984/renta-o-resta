import type { CampoNumericoProps } from './CampoNumericoProps';

/** Plantilla de campo numérico: etiqueta, entrada con unidad y deslizador. */
export class CampoNumerico {
  /**
   * HTML del campo.
   * @param p - Propiedades del campo.
   * @returns Bloque `.campo`.
   */
  public static render(p: CampoNumericoProps): string {
    const rango = p.deslizador
      ? `<input id="${p.id}Range" class="deslizador${p.verde ? ' deslizador-verde' : ''}" type="range" />`
      : '';
    return `<div class="campo">
  <div class="campo-linea">
    <label class="campo-etiqueta" for="${p.id}">${p.etiqueta}</label>
    <div class="entrada-num"><input id="${p.id}" type="number" /><span>${p.unidad}</span></div>
  </div>${rango}
</div>`;
  }
}
