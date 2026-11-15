import assert from 'node:assert/strict';
import { test } from 'vitest';
import { CONFIG } from '@/config/Configuracion';
import { CalendarioFinanciero } from '@/core/calculo/calendario/CalendarioFinanciero';
import { Redondeo } from '@/core/calculo/comun/Redondeo';
import { FabricaEstado } from '@/core/calculo/simulacion/FabricaEstado';
import { SimuladorFinanciero } from '@/core/calculo/simulacion/SimuladorFinanciero';
import { PlazoSimulacion } from '@/core/calculo/comun/PlazoSimulacion';
import type { DiaSimuladoDto } from '@/core/dto/resultado/DiaSimuladoDto';
import type { EscenarioId } from '@/core/dto/escenario/EscenarioId';
import type { ResultadoSimulacionDto } from '@/core/dto/resultado/ResultadoSimulacionDto';
import { AyudasPrueba } from '../../soporte/AyudasPrueba';

const motor = new SimuladorFinanciero();
const simular = motor.simular.bind(motor);
const simularTodos = motor.simularTodos.bind(motor);
const umbralFinanciacion = motor.umbralFinanciacion.bind(motor);
const D = AyudasPrueba.config();
const ESCENARIOS_TEST: readonly EscenarioId[] = ['A', 'B', 'C'];
const CUENTAS_TEST = ['mensual', 'diario'] as const;

test('A mensual: 30/360, abono el día 30 del mes, sin pendiente al cierre', () => {
  const c = AyudasPrueba.config();
  c.meses = 1;
  c.periodicaB = 0;
  const r = simular(c, 'A', 'mensual');
  const g = Redondeo.aCentimos((((D.capital * AyudasPrueba.tin(D, 'mensual')) / 100) * 30) / 360);
  const [e, ...resto] = AyudasPrueba.abonos(r);
  assert.equal(resto.length, 0);
  assert.deepEqual([AyudasPrueba.req(e).mes, AyudasPrueba.req(e).dia], [1, 30]);
  AyudasPrueba.cerca(AyudasPrueba.req(e).bruto, g);
  AyudasPrueba.cerca(AyudasPrueba.req(e).retencion, Redondeo.aCentimos((g * D.retencion) / 100));
  AyudasPrueba.cerca(r.netoAbonado, AyudasPrueba.neto(g));
  AyudasPrueba.cerca(r.saldo, D.capital + AyudasPrueba.neto(g));
  AyudasPrueba.cerca(r.patrimonio, D.capital + AyudasPrueba.neto(g));
  assert.equal(r.rows.length, 1);
  assert.equal(AyudasPrueba.ultimoDia(r).pendiente, 0);
});

test('A diaria: abono el mismo día y reinversión desde el día siguiente', () => {
  const c = AyudasPrueba.config();
  c.meses = 1;
  const r = simular(c, 'A', 'diario');
  const ab = AyudasPrueba.abonos(r);
  assert.equal(ab.length, 30);
  assert.equal(AyudasPrueba.req(ab[0]).dia, 1);
  const g1 = Redondeo.aCentimos((D.capital * AyudasPrueba.tin(D, 'diario')) / 100 / 360);
  AyudasPrueba.cerca(AyudasPrueba.req(ab[0]).neto, AyudasPrueba.neto(g1), 0.0001);
  AyudasPrueba.cerca(AyudasPrueba.req(ab[0]).saldo, D.capital + AyudasPrueba.neto(g1), 0.0001);
  assert.ok(AyudasPrueba.req(ab[1]).bruto >= AyudasPrueba.req(ab[0]).bruto);
  assert.ok(r.saldo > c.capital);
});

test('A ignora aportaciones compartidas por B y C', () => {
  const c = AyudasPrueba.config();
  c.meses = 12;
  const old = simular(c, 'A', 'mensual').patrimonio;
  c.periodicaB = 7000;
  c.puntualesB = { 1: 20000, 6: 5000 };
  AyudasPrueba.cerca(simular(c, 'A', 'mensual').patrimonio, old, 0);
});

test('B: aportación periódica y puntual el día 1 aumentan saldo y base remunerada', () => {
  const c = AyudasPrueba.config();
  c.meses = 1;
  c.periodicaB = 100;
  c.puntualesB = { 1: 300 };
  const r = simular(c, 'B', 'mensual');
  AyudasPrueba.cerca(AyudasPrueba.aportado(r), 400, 0);
  AyudasPrueba.cerca(AyudasPrueba.primerDia(r).aportes, 400, 0);
  // Las dos aportaciones cuentan desde el devengo del día 1: 30 días con 25400 €.
  AyudasPrueba.cerca(
    AyudasPrueba.brutoMes(r, 1),
    ((c.capital + 400) * 30 * AyudasPrueba.tin(c, 'mensual')) / 100 / 360,
    0.01,
  );
});

