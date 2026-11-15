import type { VistaDetalleDto } from '@/core/dto/agrupacion/VistaDetalleDto';
import type { EscenarioId } from '@/core/dto/escenario/EscenarioId';
import { DescargadorArchivo } from './DescargadorArchivo';

/** Exporta el detalle comparativo a CSV (separador `;`, decimales con coma, BOM UTF-8). */
export class ExportadorCsv {
  private static readonly CABECERA: readonly string[] = [
    'Período',
    'Detalle período',
    'Escenario',
    'Saldo inicial',
    'Aportes',
    'Interés neto',
    'Retención',
    'Interés bruto',
    'Cuota préstamo',
    'Interés préstamo',
    'Capital amortizado',
    'Capital pendiente',
    'Saldo final',
    'Patrimonio',
  ];

  /**
   * @param descargador - Servicio que entrega el archivo al navegador.
   */
  public constructor(private readonly descargador: DescargadorArchivo = new DescargadorArchivo()) {}

  /**
   * Genera el contenido CSV.
   * @param vista - Detalle comparado.
   * @param escenarios - Escenarios a incluir.
   * @returns Texto CSV con BOM y saltos `\r\n`.
   */
  public generar(vista: VistaDetalleDto, escenarios: readonly EscenarioId[]): string {
    const lineas = [ExportadorCsv.CABECERA.map((c) => ExportadorCsv.celda(c)).join(';')];
    for (const p of [...vista.periodos, vista.total]) {
      for (const id of escenarios) {
        const r = p[id];
        const importes = [
          r.inicio,
          r.aportes,
          r.neto,
          r.retencion,
          r.bruto,
          r.cuota,
          r.interesPrestamo,
          r.amortizacion,
          r.deuda,
          r.saldo,
          r.patrimonio,
        ].map((v) => v.toFixed(2).replace('.', ','));
        lineas.push(
          [p.A.label, p.A.sub, id, ...importes].map((c) => ExportadorCsv.celda(c)).join(';'),
        );
      }
    }
    return `\uFEFF${lineas.join('\r\n')}`;
  }

  /**
   * Genera y descarga el CSV.
   * @param vista - Detalle comparado.
   * @param escenarios - Escenarios a incluir.
   * @param nombreArchivo - Nombre del archivo.
   */
  public exportar(
    vista: VistaDetalleDto,
    escenarios: readonly EscenarioId[],
    nombreArchivo: string,
  ): void {
    this.descargador.descargar(
      this.generar(vista, escenarios),
      nombreArchivo,
      'text/csv;charset=utf-8',
    );
  }

  private static celda(valor: string): string {
    return `"${valor.replace(/"/g, '""')}"`;
  }
}
