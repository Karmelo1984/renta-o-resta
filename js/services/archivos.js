/* Descarga del detalle en CSV. */
(function (Sim) {
  'use strict';
  const { $ } = Sim.utils;
  const state = Sim.data.state;
  /**
   * Celda CSV entrecomillada.
   * @param {*} value Valor.
   * @returns {string} Texto escapado.
   */
  const csvCell = (value) => '"' + String(value).replace(/"/g, '""') + '"';
  /**
   * Número con 2 decimales y coma decimal.
   * @param {number} value Valor.
   * @returns {string} Texto formateado.
   */
  const numberCell = (value) => Number(value).toFixed(2).replace('.', ',');
  /**
   * Descarga un texto como archivo.
   * @param {string} source Contenido.
   * @param {string} name Nombre del archivo.
   * @param {string} type Tipo MIME.
   * @returns {void}
   */
  function download(source, name, type) {
    const blob = new Blob([source], { type });
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), Sim.CFG.ui.descargaMs);
  }
  /**
   * Exporta el detalle visible a CSV.
   * @returns {void}
   */
  function exportCSV() {
    const account = $('detailAccount').value,
      nivel = $('detailGroup').querySelector('.active').dataset.g;
    const v = Sim.resultados.vista(account, nivel);
    const lines = [
      [
        'Período',
        'Detalle período',
        'Escenario',
        'Saldo inicial',
        'Aportes',
        'Interés neto',
        'Retención',
        'Interés bruto',
        'Cuota préstamo',
        'Interés préstamo',
        'Capital amortizado',
        'Capital pendiente',
        'Saldo final',
        'Patrimonio',
      ]
        .map(csvCell)
        .join(';'),
    ];
    for (const p of [...v.periodos, v.total])
      for (const id of Sim.resultados.escActivos()) {
        const r = p[id];
        lines.push(
          [
            p.A.label,
            p.A.sub,
            id,
            ...[
              r.inicio,
              r.aportes,
              r.neto,
              r.retencion,
              r.bruto,
              r.cuota,
              r.interesPrestamo,
              r.amortizacion,
              r.deuda,
              r.saldo,
              r.patrimonio,
            ].map(numberCell),
          ]
            .map(csvCell)
            .join(';'),
        );
      }
    download(
      '\uFEFF' + lines.join('\r\n'),
      `detalle_${account}_${nivel}_${state.meses}m.csv`,
      'text/csv;charset=utf-8',
    );
  }
  Sim.archivos = { exportCSV };
})(window.Simulador);
