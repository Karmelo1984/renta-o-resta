/* Interés neto de la cuenta vs interés del préstamo (escenario C), por mes, sobre Canvas. */
(function (Sim) {
  'use strict';
  const { $ } = Sim.utils;
  const L = Sim.lienzo,
    G = Sim.CFG.grafico,
    COL = G.colores,
    TOP = G.margen.arriba,
    SERIES = [
      { k: 'netoAbonado', label: 'Interés neto', color: COL.interesNeto },
      { k: 'interesPrestamo', label: 'Interés préstamo', color: COL.interesPrestamo },
    ];
  let hover = null,
    box = null;
  /**
   * Filas mensuales del escenario C de la cuenta del detalle, en mensual o acumulado.
   * @returns {Array<{corto: string, netoAbonado: number, interesPrestamo: number}>|null} Una por mes o `null`.
   */
  function datos() {
    const c = Sim.resultados?.getCurrent?.()?.[$('detailAccount').value]?.C;
    if (!c) return null;
    const acumulado = $('intMode').querySelector('.active').dataset.m === 'acum';
    let a = 0,
      b = 0;
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
  /**
   * Dibuja las dos líneas.
   * @returns {void}
   */
  function draw() {
    const rows = datos(),
      c = L.preparar($('intChart'));
    if (!c) return;
    box = null;
    if (!rows?.length) return;
    const { ctx, left, pw, ph } = c,
      n = rows.length,
      hi = Math.max(1, ...rows.flatMap((r) => SERIES.map((s) => r[s.k]))) * (1 + G.holguraSup),
      X = (i) => left + (n === 1 ? pw / 2 : (i / (n - 1)) * pw),
      Y = (v) => TOP + ((hi - v) / hi) * ph;
    L.ejeY(c, 0, hi, Y);
    L.ejeX(c, n, X, (i) => rows[i].corto);
    for (const s of SERIES) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = G.grosor;
      ctx.beginPath();
      rows.forEach((r, i) => ctx[i ? 'lineTo' : 'moveTo'](X(i), Y(r[s.k])));
      ctx.stroke();
    }
    if (hover !== null && hover < n)
      L.resaltar(
        c,
        X(hover),
        SERIES.map((s) => ({ y: Y(rows[hover][s.k]), color: s.color })),
      );
    box = { left, pw, n, rows, X };
  }
  /**
   * Resalta el mes más cercano y muestra el tooltip.
   * @param {PointerEvent} e Evento.
   * @returns {void}
   */
  function pointerMove(e) {
    if (!box) return;
    hover = L.indiceCercano(e, $('intChart'), box);
    draw();
    const r = box.rows[hover];
    L.mostrarTooltip(
      $('intTooltip'),
      $('intChart'),
      box.X(hover),
      r.corto,
      SERIES.map((s) => [s.label, r[s.k]]),
    );
  }
  /**
   * Registra los eventos de la gráfica.
   * @returns {void}
   */
  function init() {
    L.enlazar(
      'intChart',
      'intTooltip',
      pointerMove,
      () => {
        hover = null;
        draw();
      },
      draw,
    );
    $('intMode').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      for (const x of $('intMode').children) x.classList.toggle('active', x === b);
      draw();
    });
  }
  Sim.graficoIntereses = { init, draw };
})(window.Simulador);
