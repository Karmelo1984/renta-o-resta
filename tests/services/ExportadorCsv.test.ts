import assert from 'node:assert/strict';
import { test } from 'vitest';
import { AgrupadorDetalle } from '@/core/calculo/detalle/AgrupadorDetalle';
import { SimuladorFinanciero } from '@/core/calculo/simulacion/SimuladorFinanciero';
import type { VistaDetalleDto } from '@/core/dto/agrupacion/VistaDetalleDto';
import { ExportadorCsv } from '@/services/archivos/ExportadorCsv';
import { AyudasPrueba } from '../soporte/AyudasPrueba';

test('CSV: BOM, cabecera, tres filas por periodo más total y decimales con coma', () => {
  const c = AyudasPrueba.config();
  c.meses = 2;
  const motor = new SimuladorFinanciero();
  const agrupador = new AgrupadorDetalle();
  const [a, b, t] = (['A', 'B', 'C'] as const).map((id) =>
    agrupador.agrupar(motor.simular(c, id, 'mensual'), c, 'mes'),
  );
  assert.ok(a && b && t);
  const vista: VistaDetalleDto = {
    periodos: a.periodos.map((fa, i) => ({
      A: fa,
      B: AyudasPrueba.req(b.periodos[i]),
      C: AyudasPrueba.req(t.periodos[i]),
    })),
    total: { A: a.total, B: b.total, C: t.total },
  };
  const csv = new ExportadorCsv().generar(vista, ['A', 'B', 'C']);
  const lineas = csv.split('\r\n');
  assert.ok(csv.startsWith('﻿"Período"'));
  assert.equal(lineas.length, 1 + (2 + 1) * 3);
  assert.match(lineas[1] ?? '', /^"[^"]+";"[^"]*";"A";"25000,00"/);
});

test('CSV: solo incluye los escenarios pedidos', () => {
  const c = AyudasPrueba.config();
  c.meses = 1;
  const r = new SimuladorFinanciero().simular(c, 'A', 'mensual');
  const g = new AgrupadorDetalle().agrupar(r, c, 'mes');
  const vista: VistaDetalleDto = {
    periodos: g.periodos.map((f) => ({ A: f, B: f, C: f })),
    total: { A: g.total, B: g.total, C: g.total },
  };
  assert.equal(new ExportadorCsv().generar(vista, ['B']).split('\r\n').length, 1 + 2);
});
