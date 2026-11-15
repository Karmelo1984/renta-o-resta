import { Aviso } from '../../componentes/plantillas/Aviso';
import { Boton } from '../../componentes/plantillas/Boton';
import { ControlSegmentado } from '../../componentes/plantillas/ControlSegmentado';
import type { OpcionSelectorDto } from '../../componentes/plantillas/OpcionSelectorDto';
import { Selector } from '../../componentes/plantillas/Selector';

/** Modal de alta de una cuenta remunerada. */
export class ModalCuenta {
  private static readonly PERIODOS: readonly OpcionSelectorDto[] = [
    { valor: 'diario', texto: 'Diario' },
    { valor: 'mensual', texto: 'Mensual' },
    { valor: 'anual', texto: 'Anual' },
  ];

  /**
   * HTML del modal.
   * @returns Elemento `<dialog>`.
   */
  public render(): string {
    return `<dialog class="modal" id="accountModal" aria-labelledby="accountModalTitle">
  <form id="accountForm" novalidate>
    <h2 id="accountModalTitle">Añadir cuenta remunerada</h2>
    <p class="texto-pequeno">Solo podrás modificar después el TIN. Para cambiar el resto, elimina la cuenta y créala de nuevo.</p>
    <div class="campo">
      <div class="campo-linea"><label class="campo-etiqueta" for="accNombre">Nombre</label></div>
      <input class="selector" type="text" id="accNombre" autocomplete="off" placeholder="Ej. Trade Republic" />
    </div>
    <div class="campo">
      <div class="campo-linea">
        <label class="campo-etiqueta" for="accTin">TIN</label>
        <div class="entrada-num"><input id="accTin" type="number" min="0" max="100" step="0.01" /><span>%</span></div>
      </div>
    </div>
    <div class="campo">
      <div class="campo-linea"><label class="campo-etiqueta" for="accCalculo">Cálculo de intereses</label></div>
      ${Selector.render('accCalculo', ModalCuenta.PERIODOS)}
    </div>
    <div class="campo" id="accMetodoField" hidden>
      <div class="campo-linea"><span class="campo-etiqueta" id="accMetodoLabel">Base del cálculo</span></div>
      ${ControlSegmentado.render({
        id: 'accMetodo',
        clave: 'm',
        etiquetadoPor: 'accMetodoLabel',
        opciones: [
          { valor: 'medio', texto: 'Saldo medio', activa: true },
          { valor: 'cierre', texto: 'Saldo a cierre' },
        ],
      })}
    </div>
    <div class="campo">
      <div class="campo-linea"><label class="campo-etiqueta" for="accIngreso">Ingreso de intereses</label></div>
      ${Selector.render('accIngreso', ModalCuenta.PERIODOS)}
    </div>
    ${Aviso.render('', 'accNota', true)}
    <p class="modal-error" id="accError" role="alert"></p>
    <div class="modal-acciones">
      ${Boton.render({ id: 'accCancelar', texto: 'Cancelar' })}
      ${Boton.render({ id: 'accCrear', tipo: 'submit', variante: 'primario', texto: 'Crear cuenta' })}
    </div>
  </form>
</dialog>`;
  }
}
