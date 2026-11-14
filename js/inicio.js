/* Punto de entrada y orquestación de módulos. */
(function (Sim) {
  'use strict';
  /**
   * Inicializa módulos y primer render.
   * @returns {void}
   */
  function iniciar() {
    Sim.controles.bindControls();
    Sim.grafico.init();
    Sim.graficoIntereses.init();
    Sim.controles.syncUI();
    Sim.resultados.render();
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
})(window.Simulador);
