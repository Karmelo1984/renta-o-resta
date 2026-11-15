import { Dom } from '../../base/Dom';

/**
 * Bloque colapsable accesible: botón con `aria-expanded`/`aria-controls`.
 * El contenido plegado es `inert` (no enfocable) y conserva su estado, porque solo se oculta.
 */
export class Colapsable {
  private readonly panel: HTMLElement;
  private readonly interior: HTMLElement;

  /**
   * Enlaza un botón con su panel y lo deja plegado.
   * @param boton - Botón con `aria-controls`.
   * @param alCambiar - Callback al abrir o plegar.
   */
  public constructor(
    private readonly boton: HTMLButtonElement,
    private readonly alCambiar?: (abierto: boolean) => void,
  ) {
    this.panel = Dom.porId(boton.getAttribute('aria-controls') ?? '');
    const interior = this.panel.firstElementChild;
    if (!(interior instanceof HTMLElement)) throw new Error('Colapsable sin contenido interior.');
    this.interior = interior;
    boton.addEventListener('click', () => {
      this.establecer(boton.getAttribute('aria-expanded') !== 'true');
    });
    this.establecer(false);
  }

  private establecer(abierto: boolean): void {
    this.boton.setAttribute('aria-expanded', String(abierto));
    this.panel.classList.toggle('open', abierto);
    this.interior.inert = !abierto;
    this.alCambiar?.(abierto);
  }
}
