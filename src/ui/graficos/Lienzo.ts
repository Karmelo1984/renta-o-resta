import { CONFIG } from '@/config/Configuracion';
import { Dom } from '../base/Dom';
import { Formateador } from '../base/Formateador';
import { Html } from '../base/Html';
import type { CajaTrazado } from './modelo/CajaTrazado';
import type { FilaTooltipDto } from './modelo/FilaTooltipDto';
import type { GeometriaLienzo } from './modelo/GeometriaLienzo';
import type { PuntoResaltado } from './modelo/PuntoResaltado';

const G = CONFIG.grafico;
const COL = G.colores;
const M = G.margen;

/** Utilidades de dibujo compartidas por los gráficos Canvas: lienzo, ejes, guía, puntos y tooltip. */
export class Lienzo {
  /**
   * Ajusta el lienzo a su tamaño CSS y a la densidad de píxeles.
   * @param canvas - Lienzo.
   * @returns Contexto y geometría, o `null` si el lienzo es demasiado pequeño.
   */
  public static preparar(canvas: HTMLCanvasElement): GeometriaLienzo | null {
    const { width: w, height: h } = canvas.getBoundingClientRect();
    if (w < G.minLado || h < G.minLado) return null;
    const ratio = Math.min(G.ratioMax, window.devicePixelRatio || 1);
    const mobile = w < G.anchoMovil;
    const left = mobile ? M.izqMovil : M.izq;
    canvas.width = Math.ceil(w * ratio);
    canvas.height = Math.ceil(h * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(ratio, ratio);
    return { ctx, w, h, mobile, left, pw: w - left - M.der, ph: h - M.arriba - M.abajo };
  }

  /**
   * Dibuja la rejilla horizontal y las etiquetas del eje Y.
   * @param g - Geometría del lienzo.
   * @param lo - Valor mínimo del eje.
   * @param hi - Valor máximo del eje.
   * @param Y - Valor → coordenada vertical.
   */
  public static ejeY(
    { ctx, w, left }: GeometriaLienzo,
    lo: number,
    hi: number,
    Y: (v: number) => number,
  ): void {
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    for (let i = 0; i <= G.divisionesY; i++) {
      const v = lo + ((hi - lo) * i) / G.divisionesY;
      const y = Y(v);
      ctx.strokeStyle = COL.rejilla;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(w - M.der, y);
      ctx.stroke();
      ctx.fillStyle = COL.texto;
      ctx.fillText(Formateador.eurosCompacto(v), left - 7, y);
    }
  }

  /**
   * Etiquetas del eje X (primera, última y una cada `stride`).
   * @param g - Geometría del lienzo.
   * @param n - Número de puntos.
   * @param X - Índice → coordenada horizontal.
   * @param texto - Índice → etiqueta.
   */
  public static ejeX(
    { ctx, h, mobile }: GeometriaLienzo,
    n: number,
    X: (i: number) => number,
    texto: (i: number) => string,
  ): void {
    const stride = Math.max(1, Math.ceil(n / (mobile ? G.etiquetasX.movil : G.etiquetasX.normal)));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COL.textoX;
    for (let i = 0; i < n; i++) {
      if (i === 0 || i === n - 1 || i % stride === 0)
        ctx.fillText(texto(i), X(i), h - M.abajo + 12);
    }
  }

  /**
   * Guía vertical y puntos resaltados en el índice bajo el puntero.
   * @param g - Geometría del lienzo.
   * @param x - Coordenada horizontal.
   * @param puntos - Un punto por serie.
   */
  public static resaltar(
    { ctx, h }: GeometriaLienzo,
    x: number,
    puntos: readonly PuntoResaltado[],
  ): void {
    ctx.setLineDash([...G.guia]);
    ctx.strokeStyle = COL.guia;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, M.arriba);
    ctx.lineTo(x, h - M.abajo);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const { y, color } of puntos) {
      ctx.beginPath();
      ctx.fillStyle = COL.punto;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.arc(x, y, G.radioPunto, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  /**
   * Índice del punto más cercano al puntero.
   * @param e - Evento de puntero.
   * @param canvas - Lienzo.
   * @param caja - Geometría del trazado.
   * @returns Índice acotado a `[0, n - 1]`.
   */
  public static indiceCercano(
    e: PointerEvent,
    canvas: HTMLCanvasElement,
    { left, pw, n }: CajaTrazado,
  ): number {
    const x = e.clientX - canvas.getBoundingClientRect().left;
    return Math.min(n - 1, Math.max(0, Math.round(((x - left) / pw) * (n - 1))));
  }

  /**
   * Muestra el tooltip centrado sobre `x`.
   * @param tip - Contenedor del tooltip.
   * @param canvas - Lienzo.
   * @param x - Coordenada horizontal.
   * @param titulo - Cabecera.
   * @param filas - Líneas texto/importe.
   */
  public static mostrarTooltip(
    tip: HTMLElement,
    canvas: HTMLCanvasElement,
    x: number,
    titulo: string,
    filas: readonly FilaTooltipDto[],
  ): void {
    tip.style.display = 'block';
    tip.innerHTML =
      `<strong>${Html.escapar(titulo)}</strong>` +
      filas
        .map(
          (f) =>
            `<div><span>${Html.escapar(f.texto)}</span><b>${Formateador.dinero(f.valor)}</b></div>`,
        )
        .join('');
    const ancho = canvas.getBoundingClientRect().width - tip.offsetWidth - 5;
    tip.style.left = `${Math.min(ancho, Math.max(5, x - tip.offsetWidth / 2))}px`;
    tip.style.top = '13px';
  }

  /**
   * Registra puntero y redimensionado de un gráfico.
   * @param canvasId - Id del lienzo.
   * @param tipId - Id del tooltip.
   * @param mover - Callback de movimiento.
   * @param limpiar - Callback al salir el puntero.
   * @param dibujar - Callback de redibujado.
   */
  public static enlazar(
    canvasId: string,
    tipId: string,
    mover: (e: PointerEvent) => void,
    limpiar: () => void,
    dibujar: () => void,
  ): void {
    const canvas = Dom.porId(canvasId);
    canvas.addEventListener('pointermove', mover);
    canvas.addEventListener('pointerleave', () => {
      Dom.porId(tipId).style.display = 'none';
      limpiar();
    });
    window.addEventListener('resize', () => {
      requestAnimationFrame(dibujar);
    });
  }
}
