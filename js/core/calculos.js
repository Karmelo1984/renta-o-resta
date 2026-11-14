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
   * Cuadro de amortización francés (cuota constante, última cuota ajusta el residuo).
   * @param {number} principal Capital prestado en €.
   * @param {number} tin TIN anual en %.
   * @param {number} months Número de cuotas mensuales.
   * @returns {{payments: Array<{number: number, amount: number, interest: number, amortization: number, debt: number}>, interestTotal: number, nominal: number, totalPaid: number}} Cuotas y totales.
   */
  function loanSchedule(principal, tin, months) {
    const interestRate = tin / 1200;
    const nominal =
      principal === 0
        ? 0
        : interestRate === 0
          ? principal / months
          : (principal * interestRate) / (1 - (1 + interestRate) ** -months);
    let debt = round(principal),
      interestTotal = 0;
    const payments = [];
    for (let k = 1; k <= months; k++) {
      const interest = round(debt * interestRate);
      const amount = k === months ? round(debt + interest) : round(nominal);
      const amortization = round(amount - interest);
      debt = round(Math.max(0, debt - amortization));
      interestTotal = round(interestTotal + interest);
      payments.push({ number: k, amount, interest, amortization, debt });
    }
    return {
      payments,
      interestTotal,
      nominal: round(nominal),
      totalPaid: round(payments.reduce((s, x) => s + x.amount, 0)),
    };
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
   * (3) abono neto (diario: cada día; mensual: día 30), (4) cuota préstamo día 30.
   * El capital inicial y préstamo entran antes del devengo del día 1 del Mes 1.
   * @param {object} model Estado validado de la aplicación.
   * @param {'A'|'B'|'C'} caseId Escenario.
   * @param {string} productId Id de la cuenta remunerada.
   * @param {{tinPrestamo?: number}} [options] Sustituye el TIN del préstamo.
   * @returns {object} Resultado: totales, `rows` mensuales, `points`, `ledger`, `dias` y `valido`.
   * @throws {Error} Escenario/cuenta desconocidos o plazo inválido.
   */
  function simular(model, caseId, productId, options = {}) {
    const product = (model.cuentas || []).find((a) => a.id === productId);
    if (!CASES[caseId] || !product) throw new Error('Escenario o cuenta desconocidos.');
    const months = model.meses;
    if (!Number.isInteger(months) || months < 1 || months > MAX_MESES)
      throw new Error('Plazo fuera de rango.');
    const loanTin = options.tinPrestamo == null ? model.tinPrestamo : options.tinPrestamo;
    const loan = caseId === 'C' ? round(model.prestamo) : 0;
    const amort = loanSchedule(loan, loanTin, months);
    if (months % Sim.utils.pasoMeses([product]) !== 0)
      throw new Error('El plazo debe ser múltiplo del periodo de la cuenta.');
    const initial = round(model.capital + loan),
      tin = product.tin / 100;
    const cierre = product.calculo !== 'diario' && product.metodo === 'cierre';
    // Fin de periodo: mensual = último día de cada mes; anual = último día de cada bloque de 12 meses.
    const finPeriodo = (freq, month, day, cal) =>
      freq === 'diario' || (day === cal.dias && (freq === 'mensual' || month % MESES_ANIO === 0));
    let saldo = initial,
      principalPendiente = loan,
      cuotasPagadas = 0;
    let brutoDevengado = 0,
      brutoAbonado = 0,
      retencionAbonada = 0,
      netoAbonado = 0;
    let aportacionPeriodica = 0,
      aportacionPuntual = 0,
      interesPrestamo = 0;
    let pendiente = 0,
      descubierto = false;
    // `dias`: registro diario de solo lectura (no altera el cálculo); lo consume js/core/agrupacion.js.
    const rows = [],
      ledger = [],
      dias = [],
      cals = calendario(model, months);
    let dia = null;
    // B y C comparten obligatoriamente TODOS los ingresos propios.
    // C se construye sobre B añadiendo únicamente el préstamo y sus cuotas.
    const periodica = caseId === 'A' ? 0 : model.periodicaB;
    const puntuales = caseId === 'A' ? {} : model.puntualesB;
    const initialNetWorth = round(saldo - principalPendiente);
    const points = [
      {
        label: 'Inicio',
        corto: 'Inicio',
        patrimonio: initialNetWorth,
        saldo,
        deuda: principalPendiente,
      },
    ];
    const summaryForMonth = (month) => ({
      mes: month,
      label: cals[month - 1].label,
      corto: cals[month - 1].corto,
      inicio: saldo,
      periodica: 0,
      puntual: 0,
      brutoDevengado: 0,
      brutoAbonado: 0,
      retencionAbonada: 0,
      netoAbonado: 0,
      cuota: 0,
      interesPrestamo: 0,
      deuda: principalPendiente,
      saldo,
      patrimonio: round(saldo - principalPendiente),
    });
    let row = summaryForMonth(1);
    // Cierra el resumen del mes en curso y lo añade a `rows` y al gráfico.
    const cerrarMes = () => {
      row.deuda = principalPendiente;
      row.saldo = saldo;
      row.patrimonio = round(saldo - principalPendiente);
      rows.push(row);
      points.push({
        label: row.label,
        corto: row.corto,
        patrimonio: row.patrimonio,
        saldo,
        deuda: principalPendiente,
      });
    };
    function credit(grossUnrounded, month, day) {
      // Redondeo del interés bruto y de la retención por liquidación efectuada.
      const gross = round(grossUnrounded),
        tax = round((gross * model.retencion) / 100),
        net = round(gross - tax);
      saldo = round(saldo + net);
      brutoAbonado = round(brutoAbonado + gross);
      retencionAbonada = round(retencionAbonada + tax);
      netoAbonado = round(netoAbonado + net);
      row.brutoAbonado = round(row.brutoAbonado + gross);
      row.retencionAbonada = round(row.retencionAbonada + tax);
      row.netoAbonado = round(row.netoAbonado + net);
      dia.bruto = gross;
      dia.retencion = tax;
      dia.neto = net;
      if (gross !== 0 || tax !== 0)
        ledger.push({
          month,
          day,
          type: 'Abono de intereses',
          gross,
          tax,
          net,
          change: net,
          balance: saldo,
        });
    }
    for (let month = 1; month <= months; month++)
      for (let day = 1; day <= cals[month - 1].dias; day++) {
        const cal = cals[month - 1];
        if (month !== row.mes) {
          cerrarMes();
          row = summaryForMonth(month);
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
        if (day === 1 && periodica > 0) {
          saldo = round(saldo + periodica);
          aportacionPeriodica = round(aportacionPeriodica + periodica);
          row.periodica = round(row.periodica + periodica);
          dia.aportes = round(dia.aportes + periodica);
          ledger.push({
            month,
            day,
            type: 'Aportación periódica',
            change: periodica,
            balance: saldo,
          });
        }
        if (day === 1 && Number(puntuales[month]) > 0) {
          const amount = round(Number(puntuales[month]));
          saldo = round(saldo + amount);
          aportacionPuntual = round(aportacionPuntual + amount);
          row.puntual = round(row.puntual + amount);
          dia.aportes = round(dia.aportes + amount);
          ledger.push({ month, day, type: 'Aportación puntual', change: amount, balance: saldo });
        }
        // 2-3. Saldo medio: devengo diario con el saldo del día; se abona al fin del periodo de ingreso
        // (diario: el mismo día). Con saldo a cierre no hay devengo diario: ver paso 5.
        if (!cierre) {
          const grossDaily = (Math.max(0, saldo) * tin) / cal.base;
          brutoDevengado += grossDaily;
          row.brutoDevengado += grossDaily;
          pendiente += grossDaily;
          if (finPeriodo(product.ingreso, month, day, cal)) {
            credit(pendiente, month, day);
            pendiente = 0;
          }
        }
        // 4. Cuota del préstamo el día 30, después del devengo de ese día.
        if (caseId === 'C' && day === cal.dias) {
          const payment = amort.payments[month - 1];
          saldo = round(saldo - payment.amount);
          principalPendiente = payment.debt;
          interesPrestamo = round(interesPrestamo + payment.interest);
          cuotasPagadas = round(cuotasPagadas + payment.amount);
          dia.cuota = payment.amount;
          dia.interesPrestamo = payment.interest;
          dia.amortizacion = payment.amortization;
          row.cuota = round(row.cuota + payment.amount);
          row.interesPrestamo = round(row.interesPrestamo + payment.interest);
          ledger.push({
            month,
            day,
            type: 'Cuota préstamo',
            change: -payment.amount,
            interest: payment.interest,
            balance: saldo,
            debt: principalPendiente,
          });
        }
        // 5. Saldo a cierre: al fin del periodo de cálculo, sobre el saldo tras aportaciones y cuota y antes de abonar.
        if (cierre) {
          if (finPeriodo(product.calculo, month, day, cal)) {
            const g = (Math.max(0, saldo) * tin) / (product.calculo === 'mensual' ? MESES_ANIO : 1);
            brutoDevengado += g;
            row.brutoDevengado += g;
            pendiente += g;
          }
          if (finPeriodo(product.ingreso, month, day, cal)) {
            credit(pendiente, month, day);
            pendiente = 0;
          }
        }
        dia.deuda = principalPendiente;
        dia.saldo = saldo;
        dia.pendiente = pendiente;
        dias.push(dia);
        if (saldo < -CERO) descubierto = true;
      }
    for (const e of ledger) e.fecha = fechaTexto(cals[e.month - 1], e.day);
    cerrarMes();
    const patrimonio = round(saldo - principalPendiente);
    const contribution = round(aportacionPeriodica + aportacionPuntual);
    // El beneficio neto no es el saldo: se resta el dinero propio aportado.
    const beneficio = round(patrimonio - model.capital - contribution);
    return {
      caseId,
      productId,
      months,
      initial,
      loan,
      saldo,
      patrimonio,
      beneficio,
      aportacionPeriodica,
      aportacionPuntual,
      aportaciones: contribution,
      brutoDevengado: round(brutoDevengado),
      brutoAbonado,
      retencionAbonada,
      netoAbonado,
      prestamoInteres: interesPrestamo,
      cuotasPagadas,
      cuotaTeorica: amort.nominal,
      deuda: principalPendiente,
      descubierto,
      rows: rows.map((r) => ({ ...r, brutoDevengado: round(r.brutoDevengado) })),
      points,
      ledger,
      dias,
      // Remuneración negativa no contemplada; una retirada que provoque descubierto invalida el resultado bancario.
      valido: !descubierto && principalPendiente === 0,
    };
  }
  /**
   * Simula A, B y C para cada cuenta.
   * @param {object} model Estado validado de la aplicación.
   * @returns {Object<string, {A: object, B: object, C: object, apalancamiento: number}>} Resultados por id de cuenta.
   */
  function simularTodos(model) {
    const output = {};
    for (const { id: productId } of model.cuentas) {
      const A = simular(model, 'A', productId),
        B = simular(model, 'B', productId),
        C = simular(model, 'C', productId);
      // B es exactamente el control sin financiación de C. No hay ingresos independientes en C.
      output[productId] = { A, B, C, apalancamiento: round(C.patrimonio - B.patrimonio) };
    }
    return output;
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
    loanSchedule,
    simular,
    simularTodos,
    umbralFinanciacion,
  };
})(window.Simulador);
