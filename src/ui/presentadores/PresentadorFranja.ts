import { CONFIG } from '@/config/Configuracion';
import { AportacionesPuntuales } from '@/core/calculo/simulacion/AportacionesPuntuales';
import type { EstadoAplicacion } from '../app/EstadoAplicacion';
import { Dom } from '../base/Dom';
import { Formateador } from '../base/Formateador';
import { Html } from '../base/Html';
import { PresentacionCuenta } from './PresentacionCuenta';

/** Franja con el resumen de la configuración (visible con el panel contraído). */
export class PresentadorFranja {
  /**
   * @param app - Estado de la aplicación.
   */
  public constructor(private readonly app: EstadoAplicacion) {}

  /** Repinta la franja. */
  public render(): void {
    const s = this.app.estado;
    const pct = (v: number): string => `${String(v).replace('.', ',')} %`;
    const dentro = AportacionesPuntuales.dentroDelPlazo(s);
    const item = (
      etiqueta: string,
      valor: string,
      color?: string | null,
      titulo?: string,
    ): string =>
      `<span class="franja-item" title="${Html.escapar(titulo ?? `${etiqueta}: ${valor}`)}"><small>${etiqueta}</small><b>${color ? `<i style="background:${color}"></i>` : ''}${Html.escapar(valor)}</b></span>`;
    const html = [
      item('Modo', s.calendario === 'real' ? 'Real' : '30/360'),
      item('Capital', Formateador.eurosCompacto(s.capital)),
      item('Préstamo', Formateador.eurosCompacto(s.prestamo)),
      item('TIN pr.', pct(s.tinPrestamo)),
      item('Plazo', `${s.meses} m`),
      ...s.cuentas.map((a, i) =>
        item(
          a.nombre ? a.nombre.slice(0, CONFIG.ui.nombreCortoStrip) : 'Cuenta',
          pct(a.tin),
          PresentacionCuenta.color(i, 'B'),
          `${PresentacionCuenta.nombre(a)}: ${pct(a.tin)} · ${PresentacionCuenta.describir(a)}`,
        ),
      ),
      item('Retenc.', pct(s.retencion), null, `Retención: ${pct(s.retencion)}`),
      item('Periód.', `${s.periodicaB} €/m`, null, `Aportación periódica: ${s.periodicaB} €/mes`),
      item(
        'Puntual.',
        dentro.length
          ? `${dentro.length} · ${Formateador.eurosCompacto(AportacionesPuntuales.total(s))}`
          : '—',
      ),
    ].join('');
    Dom.porId('strip').innerHTML = html;
  }
}
