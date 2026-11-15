import { CONFIG } from '@/config/Configuracion';
import type { ResumenMensualDto } from '@/core/dto/resultado/ResumenMensualDto';
import type { EstadoAplicacion } from '../app/EstadoAplicacion';
import { Dom } from '../base/Dom';
import { Lienzo } from './Lienzo';
import type { CajaIntereses } from './modelo/CajaIntereses';
import type { SerieInteres } from './modelo/SerieInteres';

const G = CONFIG.grafico;
const SERIES: readonly SerieInteres[] = [
  { k: 'netoAbonado', label: 'Interés neto', color: G.colores.interesNeto },
  { k: 'interesPrestamo', label: 'Interés préstamo', color: G.colores.interesPrestamo },
];

/** Interés neto de la cuenta frente al interés del préstamo (escenario C), por mes, sobre Canvas. */
export class GraficoIntereses {
  private hover: number | null = null;
  private caja: CajaIntereses | null = null;

  /**
   * @param app - Estado de la aplicación.
   */
  public constructor(private readonly app: EstadoAplicacion) {}

  /** Registra los eventos de la gráfica. */
  public iniciar(): void {
    Lienzo.enlazar(
      'intChart',
      'intTooltip',
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
    const modo = Dom.porId('intMode');
    modo.addEventListener('click', (e) => {
      const boton = e.target instanceof Element ? e.target.closest('button') : null;
      if (!boton) return;
      for (const x of modo.children) x.classList.toggle('active', x === boton);
      this.dibujar();
    });
  }

  /** Dibuja las dos líneas. */
  public dibujar(): void {
    const filas = this.datos();
    const g = Lienzo.preparar(Dom.porId('intChart', HTMLCanvasElement));
    if (!g) return;
    this.caja = null;
    if (!filas?.length) return;
    const { ctx, left, pw, ph } = g;
    const n = filas.length;
    const hi = Math.max(1, ...filas.flatMap((r) => SERIES.map((s) => r[s.k]))) * (1 + G.holguraSup);
    const X = (i: number): number => left + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
    const Y = (v: number): number => G.margen.arriba + ((hi - v) / hi) * ph;
    Lienzo.ejeY(g, 0, hi, Y);
    Lienzo.ejeX(g, n, X, (i) => filas[i]?.corto ?? '');
    for (const s of SERIES) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = G.grosor;
      ctx.beginPath();
      filas.forEach((r, i) => {
        if (i) ctx.lineTo(X(i), Y(r[s.k]));
        else ctx.moveTo(X(i), Y(r[s.k]));
      });
      ctx.stroke();
    }
    if (this.hover !== null && this.hover < n) {
      const fila = filas[this.hover];
      if (fila)
        Lienzo.resaltar(
          g,
          X(this.hover),
          SERIES.map((s) => ({ y: Y(fila[s.k]), color: s.color })),
        );
    }
    this.caja = { left, pw, n, rows: filas, X };
  }

  /** Filas mensuales del escenario C de la cuenta del detalle, en mensual o acumulado. */
  private datos(): ResumenMensualDto[] | null {
    const cuenta = Dom.porId('detailAccount', HTMLSelectElement).value;
    const c = this.app.resultados?.[cuenta]?.C;
    if (!c) return null;
    const acumulado = Dom.consulta('#intMode .active', HTMLElement).dataset.m === 'acum';
    let a = 0;
    let b = 0;
    return c.rows.map((r) => {
      a += r.netoAbonado;
      b += r.interesPrestamo;
      return {
        corto: r.corto,
        netoAbonado: acumulado ? a : r.netoAbonado,
        interesPrestamo: acumulado ? b : r.interesPrestamo,
      };
    });
  }

  private alMoverPuntero(e: PointerEvent): void {
    if (!this.caja) return;
    const canvas = Dom.porId('intChart', HTMLCanvasElement);
    this.hover = Lienzo.indiceCercano(e, canvas, this.caja);
    this.dibujar();
    const fila = this.caja.rows[this.hover];
    if (!fila) return;
    Lienzo.mostrarTooltip(
      Dom.porId('intTooltip'),
      canvas,
      this.caja.X(this.hover),
      fila.corto,
      SERIES.map((s) => ({ texto: s.label, valor: fila[s.k] })),
    );
  }
}
