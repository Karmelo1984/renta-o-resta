import { Dom } from '../../base/Dom';
import type { ExportadorCsv } from '@/services/archivos/ExportadorCsv';
import type { EstadoAplicacion } from '../../app/EstadoAplicacion';
import type { GraficoPatrimonio } from '../../graficos/GraficoPatrimonio';
import type { PresentadorDetalle } from '../../presentadores/PresentadorDetalle';

/** Controles del detalle comparativo, series del gráfico, exportación CSV e impresión. */
export class ControladorDetalle {
  /**
   * @param app - Estado de la aplicación.
   * @param detalle - Presentador de la tabla.
   * @param grafico - Gráfico de patrimonio.
   * @param exportador - Exportador CSV.
   */
  public constructor(
    private readonly app: EstadoAplicacion,
    private readonly detalle: PresentadorDetalle,
    private readonly grafico: GraficoPatrimonio,
    private readonly exportador: ExportadorCsv,
  ) {}

  /** Registra los eventos. */
  public enlazar(): void {
    Dom.porId('detailAccount').addEventListener('change', () => {
      this.detalle.actualizar();
    });
    const grupo = Dom.porId('detailGroup');
    grupo.addEventListener('click', (e) => {
      const boton = e.target instanceof Element ? e.target.closest('button') : null;
      if (!boton) return;
      for (const x of grupo.children) x.classList.toggle('active', x === boton);
      this.detalle.actualizar();
    });
    Dom.porId('detailEsc').addEventListener('click', (e) => {
      const boton = e.target instanceof Element ? e.target.closest('button') : null;
      if (!boton || boton.getAttribute('aria-disabled') === 'true') return;
      boton.classList.toggle('active');
      this.sincronizarEscenarios();
      this.detalle.actualizar();
    });
    Dom.porId('chartChecks').addEventListener('change', () => {
      this.grafico.dibujar();
    });
    Dom.porId('print').addEventListener('click', () => {
      window.print();
    });
    Dom.porId('exportCsv').addEventListener('click', () => {
      this.exportar();
    });
  }

  /** Sincroniza `aria-*` de escenarios; siempre queda uno activo. */
  public sincronizarEscenarios(): void {
    const contenedor = Dom.porId('detailEsc');
    const activos = contenedor.querySelectorAll('.active').length;
    for (const b of contenedor.children) {
      const activo = b.classList.contains('active');
      b.setAttribute('aria-pressed', String(activo));
      b.setAttribute('aria-disabled', String(activos === 1 && activo));
    }
  }

  private exportar(): void {
    const cuenta = Dom.porId('detailAccount', HTMLSelectElement).value;
    const nivel = this.detalle.nivelActivo();
    this.exportador.exportar(
      this.detalle.vista(cuenta, nivel),
      this.detalle.escenariosActivos(),
      `detalle_${cuenta}_${nivel}_${this.app.estado.meses}m.csv`,
    );
  }
}
