/* Motor puro: 30 días/mes, 360 días/año y calendario financiero de eventos.
 * Compatible con browser (window.Simulador) y pruebas Node.js (contexto VM).
 * La simulación termina el día 30 del Mes N, tras cobrar la última cuota.
 */
(function (Sim) {
  'use strict';
  const { round } = Sim.utils;
  const {
    diasMes: DIAS_MES,
    diasAnio: DIAS_ANIO,
    diasAnioReal: BASE_REAL,
    diasAnioBisiesto: BASE_BISIESTO,
    mesesAnio: MESES_ANIO,
    mesesCorto: MESES_ES,
  } = Sim.CFG.calendario;
  const UMBRAL = Sim.CFG.umbral,
    CERO = Sim.CFG.formato.cero,
    MAX_MESES = Sim.CFG.campos.meses.max;
  const CASES = {
    A: { label: 'A · Solo capital' },
    B: { label: 'B · Capital y aportaciones' },
    C: { label: 'C · Capital, préstamo y aportaciones' },
  };

  /**
   * Cuotas del préstamo francés (cuota constante, la última ajusta el residuo).
   * @param {number} principal Capital prestado en €.
   * @param {number} tin TIN anual en %.
   * @param {number} months Número de cuotas mensuales.
   * @returns {Array<{amount: number, interest: number, amortization: number, debt: number}>} Una por mes.
   */
  function loanSchedule(principal, tin, months) {
    const rate = tin / 1200;
    const nominal =
      principal === 0
        ? 0
        : rate === 0
          ? principal / months
          : (principal * rate) / (1 - (1 + rate) ** -months);
    let debt = round(principal);
    return Array.from({ length: months }, (_, i) => {
      const interest = round(debt * rate),
        amount = i === months - 1 ? round(debt + interest) : round(nominal),
        amortization = round(amount - interest);
      debt = round(Math.max(0, debt - amortization));
      return { amount, interest, amortization, debt };
    });
  }

  /**
   * Calendario por mes. 30/360: 30 días y base 360. Real: días naturales y base 365/366 del año.
   * @param {{calendario: string, inicio: string}} model Modelo con modo de calendario y mes de inicio `YYYY-MM`.
   * @param {number} months Número de meses.
   * @returns {Array<{y?: number, m?: number, dias: number, base: number, label: string, corto: string}>} Un elemento por mes.
   */
  function calendario(model, months) {
    const real = model.calendario === 'real',
      [y0, m0] = real ? model.inicio.split('-').map(Number) : [0, 1];
    return Array.from({ length: months }, (_, i) => {
      if (!real)
        return { dias: DIAS_MES, base: DIAS_ANIO, label: 'Mes ' + (i + 1), corto: 'M' + (i + 1) };
      const idx = m0 - 1 + i,
        y = y0 + Math.floor(idx / MESES_ANIO),
        m = (idx % MESES_ANIO) + 1,
        leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      return {
        y,
        m,
        dias: new Date(Date.UTC(y, m, 0)).getUTCDate(),
        base: leap ? BASE_BISIESTO : BASE_REAL,
        label: `${MESES_ES[m - 1]} ${y}`,
        corto: `${MESES_ES[m - 1]} ${String(y).slice(2)}`,
      };
    });
  }
  /**
   * Texto de fecha de un día concreto.
   * @param {{y?: number, m?: number, label: string}} cal Mes del calendario.
   * @param {number} day Día del mes.
   * @returns {string} `dd/mm/aaaa` (real) o `Mes N · día D` (30/360).
   */
  const fechaTexto = (cal, day) =>
    cal.y
      ? `${String(day).padStart(2, '0')}/${String(cal.m).padStart(2, '0')}/${cal.y}`
      : `Mes ${cal.label.slice(4)} · día ${day}`;

  /**
   * Simula un escenario diario completo.
   * Orden diario: (1) aportaciones día 1 (periódica y puntual), (2) devengo del día,
   * (3) abono neto (según el periodo de ingreso), (4) cuota del préstamo el último día del mes.
   * El capital inicial y el préstamo entran antes del devengo del día 1 del mes 1.
   * @param {object} model Estado validado de la aplicación.
   * @param {'A'|'B'|'C'} caseId Escenario.
   * @param {string} productId Id de la cuenta remunerada.
   * @param {{tinPrestamo?: number}} [options] Sustituye el TIN del préstamo.
   * @returns {{months: number, saldo: number, patrimonio: number, beneficio: number,
   *   aportacionPeriodica: number, aportacionPuntual: number, netoAbonado: number,
   *   retencionAbonada: number, descubierto: boolean, valido: boolean,
   *   rows: Array<{corto: string, netoAbonado: number, interesPrestamo: number}>,
   *   points: Array<{corto: string, patrimonio: number}>, dias: Array<object>}} Resultado.
   * @throws {Error} Escenario/cuenta desconocidos o plazo inválido.
   */
  function simular(model, caseId, productId, options = {}) {
    const product = (model.cuentas || []).find((a) => a.id === productId);
    if (!CASES[caseId] || !product) throw new Error('Escenario o cuenta desconocidos.');
    const months = model.meses;
    if (!Number.isInteger(months) || months < 1 || months > MAX_MESES)
      throw new Error('Plazo fuera de rango.');
    if (months % Sim.utils.pasoMeses([product]) !== 0)
      throw new Error('El plazo debe ser múltiplo del periodo de la cuenta.');
    const loanTin = options.tinPrestamo == null ? model.tinPrestamo : options.tinPrestamo;
    const loan = caseId === 'C' ? round(model.prestamo) : 0;
    const cuotas = loanSchedule(loan, loanTin, months);
    const tin = product.tin / 100;
    const cierre = product.calculo !== 'diario' && product.metodo === 'cierre';
    // Fin de periodo: mensual = último día de cada mes; anual = último día de cada bloque de 12 meses.
    const finPeriodo = (freq, month, day, cal) =>
      freq === 'diario' || (day === cal.dias && (freq === 'mensual' || month % MESES_ANIO === 0));
    let saldo = round(model.capital + loan),
      deuda = loan,
      pendiente = 0,
      descubierto = false;
    let netoAbonado = 0,
      retencionAbonada = 0,
      aportacionPeriodica = 0,
      aportacionPuntual = 0;
    const rows = [],
      dias = [],
      cals = calendario(model, months),
      // B y C comparten todos los ingresos propios; C solo añade el préstamo y sus cuotas.
      periodica = caseId === 'A' ? 0 : model.periodicaB,
      puntuales = caseId === 'A' ? {} : model.puntualesB,
      points = [{ corto: 'Inicio', patrimonio: round(saldo - deuda) }];
    let row = null,
      dia = null;
    // Cierra el resumen del mes en curso y lo añade a `rows` y al gráfico.
    const cerrarMes = () => {
      rows.push(row);
      points.push({ corto: row.corto, patrimonio: round(saldo - deuda) });
    };
    const credit = (grossUnrounded) => {
      // Redondeo del interés bruto y de la retención por liquidación efectuada.
      const gross = round(grossUnrounded),
        tax = round((gross * model.retencion) / 100),
        net = round(gross - tax);
      saldo = round(saldo + net);
      retencionAbonada = round(retencionAbonada + tax);
      netoAbonado = round(netoAbonado + net);
      row.netoAbonado = round(row.netoAbonado + net);
      Object.assign(dia, { bruto: gross, retencion: tax, neto: net });
    };
    for (let month = 1; month <= months; month++)
      for (let day = 1; day <= cals[month - 1].dias; day++) {
        const cal = cals[month - 1];
        if (day === 1) {
          if (row) cerrarMes();
          row = { corto: cal.corto, netoAbonado: 0, interesPrestamo: 0 };
        }
        dia = {
          mes: month,
          dia: day,
          inicio: saldo,
          aportes: 0,
          bruto: 0,
          retencion: 0,
          neto: 0,
          cuota: 0,
          interesPrestamo: 0,
          amortizacion: 0,
        };
        // 1. Aportaciones: día 1, cuentan ya para el devengo de ese día.
        if (day === 1) {
          const puntual = round(Math.max(0, Number(puntuales[month]) || 0));
          saldo = round(saldo + periodica + puntual);
          aportacionPeriodica = round(aportacionPeriodica + periodica);
          aportacionPuntual = round(aportacionPuntual + puntual);
          dia.aportes = round(periodica + puntual);
        }
        // 2-3. Saldo medio: devengo diario con el saldo del día; se abona al fin del periodo de ingreso
        // (diario: el mismo día). Con saldo a cierre no hay devengo diario: ver paso 5.
        if (!cierre) {
          pendiente += (Math.max(0, saldo) * tin) / cal.base;
          if (finPeriodo(product.ingreso, month, day, cal)) {
            credit(pendiente);
            pendiente = 0;
          }
        }
        // 4. Cuota del préstamo el último día del mes, después del devengo de ese día.
        if (caseId === 'C' && day === cal.dias) {
          const q = cuotas[month - 1];
          saldo = round(saldo - q.amount);
          deuda = q.debt;
          row.interesPrestamo = round(row.interesPrestamo + q.interest);
          Object.assign(dia, {
            cuota: q.amount,
            interesPrestamo: q.interest,
            amortizacion: q.amortization,
          });
        }
        // 5. Saldo a cierre: al fin del periodo de cálculo, sobre el saldo tras aportaciones y cuota y antes de abonar.
        if (cierre) {
          if (finPeriodo(product.calculo, month, day, cal))
            pendiente +=
              (Math.max(0, saldo) * tin) / (product.calculo === 'mensual' ? MESES_ANIO : 1);
          if (finPeriodo(product.ingreso, month, day, cal)) {
            credit(pendiente);
            pendiente = 0;
          }
        }
        Object.assign(dia, { deuda, saldo, pendiente });
        dias.push(dia);
        if (saldo < -CERO) descubierto = true;
      }
    cerrarMes();
    const patrimonio = round(saldo - deuda);
    return {
      months,
      saldo,
      patrimonio,
      // El beneficio neto no es el saldo: se resta el dinero propio aportado.
      beneficio: round(patrimonio - model.capital - aportacionPeriodica - aportacionPuntual),
      aportacionPeriodica,
      aportacionPuntual,
      netoAbonado,
      retencionAbonada,
      descubierto,
      // Remuneración negativa no contemplada; una retirada que provoque descubierto invalida el resultado bancario.
      valido: !descubierto && deuda === 0,
      rows,
      points,
      dias,
    };
  }
  /**
   * Simula A, B y C para cada cuenta.
   * @param {object} model Estado validado de la aplicación.
   * @returns {Object<string, {A: object, B: object, C: object}>} Resultados por id de cuenta.
   */
  function simularTodos(model) {
    return Object.fromEntries(
      model.cuentas.map(({ id }) => [
        id,
        { A: simular(model, 'A', id), B: simular(model, 'B', id), C: simular(model, 'C', id) },
      ]),
    );
  }
  /**
   * TIN máximo del préstamo al que C iguala a B (búsqueda binaria).
   * @param {object} model Estado validado de la aplicación.
   * @param {string} productId Id de la cuenta remunerada.
   * @returns {number|null} TIN en %, o `null` si no hay préstamo o no es evaluable.
   */
  function umbralFinanciacion(model, productId) {
    if (model.prestamo <= 0) return null;
    // B ya contiene todos los ingresos propios de C, pero no el préstamo.
    const control = simular(model, 'B', productId);
    const zero = simular(model, 'C', productId, { tinPrestamo: 0 });
    if (!zero.valido || zero.patrimonio < control.patrimonio - UMBRAL.tolerancia) return null;
    let low = UMBRAL.min,
      high = UMBRAL.max;
    for (let i = 0; i < UMBRAL.iteraciones; i++) {
      const mid = (low + high) / 2,
        variant = simular(model, 'C', productId, { tinPrestamo: mid });
      if (variant.valido && variant.patrimonio >= control.patrimonio - UMBRAL.tolerancia) low = mid;
      else high = mid;
    }
    return low;
  }
  Sim.calculos = {
    CASES,
    calendario,
    fechaTexto,
    simular,
    simularTodos,
    umbralFinanciacion,
  };
})(window.Simulador);
