import { CONFIG } from '@/config/Configuracion';
import { Dom } from '../../base/Dom';
import type { PresentadorFranja } from '../../presentadores/PresentadorFranja';

/** Panel de configuración plegable y cabecera fija que se compacta al desplazarse. */
export class ControladorPanel {
  /**
   * @param franja - Presentador de la franja resumen.
   */
  public constructor(private readonly franja: PresentadorFranja) {}

  /** Registra los eventos del panel y de la cabecera. */
  public enlazar(): void {
    const alternar = (): void => {
      this.alternar();
    };
    Dom.porId('toggleControls').addEventListener('click', alternar);
    Dom.porId('strip').addEventListener('click', alternar);
    this.enlazarCabecera();
  }

  /** Expande o contrae el panel de configuración. */
  private alternar(): void {
    const boton = Dom.porId('toggleControls');
    const contraido = Dom.consulta('.disposicion', HTMLElement).classList.toggle('contraido');
    boton.textContent = contraido ? '»' : '«';
    boton.setAttribute('aria-expanded', String(!contraido));
    boton.setAttribute(
      'aria-label',
      contraido ? 'Expandir configuración' : 'Contraer configuración',
    );
    this.franja.render();
    window.dispatchEvent(new Event('resize'));
  }

  /** Cabecera fija que se encoge al desplazarse (con histéresis). */
  private enlazarCabecera(): void {
    const cabecera = Dom.consulta('.cabecera', HTMLElement);
    let compacta = false;
    const comprobar = (): void => {
      const y = window.scrollY;
      if (!compacta && y > CONFIG.ui.cabeceraCompactaY) compacta = true;
      else if (compacta && y < CONFIG.ui.cabeceraExpandeY) compacta = false;
      cabecera.classList.toggle('compacta', compacta);
    };
    window.addEventListener('scroll', comprobar, { passive: true });
    comprobar();
  }
}
