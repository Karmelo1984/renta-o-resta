/* Pruebas sin paquetes npm: node --test tests/calculos.test.cjs */
'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const sandbox = { window: {}, Intl, Number, Math, Date, JSON, Object, Array, console };
vm.createContext(sandbox);
for (const file of [
  'js/config.js',
  'js/core/estado.js',
  'js/core/calculos.js',
  'js/core/agrupacion.js',
])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
const sim = sandbox.window.Simulador;
const { simular, simularTodos, umbralFinanciacion } = sim.calculos;
// Los tests de motor asumen 30/360 salvo los de calendario real, que lo fijan.
const config = () => ({ ...sim.utils.freshState(), calendario: '30360' });
// Valores esperados derivados de config.js: cambiar los predeterminados no rompe las pruebas.
const tin = (m, id) => m.cuentas.find((a) => a.id === id).tin;
const D = config(),
  round2 = sim.utils.round;
const net = (g) => round2(g - round2((g * D.retencion) / 100));
const close = (actual, expected, tol = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${actual} != ${expected} (tol ${tol})`);

// Registro diario: abonos de intereses y cuotas del préstamo.
const abonos = (r) => r.dias.filter((d) => d.bruto !== 0 || d.retencion !== 0);
const cuotas = (r) => r.dias.filter((d) => d.cuota > 0);
const suma = (r, k) => round2(r.dias.reduce((s, d) => s + d[k], 0));
const aportado = (r) => r.aportacionPeriodica + r.aportacionPuntual;
const brutoMes = (r, mes) =>
  round2(r.dias.filter((d) => d.mes === mes).reduce((s, d) => s + d.bruto, 0));

test('A mensual: 30/360, abono el día 30 del mes, sin pendiente al cierre', () => {
  const c = config();
  c.meses = 1;
  c.periodicaB = 0;
  const r = simular(c, 'A', 'mensual');
  const g = round2((((D.capital * tin(D, 'mensual')) / 100) * 30) / 360);
  const [e, ...resto] = abonos(r);
  assert.equal(resto.length, 0);
  assert.deepEqual([e.mes, e.dia], [1, 30]);
  close(e.bruto, g);
  close(e.retencion, round2((g * D.retencion) / 100));
  close(r.netoAbonado, net(g));
  close(r.saldo, D.capital + net(g));
  close(r.patrimonio, D.capital + net(g));
  assert.equal(r.rows.length, 1);
  assert.equal(r.dias.at(-1).pendiente, 0);
});

test('A diaria: abono el mismo día y reinversión desde el día siguiente', () => {
  const c = config();
  c.meses = 1;
  const r = simular(c, 'A', 'diario'),
    ab = abonos(r);
  assert.equal(ab.length, 30);
  assert.equal(ab[0].dia, 1);
  const g1 = round2((D.capital * tin(D, 'diario')) / 100 / 360);
  close(ab[0].neto, net(g1), 0.0001);
  close(ab[0].saldo, D.capital + net(g1), 0.0001);
  assert.ok(ab[1].bruto >= ab[0].bruto);
  assert.ok(r.saldo > c.capital);
});

test('A ignora aportaciones compartidas por B y C', () => {
  const c = config();
  c.meses = 12;
  const old = simular(c, 'A', 'mensual').patrimonio;
  c.periodicaB = 7000;
  c.puntualesB = { 1: 20000, 6: 5000 };
  close(simular(c, 'A', 'mensual').patrimonio, old, 0);
});

test('B: aportación periódica y puntual el día 1 aumentan saldo y base remunerada', () => {
  const c = config();
  c.meses = 1;
  c.periodicaB = 100;
  c.puntualesB = { 1: 300 };
  const r = simular(c, 'B', 'mensual');
  close(aportado(r), 400, 0);
  close(r.dias[0].aportes, 400, 0);
  // Las dos aportaciones cuentan desde el devengo del día 1: 30 días con 25400 €.
  close(brutoMes(r, 1), ((c.capital + 400) * 30 * tin(c, 'mensual')) / 100 / 360, 0.01);
});

test('C: crédito y cuotas sistema francés, día 30 de cada mes, cierre tras la última', () => {
  const c = config();
  c.meses = 12;
  c.periodicaB = 0;
  const r = simular(c, 'C', 'mensual'),
    q = cuotas(r);
  assert.equal(q.length, c.meses);
  assert.deepEqual([q[0].mes, q[0].dia], [1, 30]);
  assert.deepEqual([q.at(-1).mes, q.at(-1).dia], [c.meses, 30]);
  close(suma(r, 'cuota'), c.prestamo + suma(r, 'interesPrestamo'), 0.01);
  close(suma(r, 'amortizacion'), c.prestamo, 0.01);
  close(r.dias.at(-1).deuda, 0, 0);
  assert.equal(r.rows.length, c.meses);
});

test('El día 30 el devengo es previo a la cuota; el día 1 siguiente ya parte sin ella', () => {
  const c = config();
  c.meses = 2;
  c.periodicaB = 0;
  const r = simular(c, 'C', 'diario'),
    dia = (m, d) => r.dias.find((x) => x.mes === m && x.dia === d);
  assert.ok(dia(1, 30).bruto > 0 && dia(1, 30).cuota > 0);
  assert.ok(dia(2, 1).inicio < dia(1, 30).saldo + dia(1, 30).neto);
  assert.equal(dia(2, 1).inicio, dia(1, 30).saldo);
});

test('La cuenta mensual no capitaliza durante el mes; la diaria sí capitaliza diariamente', () => {
  const c = config();
  c.meses = 2;
  c.periodicaB = 0;
  const monthly = simular(c, 'A', 'mensual'),
    daily = simular(c, 'A', 'diario');
  close(brutoMes(monthly, 1), (((c.capital * tin(c, 'mensual')) / 100) * 30) / 360, 0.005);
  assert.ok(brutoMes(monthly, 2) > brutoMes(monthly, 1));
  assert.equal(abonos(monthly).length, 2);
  assert.equal(abonos(daily).length, 60);
});

test('Conciliación: patrimonio = capital + aportaciones + interés neto − intereses del préstamo', () => {
  const c = config();
  c.meses = 24;
  c.puntualesB = { 5: 1000, 18: 500 };
  const variants = simularTodos(c);
  for (const product of ['mensual', 'diario'])
    for (const caseId of ['A', 'B', 'C']) {
      const r = variants[product][caseId],
        interesPrestamo = suma(r, 'interesPrestamo');
      close(r.patrimonio, c.capital + aportado(r) + r.netoAbonado - interesPrestamo, 0.03);
      close(r.beneficio, r.netoAbonado - interesPrestamo, 0.03);
      assert.equal(r.dias.at(-1).deuda, 0);
    }
});

test('Aportaciones periódicas y puntuales solo en Meses 1..N, día 1', () => {
  const c = config();
  c.meses = 2;
  c.periodicaB = 500;
  c.puntualesB = { 1: 100, 2: 200, 3: 99999 };
  const r = simular(c, 'B', 'mensual');
  close(aportado(r), 1300, 0);
  assert.equal(r.rows.length, 2);
  assert.equal(
    r.dias
      .filter((d) => d.aportes > 0)
      .map((d) => `${d.mes}/${d.dia}`)
      .join(),
    '1/1,2/1',
  );
});

test('La cuenta diaria a retención 0 supera su equivalente con retención 19 en ambos saldos', () => {
  const c = config();
  c.meses = 6;
  const withTax = simular(c, 'B', 'diario');
  c.retencion = 0;
  const withoutTax = simular(c, 'B', 'diario');
  assert.ok(withoutTax.patrimonio > withTax.patrimonio);
  assert.ok(withoutTax.netoAbonado > withTax.netoAbonado);
});

test('El umbral de TIN no altera la configuración y depende de la remuneración', () => {
  const c = config();
  c.meses = 12;
  c.periodicaB = 1000;
  const snapshot = JSON.stringify(c);
  const m = umbralFinanciacion(c, 'mensual'),
    d = umbralFinanciacion(c, 'diario');
  const tope = sim.CFG.umbral.max;
  assert.ok(m > 0 && m < tope);
  assert.ok(d > 0 && d < tope);
  assert.equal(JSON.stringify(c), snapshot);
});

test('Préstamo sin capital: C y su control coinciden, umbral no aplicable', () => {
  const c = config();
  c.meses = 7;
  c.prestamo = 0;
  const r = simularTodos(c);
  assert.equal(r.mensual.C.patrimonio, r.mensual.B.patrimonio);
  assert.equal(r.diario.C.patrimonio, r.diario.B.patrimonio);
  assert.equal(umbralFinanciacion(c, 'mensual'), null);
});

test('B y C tienen exactamente las mismas aportaciones, fechas y cuantías (ambos productos)', () => {
  const c = config();
  c.meses = 5;
  c.periodicaB = 1100;
  c.puntualesB = { 1: 100, 2: 20000, 4: 2500, 5: 400 };
  for (const product of ['mensual', 'diario']) {
    const b = simular(c, 'B', product),
      v = simular(c, 'C', product),
      eventos = (r) => r.dias.filter((d) => d.aportes > 0).map((d) => [d.mes, d.dia, d.aportes]);
    close(b.aportacionPeriodica, v.aportacionPeriodica, 0);
    close(b.aportacionPuntual, v.aportacionPuntual, 0);
    assert.deepEqual(eventos(b), eventos(v));
    close(b.dias[0].inicio + c.prestamo, v.dias[0].inicio, 0);
  }
});

test('El coste de C es el de B más el préstamo y las cuotas, manteniendo entradas idénticas', () => {
  const c = config();
  c.meses = 12;
  c.periodicaB = 500;
  c.puntualesB = { 1: 5000, 7: 1500 };
  for (const product of ['mensual', 'diario']) {
    const b = simular(c, 'B', product),
      v = simular(c, 'C', product);
    close(aportado(v), aportado(b), 0);
    close(suma(v, 'cuota'), c.prestamo + suma(v, 'interesPrestamo'), 0.01);
    close(
      v.patrimonio - b.patrimonio,
      v.netoAbonado - b.netoAbonado - suma(v, 'interesPrestamo'),
      0.04,
    );
  }
});

const [Y0] = sim.utils.rangoAnios();
const bisiesto = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
test('Calendario real: enero del año inicial, 31 días, base 365/366, abono el 31/01', () => {
  const c = config();
  c.meses = 1;
  c.periodicaB = 0;
  c.calendario = 'real';
  c.inicio = Y0 + '-01';
  const r = simular(c, 'A', 'mensual'),
    [e] = abonos(r);
  close(e.bruto, (((c.capital * tin(c, 'mensual')) / 100) * 31) / (bisiesto(Y0) ? 366 : 365), 0.01);
  assert.deepEqual([e.mes, e.dia], [1, 31]);
  assert.equal(sim.calculos.fechaTexto(sim.calculos.calendario(c, 1)[0], e.dia), '31/01/' + Y0);
});
test('Calendario real: febrero con sus días reales (29 si bisiesto); cuota el último día', () => {
  const y = Y0,
    fd = bisiesto(y) ? 29 : 28;
  const c = config();
  c.meses = 2;
  c.periodicaB = 0;
  c.calendario = 'real';
  c.inicio = y + '-01';
  const r = simular(c, 'C', 'mensual'),
    a = simular(c, 'A', 'diario');
  assert.equal(
    cuotas(r)
      .map((d) => `${d.mes}/${d.dia}`)
      .join(),
    `1/31,2/${fd}`,
  );
  assert.equal(abonos(a).length, 31 + fd);
});
test('Calendario real: un plazo largo cruza años y usa la base de cada año', () => {
  const c = config();
  c.meses = 14;
  c.periodicaB = 0;
  c.calendario = 'real';
  c.inicio = Y0 + '-12';
  const r = simular(c, 'A', 'mensual'),
    ene = r.dias.find((d) => d.mes === 2);
  assert.equal(sim.calculos.calendario(c, 2)[1].label, 'ene ' + (Y0 + 1));
  close(
    brutoMes(r, 2),
    (((ene.inicio * tin(c, 'mensual')) / 100) * 31) / (bisiesto(Y0 + 1) ? 366 : 365),
    0.01,
  );
});
// Agrupación del detalle comparativo: solo suma el registro diario, sin recalcular.
const NIVELES = ['dia', 'quincena', 'mes', 'trimestre', 'semestre', 'anio'];
for (const calendario of ['30360', 'real'])
  for (const productId of ['mensual', 'diario'])
    for (const nivel of NIVELES) {
      test(`Agrupación ${nivel} · ${productId} · ${calendario}: sumas y cierres coinciden con el motor`, () => {
        const c = config();
        c.meses = 14;
        c.calendario = calendario;
        c.puntualesB = { 3: 2000, 8: 500 };
        for (const caseId of ['A', 'B', 'C']) {
          const r = simular(c, caseId, productId),
            { periodos, total } = sim.agrupacion.agrupar(r, c, nivel);
          const sum = (k) => round2(periodos.reduce((s, p) => s + p[k], 0));
          close(sum('aportes'), aportado(r), 0.001);
          close(sum('neto'), r.netoAbonado, 0.001);
          close(sum('retencion'), r.retencionAbonada, 0.001);
          close(sum('bruto'), suma(r, 'bruto'), 0.001);
          close(sum('cuota'), suma(r, 'cuota'), 0.001);
          // Continuidad: el saldo inicial de cada período es el saldo final del anterior.
          periodos.forEach((p, i) => {
            if (i) close(p.inicio, periodos[i - 1].saldo, 0);
          });
          close(periodos[0].inicio, r.dias[0].inicio, 0);
          // Cierre: el último período acaba en el estado final del motor (sin interés pendiente).
          const z = periodos.at(-1);
          close(z.saldo, r.saldo, 0);
          close(z.deuda, r.dias.at(-1).deuda, 0);
          close(z.patrimonio, r.patrimonio, 0.001);
          for (const k of [
            'inicio',
            'aportes',
            'neto',
            'retencion',
            'bruto',
            'cuota',
            'interesPrestamo',
            'amortizacion',
            'deuda',
            'saldo',
            'patrimonio',
          ])
            close(
              total[k],
              k === 'inicio'
                ? r.dias[0].inicio
                : ['deuda', 'saldo', 'patrimonio'].includes(k)
                  ? z[k]
                  : sum(k),
              0.001,
            );
          // Cada período mensual agregado coincide con las filas mensuales del motor.
          if (nivel === 'mes')
            periodos.forEach((p, i) => {
              close(p.neto, r.rows[i].netoAbonado, 0.001);
              close(p.interesPrestamo, r.rows[i].interesPrestamo, 0.001);
              close(p.cuota, p.interesPrestamo + p.amortizacion, 0.001);
              close(p.patrimonio, r.points[i + 1].patrimonio, 0.001);
            });
        }
      });
    }
test('Número de períodos por agrupación', () => {
  const c = config();
  c.meses = 14;
  c.calendario = '30360';
  const r = simular(c, 'B', 'mensual'),
    n = (l) => sim.agrupacion.agrupar(r, c, l).periodos.length;
  assert.deepEqual(
    [n('dia'), n('quincena'), n('mes'), n('trimestre'), n('semestre'), n('anio')],
    [420, 28, 14, 5, 3, 2],
  );
});
test('Patrimonio intramensual (cuenta mensual) suma el neto devengado pendiente', () => {
  const c = config();
  c.meses = 1;
  c.calendario = '30360';
  c.periodicaB = 0;
  const r = simular(c, 'A', 'mensual'),
    q = sim.agrupacion.agrupar(r, c, 'quincena').periodos[0];
  assert.equal(q.neto, 0);
  assert.ok(q.patrimonio > q.saldo);
});

// Cuentas configurables: métodos de cálculo e ingreso.
const cuenta = (o) => ({
  id: 'x',
  nombre: 'X',
  tin: 3.6,
  calculo: 'diario',
  metodo: 'medio',
  ingreso: 'mensual',
  ...o,
});
const con = (a, meses = 12) => {
  const c = config();
  c.cuentas = [a];
  c.meses = meses;
  c.periodicaB = 0;
  c.prestamo = 0;
  return c;
};
test('Saldo a cierre mensual: saldo × TIN/12, abonado cada mes', () => {
  const c = con(cuenta({ calculo: 'mensual', metodo: 'cierre' }), 2),
    r = simular(c, 'A', 'x');
  const g1 = round2((c.capital * 0.036) / 12),
    n1 = net(g1),
    g2 = round2(((c.capital + n1) * 0.036) / 12);
  const ab = abonos(r);
  assert.equal(ab.length, 2);
  close(ab[0].bruto, g1);
  close(ab[1].bruto, g2);
});
test('Saldo a cierre anual: un único abono al fin del mes 12, TIN completo', () => {
  const c = con(cuenta({ calculo: 'anual', metodo: 'cierre', ingreso: 'anual' }), 12),
    r = simular(c, 'A', 'x');
  const ab = abonos(r);
  assert.equal(ab.length, 1);
  assert.deepEqual([ab[0].mes, ab[0].dia], [12, 30]);
  close(ab[0].bruto, round2(c.capital * 0.036));
  close(r.dias.at(-1).pendiente, 0, 0);
});
test('Saldo medio con ingreso anual: devengo diario sin capitalizar, abono en el mes 12', () => {
  const c = con(cuenta({ calculo: 'anual', metodo: 'medio', ingreso: 'anual' }), 12),
    r = simular(c, 'A', 'x');
  const ab = abonos(r);
  assert.equal(ab.length, 1);
  close(ab[0].bruto, c.capital * 0.036, 0.01);
});
test('Cálculo mensual saldo medio + ingreso anual: abona solo cada 12 meses', () => {
  const c = con(cuenta({ calculo: 'mensual', metodo: 'medio', ingreso: 'anual' }), 24),
    r = simular(c, 'A', 'x');
  assert.equal(
    abonos(r)
      .map((e) => e.mes)
      .join(),
    '12,24',
  );
});
test('Plazo no múltiplo del periodo: el motor lo rechaza', () => {
  const c = con(cuenta({ calculo: 'anual', metodo: 'cierre', ingreso: 'anual' }), 18);
  assert.throws(() => simular(c, 'A', 'x'), /múltiplo/);
  assert.equal(sim.utils.pasoMeses(c.cuentas), 12);
});
test('Sin cuentas no hay simulación', () => {
  assert.equal(simularTodos({ ...config(), cuentas: [] }).mensual, undefined);
});

test('El motor rechaza plazos fuera de rango', () => {
  const max = sim.CFG.campos.meses.max;
  assert.throws(
    () => simular({ ...config(), meses: max + 1 }, 'A', 'mensual'),
    /Plazo fuera de rango/,
  );
  assert.throws(() => simular({ ...config(), meses: 0 }, 'A', 'mensual'), /Plazo fuera de rango/);
});
