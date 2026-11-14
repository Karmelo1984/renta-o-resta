/* Estado y utilidades compartidas. Sin DOM en el estado financiero. Todos los límites vienen de config.js. */
(function (global) {
  'use strict';
  const CFG = global.SimuladorConfig,
    CAL = CFG.calendario,
    FMT = CFG.formato;
  const MAX_MESES = CFG.campos.meses.max;
  /**
   * Mes de inicio por defecto.
   * @returns {string} `YYYY-MM`.
   */
  const mesActual = () => {
    const d = new Date();
    return (
      (CAL.anioInicio ?? d.getFullYear()) +
      '-' +
      String(CAL.mesInicio ?? d.getMonth() + 1).padStart(2, '0')
    );
  };
  /**
   * Rango de años permitido para el inicio.
   * @returns {[number, number]} Año actual y año actual + `aniosAdelante`.
   */
  const rangoAnios = () => {
    const y = new Date().getFullYear();
    return [y, y + CAL.aniosAdelante];
  };
  const defaults = Object.freeze({
    ...Object.fromEntries(Object.entries(CFG.campos).map(([k, c]) => [k, c.valor])),
    cuentas: CFG.cuentas.lista.map((a) => ({ ...a })),
    puntualesB: {},
    calendario: CAL.modo,
    inicio: mesActual(),
  });
  /**
   * Crea un formateador numérico de la configuración regional.
   * @param {number} min Decimales mínimos.
   * @param {number} [max] Decimales máximos (por defecto `min`).
   * @param {Intl.NumberFormatOptions} [opts] Opciones adicionales.
   * @returns {Intl.NumberFormat} Formateador.
   */
  const fmt = (min, max = min, opts) =>
    new Intl.NumberFormat(FMT.locale, {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
      ...opts,
    });
  const moneda = fmt(FMT.decimales, FMT.decimales, { style: 'currency', currency: FMT.moneda });
  const compacto = fmt(0, FMT.compactoDecimales, { notation: 'compact' });
  const pct = {};
  /**
   * Redondea a 2 decimales.
   * @param {number} v Valor.
   * @returns {number} Valor redondeado.
   */
  const round = (v) => Math.round((v + Math.sign(v || 1) * Number.EPSILON) * 100) / 100;
  /**
   * Formatea importe en moneda.
   * @param {number} v Importe.
   * @returns {string} Texto formateado.
   */
  const money = (v) => moneda.format(Math.abs(v) < FMT.cero ? 0 : v);
  /**
   * Formatea importe con `+` si es positivo.
   * @param {number} v Importe.
   * @returns {string} Texto formateado.
   */
  const signed = (v) => (v > FMT.cero ? '+' : '') + money(v);
  /**
   * Formatea porcentaje.
   * @param {number|null|undefined} v Valor en %.
   * @param {number} [digits] Decimales.
   * @returns {string} Texto o `—` si no hay valor.
   */
  const percentage = (v, digits = FMT.decimalesPct) =>
    v == null ? '—' : (pct[digits] ??= fmt(digits)).format(v) + ' %';
  /**
   * Formatea euros enteros con separador de miles.
   * @param {number} v Importe.
   * @returns {string} Texto formateado.
   */
  const eur = (v) => v.toLocaleString(FMT.locale) + ' €';
  /**
   * Formatea euros en notación compacta.
   * @param {number} v Importe.
   * @returns {string} Texto formateado.
   */
  const eurCompacto = (v) => compacto.format(v) + ' €';
  /**
   * Atajo de `getElementById`.
   * @param {string} id Id del elemento.
   * @returns {HTMLElement|null} Elemento.
   */
  const $ = (id) => document.getElementById(id);
  /**
   * Acota un valor a un rango.
   * @param {number} v Valor.
   * @param {number} min Mínimo.
   * @param {number} max Máximo.
   * @returns {number} Valor acotado.
   */
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  /**
   * Escapa HTML.
   * @param {*} v Valor.
   * @returns {string} Texto seguro para `innerHTML`.
   */
  const esc = (v) =>
    String(v).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  /**
   * Convierte a número finito o devuelve el valor por defecto.
   * @param {*} v Valor.
   * @param {number} [fallback] Valor si no es válido.
   * @returns {number} Número.
   */
  const validNumber = (v, fallback = 0) =>
    Number.isFinite(Number(v)) && String(v).trim() !== '' ? Number(v) : fallback;
  // Periodos: rango de frecuencia y meses que ocupa. El plazo debe ser múltiplo del periodo de ingreso más largo.
  const RANGO = { diario: 0, mensual: 1, anual: 2 };
  /**
   * Paso del plazo: el periodo de ingreso/cálculo más largo.
   * @param {Array<object>} cuentas Cuentas remuneradas.
   * @returns {number} 12 si alguna es anual; si no, 1.
   */
  const pasoMeses = (cuentas) =>
    cuentas.some((a) => a.ingreso === 'anual' || a.calculo === 'anual') ? CAL.mesesAnio : 1;
  /**
   * Menor plazo válido ≥ `meses` que sea múltiplo de `paso`, acotado al máximo.
   * @param {number} meses Plazo deseado.
   * @param {number} paso Múltiplo exigido.
   * @returns {number} Plazo ajustado.
   */
  const ajustarPlazo = (meses, paso) => Math.min(MAX_MESES, Math.ceil(meses / paso) * paso);
  /**
   * Copia profunda del estado por defecto.
   * @returns {object} Estado nuevo.
   */
  const freshState = () => JSON.parse(JSON.stringify(defaults));
  global.Simulador = {
    CFG,
    data: { state: freshState() },
    utils: {
      pasoMeses,
      ajustarPlazo,
      RANGO,
      rangoAnios,
      $,
      round,
      money,
      signed,
      percentage,
      eur,
      eurCompacto,
      clamp,
      esc,
      validNumber,
      freshState,
    },
  };
})(window);
