/* Evolución del patrimonio sobre Canvas sin bibliotecas externas. */
(function (Sim) {
  'use strict';
  const { $ } = Sim.utils;
  const L = Sim.lienzo,
    G = Sim.CFG.grafico,
    COL = G.colores;
  let chartBox = null,
    hover = null;
  /**
   * Color por cuenta (tono) y escenario (luminosidad).
   * @param {number} i Índice de la cuenta.
   * @param {'A'|'B'|'C'} c Escenario.
   * @returns {string} Color `hsl()`.
   */
  const colorOf = (i, c) =>
    `hsl(${G.tonos[Math.max(0, i) % G.tonos.length]} ${G.saturacion}% ${G.luz[c]}%)`;
  /**
   * Color de una serie `cuenta-escenario`.
   * @param {string} k Clave de la serie.
   * @returns {string} Color `hsl()`.
   */
  const colorKey = (k) => {
    const [id, c] = k.split('-');
    return colorOf(
      Sim.data.state.cuentas.findIndex((a) => a.id === id),
      c,
    );
  };
  /**
   * Nombres visibles de las series marcadas, tal como se leen en las casillas.
   * @returns {Object<string, string>} Clave de serie → «Cuenta · Escenario».
   */
  function nombresSeries() {
    const names = {};
    for (const l of document.querySelectorAll('#chartChecks .serie'))
      names[l.querySelector('input').dataset.k] =
        l.closest('.chiprow').querySelector('.chiplabel').textContent +
        ' · ' +
        l.textContent.trim().replace(/\s+/g, ' ');
    return names;
  }
  /**
   * Dibuja el gráfico de patrimonio con las series marcadas.
   * @returns {void}
   */
  function drawChart() {
    const all = Sim.resultados?.getCurrent?.();
    if (!all) return;
    const series = {};
    for (const cb of document.querySelectorAll('#chartChecks input:checked')) {
      const [acc, c] = cb.dataset.k.split('-');
      series[cb.dataset.k] = all[acc][c].points;
    }
    const c = L.preparar($('chart'));
    if (!c) return;
    const { ctx, w, h, left, pw, ph } = c,
      entries = Object.entries(series);
    if (!entries.length) {
      chartBox = null;
      ctx.fillStyle = COL.texto;
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Marca al menos una opción', w / 2, h / 2);
      return;
    }
    const top = G.margen.arriba,
      n = entries[0][1].length,
      vals = entries.flatMap(([, rows]) => rows.map((x) => x.patrimonio));
    let lo = Math.min(...vals),
      hi = Math.max(...vals),
      span = hi - lo;
    if (span < 1) span = G.spanMin;
    lo -= span * G.holguraInf;
    hi += span * G.holguraSup;
    const X = (i) => left + (i / (n - 1)) * pw,
      Y = (v) => top + ((hi - v) / (hi - lo)) * ph;
    L.ejeY(c, lo, hi, Y);
    L.ejeX(c, n, X, (i) => (i === 0 ? 'Inicio' : i === n - 1 ? 'Cierre' : entries[0][1][i].corto));
    for (const [id, rows] of entries) {
      ctx.strokeStyle = colorKey(id);
      ctx.setLineDash(
        G.trazo[Sim.data.state.cuentas.find((a) => a.id === id.split('-')[0]).ingreso],
      );
      ctx.lineWidth = G.grosor;
      ctx.beginPath();
      rows.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](X(i), Y(p.patrimonio)));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (hover !== null && hover < n)
      L.resaltar(
        c,
        X(hover),
        entries.map(([id, rows]) => ({ y: Y(rows[hover].patrimonio), color: colorKey(id) })),
      );
    chartBox = { left, pw, n, series, X, names: nombresSeries() };
  }
  /**
   * Resalta el punto más cercano y muestra el tooltip.
   * @param {PointerEvent} e Evento.
   * @returns {void}
   */
  function pointerMove(e) {
    if (!chartBox) return;
    hover = L.indiceCercano(e, $('chart'), chartBox);
    drawChart();
    const rows = Object.entries(chartBox.series);
    L.mostrarTooltip(
      $('chartTooltip'),
      $('chart'),
      chartBox.X(hover),
      rows[0][1][hover].corto,
      rows.map(([id, r]) => [chartBox.names[id], r[hover].patrimonio]),
    );
  }
  /**
   * Registra los eventos del gráfico.
   * @returns {void}
   */
  function init() {
    L.enlazar(
      'chart',
      'chartTooltip',
      pointerMove,
      () => {
        hover = null;
        drawChart();
      },
      drawChart,
    );
  }
  Sim.grafico = { init, drawChart, colorOf };
})(window.Simulador);