test('C: crédito y cuotas sistema francés, día 30 de cada mes, cierre tras la última', () => {
  const c = AyudasPrueba.config();
  c.meses = 12;
  c.periodicaB = 0;
  const r = simular(c, 'C', 'mensual');
  const q = AyudasPrueba.cuotas(r);
  assert.equal(q.length, c.meses);
  assert.deepEqual([AyudasPrueba.req(q[0]).mes, AyudasPrueba.req(q[0]).dia], [1, 30]);
  assert.deepEqual([AyudasPrueba.req(q.at(-1)).mes, AyudasPrueba.req(q.at(-1)).dia], [c.meses, 30]);
  AyudasPrueba.cerca(
    AyudasPrueba.suma(r, 'cuota'),
    c.prestamo + AyudasPrueba.suma(r, 'interesPrestamo'),
    0.01,
  );
  AyudasPrueba.cerca(AyudasPrueba.suma(r, 'amortizacion'), c.prestamo, 0.01);
  AyudasPrueba.cerca(AyudasPrueba.ultimoDia(r).deuda, 0, 0);
  assert.equal(r.rows.length, c.meses);
});

test('El día 30 el devengo es previo a la cuota; el día 1 siguiente ya parte sin ella', () => {
  const c = AyudasPrueba.config();
  c.meses = 2;
  c.periodicaB = 0;
  const r = simular(c, 'C', 'diario');
  const dia = (m: number, d: number): DiaSimuladoDto =>
    AyudasPrueba.req(r.dias.find((x) => x.mes === m && x.dia === d));
  assert.ok(dia(1, 30).bruto > 0 && dia(1, 30).cuota > 0);
  assert.ok(dia(2, 1).inicio < dia(1, 30).saldo + dia(1, 30).neto);
  assert.equal(dia(2, 1).inicio, dia(1, 30).saldo);
});

test('La cuenta mensual no capitaliza durante el mes; la diaria sí capitaliza diariamente', () => {
  const c = AyudasPrueba.config();
  c.meses = 2;
  c.periodicaB = 0;
  const monthly = simular(c, 'A', 'mensual');
  const daily = simular(c, 'A', 'diario');
  AyudasPrueba.cerca(
    AyudasPrueba.brutoMes(monthly, 1),
    (((c.capital * AyudasPrueba.tin(c, 'mensual')) / 100) * 30) / 360,
    0.005,
  );
  assert.ok(AyudasPrueba.brutoMes(monthly, 2) > AyudasPrueba.brutoMes(monthly, 1));
  assert.equal(AyudasPrueba.abonos(monthly).length, 2);
  assert.equal(AyudasPrueba.abonos(daily).length, 60);
});

test('Conciliación: patrimonio = capital + aportaciones + interés neto − intereses del préstamo', () => {
  const c = AyudasPrueba.config();
  c.meses = 24;
  c.puntualesB = { 5: 1000, 18: 500 };
  const variants = simularTodos(c);
  for (const product of CUENTAS_TEST)
    for (const caseId of ESCENARIOS_TEST) {
      const r = AyudasPrueba.req(variants[product])[caseId];
      const interesPrestamo = AyudasPrueba.suma(r, 'interesPrestamo');
      AyudasPrueba.cerca(
        r.patrimonio,
        c.capital + AyudasPrueba.aportado(r) + r.netoAbonado - interesPrestamo,
        0.03,
      );
      AyudasPrueba.cerca(r.beneficio, r.netoAbonado - interesPrestamo, 0.03);
      assert.equal(AyudasPrueba.ultimoDia(r).deuda, 0);
    }
});

test('Aportaciones periódicas y puntuales solo en Meses 1..N, día 1', () => {
  const c = AyudasPrueba.config();
  c.meses = 2;
  c.periodicaB = 500;
  c.puntualesB = { 1: 100, 2: 200, 3: 99999 };
  const r = simular(c, 'B', 'mensual');
  AyudasPrueba.cerca(AyudasPrueba.aportado(r), 1300, 0);
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
  const c = AyudasPrueba.config();
  c.meses = 6;
  const withTax = simular(c, 'B', 'diario');
  c.retencion = 0;
  const withoutTax = simular(c, 'B', 'diario');
  assert.ok(withoutTax.patrimonio > withTax.patrimonio);
  assert.ok(withoutTax.netoAbonado > withTax.netoAbonado);
});

