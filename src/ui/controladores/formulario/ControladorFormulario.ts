import { FabricaEstado } from '@/core/calculo/simulacion/FabricaEstado';
import { CONFIG } from '@/config/Configuracion';
import type { ActualizadorDiferido } from '../../app/ActualizadorDiferido';
import type { EstadoAplicacion } from '../../app/EstadoAplicacion';
import { Dom } from '../../base/Dom';
import type { DialogoConfirmacion } from '../../componentes/comportamiento/DialogoConfirmacion';
import type { ControladorCuentas } from '../cuentas/ControladorCuentas';
import type { ControladorPuntuales } from '../puntuales/ControladorPuntuales';
import type { ControladorCampos } from './ControladorCampos';

/** Orquesta el formulario: calendario, mes de inicio, restablecer y sincronización con el estado. */
export class ControladorFormulario {
  /**
   * @param app - Estado de la aplicación.
   * @param campos - Campos numéricos.
   * @param cuentas - Lista de cuentas.
   * @param puntuales - Calendario de puntuales.
   * @param dialogo - Confirmación modal.
   * @param actualizador - Recalcula con retardo.
   * @param recalcularYa - Recalcula inmediatamente.
   */
  public constructor(
    private readonly app: EstadoAplicacion,
    private readonly campos: ControladorCampos,
    private readonly cuentas: ControladorCuentas,
    private readonly puntuales: ControladorPuntuales,
    private readonly dialogo: DialogoConfirmacion,
    private readonly actualizador: ActualizadorDiferido,
    private readonly recalcularYa: () => void,
  ) {}

  /** Registra los eventos del formulario. */
  public enlazar(): void {
    Dom.porId('reset').addEventListener('click', () => {
      void this.restablecer();
    });
    Dom.porId('calendario', HTMLSelectElement).addEventListener('change', (e) => {
      const valor = e.target instanceof HTMLSelectElement ? e.target.value : '';
      this.app.estado.calendario = valor === 'real' ? 'real' : '30360';
      Dom.porId('inicioField').hidden = this.app.estado.calendario !== 'real';
      this.puntuales.reconstruir();
      this.actualizador.solicitar();
    });
    for (const id of ['inicioMes', 'inicioAnio']) {
      Dom.porId(id).addEventListener('change', () => {
        this.app.estado.inicio = `${Dom.porId('inicioAnio', HTMLSelectElement).value}-${Dom.porId('inicioMes', HTMLSelectElement).value}`;
        this.puntuales.reconstruir();
        this.actualizador.solicitar();
      });
    }
  }

  /** Sincroniza todo el DOM con el estado. */
  public sincronizar(): void {
    const estado = this.app.estado;
    this.cuentas.render();
    this.campos.sincronizar();
    Dom.porId('calendario', HTMLSelectElement).value = estado.calendario;
    const anio = Dom.porId('inicioAnio', HTMLSelectElement);
    if (!anio.options.length) this.rellenarInicio();
    const [a = '', m = ''] = estado.inicio.split('-');
    anio.value = a;
    Dom.porId('inicioMes', HTMLSelectElement).value = m;
    Dom.porId('inicioField').hidden = estado.calendario !== 'real';
    this.puntuales.reconstruir();
  }

  /** Rellena los selectores de mes y año de inicio. */
  private rellenarInicio(): void {
    const [desde, hasta] = FabricaEstado.rangoAnios();
    Dom.porId('inicioMes').innerHTML = CONFIG.calendario.mesesLargo
      .map((n, i) => `<option value="${String(i + 1).padStart(2, '0')}">${n}</option>`)
      .join('');
    Dom.porId('inicioAnio').innerHTML = Array.from(
      { length: hasta - desde + 1 },
      (_, i) => `<option>${desde + i}</option>`,
    ).join('');
  }

  private async restablecer(): Promise<void> {
    const confirmado = await this.dialogo.confirmar({
      titulo: 'Restablecer configuración',
      mensaje: '¿Restablecer importes, tipos, plazo, cuentas y aportaciones puntuales?',
      aceptar: 'Restablecer',
    });
    if (!confirmado) return;
    this.app.reiniciar();
    this.sincronizar();
    this.recalcularYa();
  }
}
