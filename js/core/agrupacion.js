/* Agrupación temporal del detalle financiero. Solo suma/lee el registro diario `dias` del motor:
 * no recalcula intereses, cuotas ni saldos. Compatible con browser y pruebas Node (contexto VM). */
(function (Sim) {
  'use strict';
  const { round } = Sim.utils,
    { diaQuincena: DIA_QUINCENA, mesesBloque: MESES_BLOQUE } = Sim.CFG.agrupacion;
  const NIVELES = {
    dia: { label: 'Día' },
    quincena: { label: 'Quincena', clave: (d) => d.mes * 2 + (d.dia > DIA_QUINCENA ? 1 : 0) },
    mes: { label: 'Mes', clave: (d) => d.mes },
    trimestre: { label: 'Trimestre', clave: (d) => Math.ceil(d.mes / MESES_BLOQUE.trimestre) },
    semestre: { label: 'Semestre', clave: (d) => Math.ceil(d.mes / MESES_BLOQUE.semestre) },
    anio: { label: 'Año', clave: (d) => Math.ceil(d.mes / MESES_BLOQUE.anio) },
  };
  /**
   * Neto devengado pendiente de abono, con el redondeo de una liquidación.
   * @param {number} bruto Interés bruto pendiente.
   * @param {number} retencion Retención en %.
   * @returns {number} Neto en €.
   */
  const netoPendiente = (bruto, retencion) => {
    const g = round(bruto),
      t = round((g * retencion) / 100);
    return round(g - t);
  };
  /**
   * Etiqueta y subtítulo de un grupo de días.
   * @param {string} nivel Clave de `NIVELES`.
   * @param {Array<object>} grupo Días del grupo.
   * @param {Array<object>} cals Calendario mensual.
   * @returns {{label: string, sub: string}} Textos del periodo.
   */
  function etiqueta(nivel, grupo, cals) {
    const a = grupo[0],
      z = grupo.at(-1),
      ca = cals[a.mes - 1],
      cz = cals[z.mes - 1];
    if (nivel === 'dia') return { label: Sim.calculos.fechaTexto(ca, a.dia), sub: '' };
    if (nivel === 'quincena')
      return {
        label: `${ca.label} · ${a.dia > DIA_QUINCENA ? '2ª' : '1ª'} quincena`,
        sub: `Días ${a.dia} – ${z.dia}`,
      };
    if (nivel === 'mes') return { label: ca.label, sub: `Días ${a.dia} – ${z.dia}` };
    const n = Math.ceil(a.mes / MESES_BLOQUE[nivel]);
    return {
      label: `${NIVELES[nivel].label} ${n}`,
      sub: a.mes === z.mes ? ca.label : `${ca.label} – ${cz.label}`,
    };
  }
  /**
   * Agrupa el registro diario por nivel temporal.
   * @param {{dias: Array<object>, months: number}} result Resultado de `simular`.
   * @param {object} model Estado validado de la aplicación.
   * @param {string} nivel Clave de `NIVELES`.
   * @returns {{periodos: Array<object>, total: object}} Filas por periodo y total.
   * @throws {Error} Si el nivel no existe.
   */
  function agrupar(result, model, nivel) {
    if (!NIVELES[nivel]) throw new Error('Agrupación desconocida: ' + nivel);
    const cals = Sim.calculos.calendario(model, result.months),
      grupos = [];
    let actual = null,
      clave = null;
    for (const d of result.dias) {
      const k = nivel === 'dia' ? grupos.length : NIVELES[nivel].clave(d);
      if (actual === null || nivel === 'dia' || k !== clave) {
        actual = [];
        grupos.push(actual);
        clave = k;
      }
      actual.push(d);
    }
    const fila = (g, meta) => {
      const z = g.at(-1),
        suma = (c) => round(g.reduce((s, d) => s + d[c], 0));
      const saldo = z.saldo,
        deuda = z.deuda;
      return {
        ...meta,
        inicio: g[0].inicio,
        aportes: suma('aportes'),
        neto: suma('neto'),
        retencion: suma('retencion'),
        bruto: suma('bruto'),
        cuota: suma('cuota'),
        interesPrestamo: suma('interesPrestamo'),
        amortizacion: suma('amortizacion'),
        deuda,
        saldo,
        patrimonio: round(saldo + netoPendiente(z.pendiente, model.retencion) - deuda),
      };
    };
    const periodos = grupos.map((g) => fila(g, etiqueta(nivel, g, cals)));
    const total = fila(result.dias, { label: 'Total / cierre', sub: `${result.months} meses` });
    return { periodos, total };
  }
  Sim.agrupacion = { NIVELES, agrupar };
})(window.Simulador);