test('El umbral de TIN no altera la configuración y depende de la remuneración', () => {
  const c = AyudasPrueba.config();
  c.meses = 12;
  c.periodicaB = 1000;
  const snapshot = JSON.stringify(c);
  const m = AyudasPrueba.req(umbralFinanciacion(c, 'mensual'));
  const d = AyudasPrueba.req(umbralFinanciacion(c, 'diario'));
  const tope = CONFIG.umbral.max;
  assert.ok(m > 0 && m < tope);
  assert.ok(d > 0 && d < tope);
  assert.equal(JSON.stringify(c), snapshot);
});

test('Préstamo sin capital: C y su control coinciden, umbral no aplicable', () => {
  const c = AyudasPrueba.config();
  c.meses = 7;
  c.prestamo = 0;
  const r = simularTodos(c);
  assert.equal(AyudasPrueba.req(r.mensual).C.patrimonio, AyudasPrueba.req(r.mensual).B.patrimonio);
  assert.equal(AyudasPrueba.req(r.diario).C.patrimonio, AyudasPrueba.req(r.diario).B.patrimonio);
  assert.equal(umbralFinanciacion(c, 'mensual'), null);
});

test('B y C tienen exactamente las mismas aportaciones, fechas y cuantías (ambos productos)', () => {
  const c = AyudasPrueba.config();
  c.meses = 5;
  c.periodicaB = 1100;
  c.puntualesB = { 1: 100, 2: 20000, 4: 2500, 5: 400 };
  for (const product of CUENTAS_TEST) {
    const b = simular(c, 'B', product);
    const v = simular(c, 'C', product);
    const eventos = (r: ResultadoSimulacionDto): number[][] =>
      r.dias.filter((d) => d.aportes > 0).map((d) => [d.mes, d.dia, d.aportes]);
    AyudasPrueba.cerca(b.aportacionPeriodica, v.aportacionPeriodica, 0);
    AyudasPrueba.cerca(b.aportacionPuntual, v.aportacionPuntual, 0);
    assert.deepEqual(eventos(b), eventos(v));
    AyudasPrueba.cerca(
      AyudasPrueba.primerDia(b).inicio + c.prestamo,
      AyudasPrueba.primerDia(v).inicio,
      0,
    );
  }
});

test('El coste de C es el de B más el préstamo y las cuotas, manteniendo entradas idénticas', () => {
  const c = AyudasPrueba.config();
  c.meses = 12;
  c.periodicaB = 500;
  c.puntualesB = { 1: 5000, 7: 1500 };
  for (const product of CUENTAS_TEST) {
    const b = simular(c, 'B', product);
    const v = simular(c, 'C', product);
    AyudasPrueba.cerca(AyudasPrueba.aportado(v), AyudasPrueba.aportado(b), 0);
    AyudasPrueba.cerca(
      AyudasPrueba.suma(v, 'cuota'),
      c.prestamo + AyudasPrueba.suma(v, 'interesPrestamo'),
      0.01,
    );
    AyudasPrueba.cerca(
      v.patrimonio - b.patrimonio,
      v.netoAbonado - b.netoAbonado - AyudasPrueba.suma(v, 'interesPrestamo'),
      0.04,
    );
  }
});

const Y0 = FabricaEstado.rangoAnios()[0];
const bisiesto = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
test('Calendario real: enero del año inicial, 31 días, base 365/366, abono el 31/01', () => {
  const c = AyudasPrueba.config();
  c.meses = 1;
  c.periodicaB = 0;
  c.calendario = 'real';
  c.inicio = `${Y0}-01`;
  const r = simular(c, 'A', 'mensual');
  const e = AyudasPrueba.req(AyudasPrueba.abonos(r)[0]);
  AyudasPrueba.cerca(
    e.bruto,
    (((c.capital * AyudasPrueba.tin(c, 'mensual')) / 100) * 31) / (bisiesto(Y0) ? 366 : 365),
    0.01,
  );
  assert.deepEqual([e.mes, e.dia], [1, 31]);
  assert.equal(
    CalendarioFinanciero.fechaTexto(
      AyudasPrueba.req(CalendarioFinanciero.construir(c, 1)[0]),
      e.dia,
    ),
    `31/01/${Y0}`,
  );
});
test('Calendario real: febrero con sus días reales (29 si bisiesto); cuota el último día', () => {
  const fd = bisiesto(Y0) ? 29 : 28;
  const c = AyudasPrueba.config();
  c.meses = 2;
  c.periodicaB = 0;
  c.calendario = 'real';
  c.inicio = `${Y0}-01`;
  const r = simular(c, 'C', 'mensual');
  const a = simular(c, 'A', 'diario');
  assert.equal(
    AyudasPrueba.cuotas(r)
      .map((d) => `${d.mes}/${d.dia}`)
      .join(),
    `1/31,2/${fd}`,
  );
  assert.equal(AyudasPrueba.abonos(a).length, 31 + fd);
});
test('Calendario real: un plazo largo cruza años y usa la base de cada año', () => {
  const c = AyudasPrueba.config();
  c.meses = 14;
  c.periodicaB = 0;
  c.calendario = 'real';
  c.inicio = `${Y0}-12`;
  const r = simular(c, 'A', 'mensual');
  const ene = AyudasPrueba.req(r.dias.find((d) => d.mes === 2));
  assert.equal(AyudasPrueba.req(CalendarioFinanciero.construir(c, 2)[1]).label, `ene ${Y0 + 1}`);
  AyudasPrueba.cerca(
    AyudasPrueba.brutoMes(r, 2),
    (((ene.inicio * AyudasPrueba.tin(c, 'mensual')) / 100) * 31) / (bisiesto(Y0 + 1) ? 366 : 365),
    0.01,
  );
});

