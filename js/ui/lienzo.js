/* Utilidades de dibujo compartidas por los gráficos Canvas: lienzo, ejes, guía, puntos y tooltip. */
(function (Sim) {
  'use strict';
  const { $, money, eurCompacto, clamp, esc } = Sim.utils;
  const G = Sim.CFG.grafico,
    COL = G.colores,
    M = G.margen;
  /**
   * Ajusta el lienzo a su tamaño CSS y a la densidad de píxeles.
   * @param {HTMLCanvasElement} canvas Lienzo.
   * @returns {{ctx: CanvasRenderingContext2D, w: number, h: number, mobile: boolean, left: number, pw: number, ph: number}|null}
   *   Contexto y geometría del área de trazado, o `null` si el lienzo es demasiado pequeño.
   */
  function preparar(canvas) {
    const { width: w, height: h } = canvas.getBoundingClientRect();
    if (w < G.minLado || h < G.minLado) return null;
    const ratio = Math.min(G.ratioMax, window.devicePixelRatio || 1),
      mobile = w < G.anchoMovil,
      left = mobile ? M.izqMovil : M.izq;
    canvas.width = Math.ceil(w * ratio);
    canvas.height = Math.ceil(h * ratio);
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    return { ctx, w, h, mobile, left, pw: w - left - M.der, ph: h - M.arriba - M.abajo };
  }
  /**
   * Dibuja la rejilla horizontal y las etiquetas del eje Y.
   * @param {object} c Resultado de `preparar`.
   * @param {number} lo Valor mínimo del eje.
   * @param {number} hi Valor máximo del eje.
   * @param {function(number): number} Y Valor → coordenada vertical.
   * @returns {void}
   */
  function ejeY({ ctx, w, left }, lo, hi, Y) {
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    for (let i = 0; i <= G.divisionesY; i++) {
      const v = lo + ((hi - lo) * i) / G.divisionesY,
        y = Y(v);
      ctx.strokeStyle = COL.rejilla;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(w - M.der, y);
      ctx.stroke();
      ctx.fillStyle = COL.texto;
      ctx.fillText(eurCompacto(v), left - 7, y);
    }
  }
  /**
   * Etiquetas del eje X (primera, última y una cada `stride`).
   * @param {object} c Resultado de `preparar`.
   * @param {number} n Número de puntos.
   * @param {function(number): number} X Índice → coordenada horizontal.
   * @param {function(number): string} texto Índice → etiqueta.
   * @returns {void}
   */
  function ejeX({ ctx, h, mobile }, n, X, texto) {
    const stride = Math.max(1, Math.ceil(n / (mobile ? G.etiquetasX.movil : G.etiquetasX.normal)));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COL.textoX;
    for (let i = 0; i < n; i++)
      if (i === 0 || i === n - 1 || i % stride === 0)
        ctx.fillText(texto(i), X(i), h - M.abajo + 12);
  }
  /**
   * Guía vertical y puntos resaltados en el índice bajo el puntero.
   * @param {object} c Resultado de `preparar`.
   * @param {number} x Coordenada horizontal.
   * @param {Array<{y: number, color: string}>} puntos Un punto por serie.
   * @returns {void}
   */
  function resaltar({ ctx, h }, x, puntos) {
    ctx.setLineDash(G.guia);
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
   * @param {PointerEvent} e Evento.
   * @param {HTMLCanvasElement} canvas Lienzo.
   * @param {{left: number, pw: number, n: number}} box Geometría del trazado.
   * @returns {number} Índice acotado a `[0, n - 1]`.
   */
  function indiceCercano(e, canvas, { left, pw, n }) {
    const x = e.clientX - canvas.getBoundingClientRect().left;
    return clamp(Math.round(((x - left) / pw) * (n - 1)), 0, n - 1);
  }
  /**
   * Muestra el tooltip centrado sobre `x`.
   * @param {HTMLElement} tip Contenedor del tooltip.
   * @param {HTMLCanvasElement} canvas Lienzo.
   * @param {number} x Coordenada horizontal.
   * @param {string} titulo Cabecera.
   * @param {Array<[string, number]>} filas Pares texto/importe.
   * @returns {void}
   */
  function mostrarTooltip(tip, canvas, x, titulo, filas) {
    tip.style.display = 'block';
    tip.innerHTML =
      `<strong>${esc(titulo)}</strong>` +
      filas.map(([t, v]) => `<div><span>${esc(t)}</span><b>${money(v)}</b></div>`).join('');
    const ancho = canvas.getBoundingClientRect().width - tip.offsetWidth - 5;
    tip.style.left = clamp(x - tip.offsetWidth / 2, 5, ancho) + 'px';
    tip.style.top = '13px';
  }
  /**
   * Registra puntero y redimensionado de un gráfico.
   * @param {string} canvasId Id del lienzo.
   * @param {string} tipId Id del tooltip.
   * @param {function(PointerEvent): void} mover Callback de movimiento.
   * @param {function(): void} limpiar Callback al salir el puntero.
   * @param {function(): void} dibujar Callback de redibujado.
   * @returns {void}
   */
  function enlazar(canvasId, tipId, mover, limpiar, dibujar) {
    const canvas = $(canvasId);
    canvas.addEventListener('pointermove', mover);
    canvas.addEventListener('pointerleave', () => {
      $(tipId).style.display = 'none';
      limpiar();
    });
    window.addEventListener('resize', () => requestAnimationFrame(dibujar));
  }
  Sim.lienzo = { preparar, ejeY, ejeX, resaltar, indiceCercano, mostrarTooltip, enlazar };
})(window.Simulador);
