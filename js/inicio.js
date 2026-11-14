/* Punto de entrada y orquestación de módulos. */
(function (Sim) {
'use strict';
function iniciar(){
  Sim.controles.bindControls();
  Sim.grafico.init();
  Sim.controles.syncUI();
  Sim.resultados.render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})(window.Simulador);
