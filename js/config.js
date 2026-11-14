/* Configuración centralizada: único sitio donde se editan los valores predeterminados.
 * Se carga antes que el resto de módulos (browser: window.SimuladorConfig; tests: contexto VM). */
(function (global) {
'use strict';
global.SimuladorConfig = Object.freeze({
  // Campos numéricos del formulario: valor inicial, rango del campo y del deslizador, paso.
  campos: Object.freeze({
    capital:     {valor: 25000, min: 0, max: 200000, step: 100,  rangeMax: 200000},
    prestamo:    {valor: 50000, min: 0, max: 200000, step: 100,  rangeMax: 200000},
    tinPrestamo: {valor: 6,     min: 0, max: 100,    step: 0.01, rangeMax: 15},
    meses:       {valor: 12,    min: 1, max: 120,    step: 1,    rangeMax: 120},
    tinMensual:  {valor: 2.5,   min: 0, max: 100,    step: 0.01, rangeMax: 15},
    tinDiario:   {valor: 1.15,  min: 0, max: 100,    step: 0.01, rangeMax: 15},
    retencion:   {valor: 19,    min: 0, max: 100,    step: 0.5,  rangeMax: 100},
    periodicaB:  {valor: 500,   min: 0, max: 50000,  step: 100,  rangeMax: 50000}
  }),
  // Aportaciones puntuales (una por mes, compartidas por B y C).
  puntual: Object.freeze({max: 50000, step: 100}),
  // Nombres de cuenta: vacío = se muestra "Cuenta X,XX %".
  nombres: Object.freeze({nombreMensual: '', nombreDiario: '', maxLength: 30}),
  // Calendario 30/360 y real. El mes de inicio real va del año actual hasta el actual + aniosAdelante (por defecto: mes actual).
  calendario: Object.freeze({diasMes: 30, diasAnio: 360, aniosAdelante: 5,
    modo: 'real',        // '30360' | 'real' (modo de cálculo por defecto)
    mesInicio: null,      // 1–12; null = mes actual
    anioInicio: null      // año actual … actual + aniosAdelante; null = año actual
  }),
  // Búsqueda binaria del TIN máximo rentable.
  umbral: Object.freeze({min: 0, max: 40, iteraciones: 35, tolerancia: 0.005}),
});
})(window);
