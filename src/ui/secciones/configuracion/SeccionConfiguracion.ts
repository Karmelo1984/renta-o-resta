import { CampoNumerico } from '../../componentes/plantillas/CampoNumerico';
import { Boton } from '../../componentes/plantillas/Boton';
import { Selector } from '../../componentes/plantillas/Selector';
import { SeccionPuntuales } from './SeccionPuntuales';

/** Panel lateral de configuración de la simulación. */
export class SeccionConfiguracion {
  private readonly puntuales = new SeccionPuntuales();

  /**
   * HTML de la sección.
   * @returns Elemento `<aside>`.
   */
  public render(): string {
    return `<aside class="tarjeta panel-config" aria-label="Configuración de la simulación">
  <div class="panel-cabecera">
    <h2>Configuración</h2>
    <span class="panel-acciones">
      ${Boton.render({ id: 'reset', icono: 'reset', atributos: 'title="Restablecer" aria-label="Restablecer"' })}
      <button class="boton" id="toggleControls" type="button" aria-expanded="true" aria-label="Contraer configuración" title="Contraer/expandir">«</button>
    </span>
  </div>
  <button type="button" class="franja" id="strip" aria-label="Expandir configuración" title="Expandir configuración"></button>
  <div class="seccion-etiqueta primera">Calendario</div>
  <div class="campo">
    <div class="campo-linea">
      <label class="campo-etiqueta" for="calendario">Modo de cálculo</label>
      ${Selector.render('calendario', [
        { valor: '30360', texto: '30/360 (meses de 30 días)' },
        { valor: 'real', texto: 'Calendario real (días naturales)' },
      ])}
    </div>
  </div>
  <div class="campo" id="inicioField" hidden>
    <div class="campo-linea">
      <label class="campo-etiqueta" for="inicioMes">Mes y año de inicio</label>
      <div class="fila-selectores">${Selector.render('inicioMes')}${Selector.render('inicioAnio', [], 'Año de inicio')}</div>
    </div>
  </div>
  <div class="seccion-etiqueta">Capital y préstamo</div>
  ${CampoNumerico.render({ id: 'capital', etiqueta: 'Ahorro inicial (A, B y C)', unidad: '€', deslizador: true })}
  ${CampoNumerico.render({ id: 'prestamo', etiqueta: 'Préstamo (solo C)', unidad: '€', deslizador: true })}
  <div class="fila-2">
    ${CampoNumerico.render({ id: 'tinPrestamo', etiqueta: 'TIN del préstamo', unidad: '%', deslizador: true })}
    ${CampoNumerico.render({ id: 'meses', etiqueta: 'Plazo y cuotas', unidad: 'meses', deslizador: true })}
  </div>
  <div class="umbrales" id="thresholds" aria-live="polite"></div>
  <div class="seccion-etiqueta">Cuentas remuneradas</div>
  <div id="accountList" class="lista-cuentas"></div>
  <p class="micro" id="accountEmpty" hidden>No hay cuentas. Añade una para simular.</p>
  ${Boton.render({ id: 'addAccount', icono: 'plus', texto: 'Añadir cuenta', clase: 'boton-bloque mb-3.5' })}
  ${CampoNumerico.render({ id: 'retencion', etiqueta: 'Retención sobre intereses', unidad: '%', deslizador: true })}
  <div class="seccion-etiqueta">Aportaciones · B y C</div>
  ${CampoNumerico.render({ id: 'periodicaB', etiqueta: 'Periódicas · día 1 de cada mes', unidad: '€/mes', deslizador: true, verde: true })}
  ${this.puntuales.render()}
  <ul class="ayuda">
    <li><b>A</b> no recibe aportaciones.</li>
    <li><b>B y C</b> reciben las mismas aportaciones (periódicas y puntuales, día 1).</li>
    <li><b>C</b> añade el préstamo inicial y paga sus cuotas.</li>
    <li><b>Límites:</b>
      <ul>
        <li>Ahorro inicial y préstamo: 0–<span data-limite="capital"></span> €.</li>
        <li>Aportación periódica: 0–<span data-limite="periodicaB"></span> €. Cada puntual: 0–<span data-limite="puntual"></span> €.</li>
      </ul>
    </li>
    <li>Botones ±: 100 €.</li>
  </ul>
  <div class="seccion-etiqueta">Guardar y compartir</div>
  <div class="acciones-panel">${Boton.render({ id: 'print', variante: 'primario', icono: 'print', texto: 'Imprimir / PDF' })}</div>
</aside>`;
  }
}
