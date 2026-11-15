import { Boton } from '../../componentes/plantillas/Boton';
import { Icono } from '../../componentes/plantillas/Icono';
import { Selector } from '../../componentes/plantillas/Selector';

/** Bloque colapsable de aportaciones puntuales del panel de configuración. */
export class SeccionPuntuales {
  /**
   * HTML de la sección.
   * @returns Botón desplegable y panel con calendario y editor.
   */
  public render(): string {
    return `<button type="button" class="boton boton-colapsable" id="toggleOneshots" aria-expanded="false" aria-controls="oneshotPanel">
  ${Icono.render('calendar')}<span>Configurar aportaciones puntuales</span>${Icono.render('chevron', 'chevron')}
</button>
<div class="colapsable" id="oneshotPanel">
  <div class="colapsable-interior" inert>
    <div class="puntuales-caja">
      <div class="puntuales-cabecera">
        <strong>Aportaciones puntuales</strong>
        <span class="micro">Día 1 del mes. Se aplican a B y C.</span>
      </div>
      <div class="puntuales-resumen" aria-live="polite">
        <div><span>Meses</span><b id="oneshotMonths">0</b></div>
        <div><span>Total</span><b id="oneshotTotal">0,00 €</b></div>
      </div>
      <div id="oneshotGrid" class="puntuales-rejilla"></div>
      <div class="puntuales-subtitulo">
        <span>Añadir por rango</span>
        ${Boton.render({ id: 'clearOneshots', icono: 'trash', texto: 'Limpiar' })}
      </div>
      <div class="puntuales-editor">
        <div class="puntuales-campo">
          <span class="campo-etiqueta">${Icono.render('calendar')}Mes seleccionado</span>
          <div class="entrada-num puntuales-sel"><strong id="oneshotSel"></strong></div>
        </div>
        <div class="puntuales-campo">
          <label class="campo-etiqueta" for="oneshotAmount">${Icono.render('euro')}Importe</label>
          <div class="entrada-num"><input id="oneshotAmount" type="number" min="0" data-oneshot-key="edit" /><span>€</span></div>
        </div>
        <div class="puntuales-campo">
          <label class="campo-etiqueta" for="oneshotTo">${Icono.render('range')}Aplicar hasta</label>
          ${Selector.render('oneshotTo')}
        </div>
        <div class="puntuales-campo">
          <label class="campo-etiqueta" for="oneshotEvery">${Icono.render('repeat')}Repetir cada</label>
          <div class="entrada-num"><input id="oneshotEvery" type="number" min="1" step="1" value="1" /><span>meses</span></div>
        </div>
        <div class="puntuales-acciones">
          ${Boton.render({ id: 'oneshotAdd', variante: 'primario', icono: 'plus', texto: 'Sumar al rango' })}
          ${Boton.render({ id: 'oneshotSet', icono: 'check', texto: 'Establecer en rango' })}
        </div>
      </div>
    </div>
  </div>
</div>`;
  }
}
