import { Boton } from '../../componentes/plantillas/Boton';

/** Modal de confirmación genérico (textos se rellenan en tiempo de ejecución). */
export class ModalConfirmacion {
  /**
   * HTML del modal.
   * @returns Elemento `<dialog>`.
   */
  public render(): string {
    return `<dialog class="modal" id="confirmModal" aria-labelledby="confirmTitle" aria-describedby="confirmMsg">
  <h2 id="confirmTitle"></h2>
  <p class="texto-pequeno" id="confirmMsg"></p>
  <div class="modal-acciones">
    ${Boton.render({ id: 'confirmNo', texto: 'Cancelar' })}
    ${Boton.render({ id: 'confirmYes', variante: 'primario', texto: 'Aceptar' })}
  </div>
</dialog>`;
  }
}
