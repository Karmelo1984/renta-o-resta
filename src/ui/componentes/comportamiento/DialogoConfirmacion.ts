import { Dom } from '../../base/Dom';
import type { OpcionesConfirmacionDto } from './OpcionesConfirmacionDto';

/** Confirmación con el modal de la aplicación (sustituye a `window.confirm`). */
export class DialogoConfirmacion {
  /**
   * Muestra el modal de confirmación.
   * @param opciones - Textos del modal.
   * @returns `true` si el usuario acepta; Esc, fondo y Cancelar equivalen a rechazar.
   */
  public confirmar({
    titulo,
    mensaje,
    aceptar = 'Aceptar',
  }: OpcionesConfirmacionDto): Promise<boolean> {
    const dialogo = Dom.porId('confirmModal', HTMLDialogElement);
    const si = Dom.porId('confirmYes', HTMLButtonElement);
    const no = Dom.porId('confirmNo', HTMLButtonElement);
    return new Promise((resolver) => {
      Dom.porId('confirmTitle').textContent = titulo;
      Dom.porId('confirmMsg').textContent = mensaje;
      si.textContent = aceptar;
      dialogo.returnValue = '';
      si.onclick = (): void => {
        dialogo.close('si');
      };
      no.onclick = (): void => {
        dialogo.close();
      };
      dialogo.onclick = (e): void => {
        if (e.target === dialogo) dialogo.close();
      };
      dialogo.onclose = (): void => {
        resolver(dialogo.returnValue === 'si');
      };
      dialogo.showModal();
      no.focus();
    });
  }
}
