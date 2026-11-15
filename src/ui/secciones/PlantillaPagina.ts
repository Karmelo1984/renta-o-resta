import { SpriteIconos } from '../componentes/plantillas/SpriteIconos';
import { SeccionCabecera } from './cabecera/SeccionCabecera';
import { SeccionConfiguracion } from './configuracion/SeccionConfiguracion';
import { ModalConfirmacion } from './modales/ModalConfirmacion';
import { ModalCuenta } from './modales/ModalCuenta';
import { SeccionPie } from './pie/SeccionPie';
import { SeccionDetalle } from './resultados/SeccionDetalle';
import { SeccionGraficoIntereses } from './resultados/SeccionGraficoIntereses';
import { SeccionGraficoPatrimonio } from './resultados/SeccionGraficoPatrimonio';
import { SeccionMetodologia } from './resultados/SeccionMetodologia';
import { SeccionResumen } from './resultados/SeccionResumen';

/** Compone la página completa a partir de sus secciones. */
export class PlantillaPagina {
  /**
   * Inserta la página en el contenedor.
   * @param raiz - Elemento donde se monta la aplicación.
   */
  public montar(raiz: HTMLElement): void {
    raiz.innerHTML = `<div class="contenedor">
  ${new SpriteIconos().render()}
  ${new SeccionCabecera().render()}
  <div class="disposicion">
    ${new SeccionConfiguracion().render()}
    <main class="principal">
      ${new SeccionResumen().render()}
      ${new SeccionGraficoPatrimonio().render()}
      ${new SeccionGraficoIntereses().render()}
      ${new SeccionDetalle().render()}
      ${new SeccionMetodologia().render()}
    </main>
  </div>
  ${new SeccionPie().render()}
</div>
${new ModalConfirmacion().render()}
${new ModalCuenta().render()}`;
  }
}
