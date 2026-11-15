import { CONFIG } from '@/config/Configuracion';
import type { EscenarioId } from '@/core/dto/escenario/EscenarioId';
import type { EstadoAplicacion } from '../app/EstadoAplicacion';
import { Dom } from '../base/Dom';
import { PresentacionCuenta } from '../presentadores/PresentacionCuenta';
import { Lienzo } from './Lienzo';
import type { CajaPatrimonio } from './modelo/CajaPatrimonio';
import type { SeriesPatrimonioDto } from './modelo/SeriesPatrimonioDto';

const G = CONFIG.grafico;

/** Evolución del patrimonio sobre Canvas sin bibliotecas externas. */
export class GraficoPatrimonio {
  private caja: CajaPatrimonio | null = null;
  private hover: number | null = null;

  /**
   * @param app - Estado de la aplicación (cuentas y últimos resultados).
   */
  public constructor(private readonly app: EstadoAplicacion) {}

  /** Registra los eventos del gráfico. */
  public iniciar(): void {
    Lienzo.enlazar(
      'chart',
      'chartTooltip',
      (e) => {
        this.alMoverPuntero(e);
      },
      () => {
        this.hover = null;
        this.dibujar();
      },
      () => {
        this.dibujar();
      },
    );
  }

  /** Dibuja el gráfico con las series marcadas. */
  public dibujar(): void {
    const todos = this.app.resultados;
    if (!todos) return;
    const series: Record<string, SeriesPatrimonioDto[string]> = {};
    for (const cb of Dom.consultaTodos('#chartChecks input:checked', HTMLInputElement)) {
      const [cuenta, escenario] = (cb.dataset.k ?? '').split('-');
      const resultado = todos[cuenta ?? '']?.[(escenario ?? 'A') as EscenarioId];
      if (resultado) series[cb.dataset.k ?? ''] = resultado.points;
    }
    const g = Lienzo.preparar(Dom.porId('chart', HTMLCanvasElement));
    if (!g) return;
    const { ctx, w, h, left, pw, ph } = g;
    const entradas = Object.entries(series);
    const primera = entradas[0]?.[1];
    if (!primera) {
      this.caja = null;
      ctx.fillStyle = G.colores.texto;
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Marca al menos una opción', w / 2, h / 2);
      return;
    }
    const top = G.margen.arriba;
    const n = primera.length;
    const valores = entradas.flatMap(([, filas]) => filas.map((x) => x.patrimonio));
    let lo = Math.min(...valores);
    let hi = Math.max(...valores);
    let span = hi - lo;
    if (span < 1) span = G.spanMin;
    lo -= span * G.holguraInf;
    hi += span * G.holguraSup;
    const X = (i: number): number => left + (i / (n - 1)) * pw;
    const Y = (v: number): number => top + ((hi - v) / (hi - lo)) * ph;
    Lienzo.ejeY(g, lo, hi, Y);
    Lienzo.ejeX(g, n, X, (i) =>
      i === 0 ? 'Inicio' : i === n - 1 ? 'Cierre' : (primera[i]?.corto ?? ''),
    );
    for (const [clave, filas] of entradas) {
      const cuenta = this.app.estado.cuentas.find((a) => a.id === clave.split('-')[0]);
      ctx.strokeStyle = this.color(clave);
      ctx.setLineDash([...G.trazo[cuenta?.ingreso ?? 'mensual']]);
      ctx.lineWidth = G.grosor;
      ctx.beginPath();
      filas.forEach((p, i) => {
        if (i) ctx.lineTo(X(i), Y(p.patrimonio));
        else ctx.moveTo(X(i), Y(p.patrimonio));
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.hover !== null && this.hover < n) {
      const i = this.hover;
      Lienzo.resaltar(
        g,
        X(i),
        entradas.map(([clave, filas]) => ({
          y: Y(filas[i]?.patrimonio ?? 0),
          color: this.color(clave),
        })),
      );
    }
    this.caja = { left, pw, n, series, X, nombres: this.nombresSeries() };
  }

  private color(clave: string): string {
    const [id, escenario] = clave.split('-');
    const indice = this.app.estado.cuentas.findIndex((a) => a.id === id);
    return PresentacionCuenta.color(indice, (escenario ?? 'A') as EscenarioId);
  }

  /** Nombres visibles de las series marcadas, tal como se leen en las casillas. */
  private nombresSeries(): Record<string, string> {
    const nombres: Record<string, string> = {};
    for (const etiqueta of Dom.consultaTodos('#chartChecks .serie', HTMLElement)) {
      const input = Dom.consulta('input', HTMLInputElement, etiqueta);
      const fila = etiqueta.closest('.series-fila');
      const cuenta = fila?.querySelector('.series-etiqueta')?.textContent ?? '';
      nombres[input.dataset.k ?? ''] =
        `${cuenta} · ${etiqueta.textContent.trim().replace(/\s+/g, ' ')}`;
    }
    return nombres;
  }

  private alMoverPuntero(e: PointerEvent): void {
    if (!this.caja) return;
    const canvas = Dom.porId('chart', HTMLCanvasElement);
    this.hover = Lienzo.indiceCercano(e, canvas, this.caja);
    this.dibujar();
    const caja = this.caja;
    const i = this.hover;
    const filas = Object.entries(caja.series);
    Lienzo.mostrarTooltip(
      Dom.porId('chartTooltip'),
      canvas,
      caja.X(i),
      filas[0]?.[1][i]?.corto ?? '',
      filas.map(([clave, serie]) => ({
        texto: caja.nombres[clave] ?? clave,
        valor: serie[i]?.patrimonio ?? 0,
      })),
    );
  }
}
