import assert from 'node:assert/strict';
import { test } from 'vitest';
import { AgrupadorDetalle } from '@/core/calculo/detalle/AgrupadorDetalle';
import { Redondeo } from '@/core/calculo/comun/Redondeo';
import { SimuladorFinanciero } from '@/core/calculo/simulacion/SimuladorFinanciero';
import type { EscenarioId } from '@/core/dto/escenario/EscenarioId';
import type { ImportesPeriodoDto } from '@/core/dto/agrupacion/ImportesPeriodoDto';
import type { NivelAgrupacion } from '@/core/dto/agrupacion/NivelAgrupacion';
import { NivelesAgrupacion } from '@/core/dto/agrupacion/NivelesAgrupacion';
import { AyudasPrueba } from '../../soporte/AyudasPrueba';

const motor = new SimuladorFinanciero();
const agrupador = new AgrupadorDetalle();
const simular = motor.simular.bind(motor);
const ESCENARIOS_TEST: readonly EscenarioId[] = ['A', 'B', 'C'];
const CUENTAS_TEST = ['mensual', 'diario'] as const;

// Agrupación del detalle comparativo: solo suma el registro diario, sin recalcular.
const CAMPOS_IMPORTE: readonly (keyof ImportesPeriodoDto)[] = [
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
];
for (const calendario of ['30360', 'real'] as const)
  for (const productId of CUENTAS_TEST)
    for (const nivel of NivelesAgrupacion.TODOS) {
      test(`Agrupación ${nivel} · ${productId} · ${calendario}: sumas y cierres coinciden con el motor`, () => {
        const c = AyudasPrueba.config();
        c.meses = 14;
        c.calendario = calendario;
        c.puntualesB = { 3: 2000, 8: 500 };
        for (const caseId of ESCENARIOS_TEST) {
          const r = simular(c, caseId, productId);
          const { periodos, total } = agrupador.agrupar(r, c, nivel);
          const sum = (k: keyof ImportesPeriodoDto): number =>
            Redondeo.aCentimos(periodos.reduce((s, p) => s + p[k], 0));
          AyudasPrueba.cerca(sum('aportes'), AyudasPrueba.aportado(r), 0.001);
          AyudasPrueba.cerca(sum('neto'), r.netoAbonado, 0.001);
          AyudasPrueba.cerca(sum('retencion'), r.retencionAbonada, 0.001);
          AyudasPrueba.cerca(sum('bruto'), AyudasPrueba.suma(r, 'bruto'), 0.001);
          AyudasPrueba.cerca(sum('cuota'), AyudasPrueba.suma(r, 'cuota'), 0.001);
          // Continuidad: el saldo inicial de cada período es el saldo final del anterior.
          periodos.forEach((p, i) => {
            if (i) AyudasPrueba.cerca(p.inicio, AyudasPrueba.req(periodos[i - 1]).saldo, 0);
          });
          AyudasPrueba.cerca(
            AyudasPrueba.req(periodos[0]).inicio,
            AyudasPrueba.primerDia(r).inicio,
            0,
          );
          // Cierre: el último período acaba en el estado final del motor (sin interés pendiente).
          const z = AyudasPrueba.req(periodos.at(-1));
          AyudasPrueba.cerca(z.saldo, r.saldo, 0);
          AyudasPrueba.cerca(z.deuda, AyudasPrueba.ultimoDia(r).deuda, 0);
          AyudasPrueba.cerca(z.patrimonio, r.patrimonio, 0.001);
          for (const k of CAMPOS_IMPORTE)
            AyudasPrueba.cerca(
              total[k],
              k === 'inicio'
                ? AyudasPrueba.primerDia(r).inicio
                : k === 'deuda' || k === 'saldo' || k === 'patrimonio'
                  ? z[k]
                  : sum(k),
              0.001,
            );
          // Cada período mensual agregado coincide con las filas mensuales del motor.
          if (nivel === 'mes')
            periodos.forEach((p, i) => {
              AyudasPrueba.cerca(p.neto, AyudasPrueba.req(r.rows[i]).netoAbonado, 0.001);
              AyudasPrueba.cerca(
                p.interesPrestamo,
                AyudasPrueba.req(r.rows[i]).interesPrestamo,
                0.001,
              );
              AyudasPrueba.cerca(p.cuota, p.interesPrestamo + p.amortizacion, 0.001);
              AyudasPrueba.cerca(p.patrimonio, AyudasPrueba.req(r.points[i + 1]).patrimonio, 0.001);
            });
        }
      });
    }
test('Número de períodos por agrupación', () => {
  const c = AyudasPrueba.config();
  c.meses = 14;
  c.calendario = '30360';
  const r = simular(c, 'B', 'mensual');
  const n = (l: NivelAgrupacion): number => agrupador.agrupar(r, c, l).periodos.length;
  assert.deepEqual(
    [n('dia'), n('quincena'), n('mes'), n('trimestre'), n('semestre'), n('anio')],
    [420, 28, 14, 5, 3, 2],
  );
});
test('Agrupación con nivel desconocido lanza error', () => {
  const c = AyudasPrueba.config();
  const r = simular(c, 'A', 'mensual');
  assert.throws(
    () => agrupador.agrupar(r, c, 'siglo' as NivelAgrupacion),
    /Agrupación desconocida/,
  );
});
test('Patrimonio intramensual (cuenta mensual) suma el neto devengado pendiente', () => {
  const c = AyudasPrueba.config();
  c.meses = 1;
  c.calendario = '30360';
  c.periodicaB = 0;
  const r = simular(c, 'A', 'mensual');
  const q = AyudasPrueba.req(agrupador.agrupar(r, c, 'quincena').periodos[0]);
  assert.equal(q.neto, 0);
  assert.ok(q.patrimonio > q.saldo);
});