test('Saldo a cierre mensual: saldo × TIN/12, abonado cada mes', () => {
  const c = AyudasPrueba.conCuenta(
    AyudasPrueba.cuenta({ calculo: 'mensual', metodo: 'cierre' }),
    2,
  );
  const r = simular(c, 'A', 'x');
  const g1 = Redondeo.aCentimos((c.capital * 0.036) / 12);
  const n1 = AyudasPrueba.neto(g1);
  const g2 = Redondeo.aCentimos(((c.capital + n1) * 0.036) / 12);
  const ab = AyudasPrueba.abonos(r);
  assert.equal(ab.length, 2);
  AyudasPrueba.cerca(AyudasPrueba.req(ab[0]).bruto, g1);
  AyudasPrueba.cerca(AyudasPrueba.req(ab[1]).bruto, g2);
});
test('Saldo a cierre anual: un único abono al fin del mes 12, TIN completo', () => {
  const c = AyudasPrueba.conCuenta(
    AyudasPrueba.cuenta({ calculo: 'anual', metodo: 'cierre', ingreso: 'anual' }),
    12,
  );
  const r = simular(c, 'A', 'x');
  const ab = AyudasPrueba.abonos(r);
  assert.equal(ab.length, 1);
  assert.deepEqual([AyudasPrueba.req(ab[0]).mes, AyudasPrueba.req(ab[0]).dia], [12, 30]);
  AyudasPrueba.cerca(AyudasPrueba.req(ab[0]).bruto, Redondeo.aCentimos(c.capital * 0.036));
  AyudasPrueba.cerca(AyudasPrueba.ultimoDia(r).pendiente, 0, 0);
});
test('Saldo medio con ingreso anual: devengo diario sin capitalizar, abono en el mes 12', () => {
  const c = AyudasPrueba.conCuenta(
    AyudasPrueba.cuenta({ calculo: 'anual', metodo: 'medio', ingreso: 'anual' }),
    12,
  );
  const r = simular(c, 'A', 'x');
  const ab = AyudasPrueba.abonos(r);
  assert.equal(ab.length, 1);
  AyudasPrueba.cerca(AyudasPrueba.req(ab[0]).bruto, c.capital * 0.036, 0.01);
});
test('Cálculo mensual saldo medio + ingreso anual: abona solo cada 12 meses', () => {
  const c = AyudasPrueba.conCuenta(
    AyudasPrueba.cuenta({ calculo: 'mensual', metodo: 'medio', ingreso: 'anual' }),
    24,
  );
  const r = simular(c, 'A', 'x');
  assert.equal(
    AyudasPrueba.abonos(r)
      .map((e) => e.mes)
      .join(),
    '12,24',
  );
});
test('Plazo no múltiplo del periodo: el motor lo rechaza', () => {
  const c = AyudasPrueba.conCuenta(
    AyudasPrueba.cuenta({ calculo: 'anual', metodo: 'cierre', ingreso: 'anual' }),
    18,
  );
  assert.throws(() => simular(c, 'A', 'x'), /múltiplo/);
  assert.equal(PlazoSimulacion.pasoMeses(c.cuentas), 12);
});
test('Sin cuentas no hay simulación', () => {
  assert.equal(simularTodos({ ...AyudasPrueba.config(), cuentas: [] }).mensual, undefined);
});

test('El motor rechaza plazos fuera de rango', () => {
  const max = CONFIG.campos.meses.max;
  assert.throws(
    () => simular({ ...AyudasPrueba.config(), meses: max + 1 }, 'A', 'mensual'),
    /Plazo fuera de rango/,
  );
  assert.throws(
    () => simular({ ...AyudasPrueba.config(), meses: 0 }, 'A', 'mensual'),
    /Plazo fuera de rango/,
  );
});
test('El motor rechaza cuentas desconocidas', () => {
  assert.throws(() => simular(AyudasPrueba.config(), 'A', 'no-existe'), /desconocidos/);
});
