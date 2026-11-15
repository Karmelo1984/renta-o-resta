import type { AgrupadorDetalle } from '@/core/calculo/detalle/AgrupadorDetalle';
import type { AgrupacionDto } from '@/core/dto/agrupacion/AgrupacionDto';
import type { FilaAgrupadaDto } from '@/core/dto/agrupacion/FilaAgrupadaDto';
import type { NivelAgrupacion } from '@/core/dto/agrupacion/NivelAgrupacion';
import type { PeriodoComparadoDto } from '@/core/dto/agrupacion/PeriodoComparadoDto';
import type { VistaDetalleDto } from '@/core/dto/agrupacion/VistaDetalleDto';
import type { EscenarioId } from '@/core/dto/escenario/EscenarioId';
import { Escenarios } from '@/core/dto/escenario/Escenarios';
import type { EstadoAplicacion } from '../app/EstadoAplicacion';
import { Dom } from '../base/Dom';
import { Formateador } from '../base/Formateador';
import { Html } from '../base/Html';
import type { GraficoIntereses } from '../graficos/GraficoIntereses';
import { PresentacionCuenta } from './PresentacionCuenta';

/** Pinta la tabla «Detalle financiero comparativo» de la cuenta y agrupación elegidas. */
export class PresentadorDetalle {
  /**
   * @param app - Estado de la aplicación.
   * @param agrupador - Agrupador temporal del detalle.
   * @param graficoIntereses - Gráfico que depende de la cuenta elegida.
   */
  public constructor(
    private readonly app: EstadoAplicacion,
    private readonly agrupador: AgrupadorDetalle,
    private readonly graficoIntereses: GraficoIntereses,
  ) {}

  /**
   * Escenarios activos en el detalle.
   * @returns Ids `A`/`B`/`C` marcados.
   */
  public escenariosActivos(): EscenarioId[] {
    const botones = Dom.consultaTodos('#detailEsc button.active', HTMLElement);
    return Escenarios.TODOS.filter((id) => botones.some((b) => b.dataset.e === id));
  }

  /**
   * Nivel de agrupación elegido.
   * @returns Nivel activo.
   */
  public nivelActivo(): NivelAgrupacion {
    const valor = Dom.consulta('#detailGroup .active', HTMLElement).dataset.g;
    return PresentadorDetalle.esNivel(valor) ? valor : 'mes';
  }

  /**
   * Una fila por periodo con los tres escenarios (la etiqueta viaja en A).
   * @param cuentaId - Id de la cuenta.
   * @param nivel - Nivel de agrupación.
   * @returns Vista comparada.
   */
  public vista(cuentaId: string, nivel: NivelAgrupacion): VistaDetalleDto {
    const resultados = this.app.resultados?.[cuentaId];
    if (!resultados) throw new Error(`Sin resultados para la cuenta ${cuentaId}`);
    const g = (id: EscenarioId): AgrupacionDto =>
      this.agrupador.agrupar(resultados[id], this.app.estado, nivel);
    const [a, b, c] = [g('A'), g('B'), g('C')];
    const unir = (
      fa: FilaAgrupadaDto | undefined,
      fb: FilaAgrupadaDto | undefined,
      fc: FilaAgrupadaDto | undefined,
    ): PeriodoComparadoDto => {
      if (!fa || !fb || !fc) throw new Error('Agrupación incompleta.');
      return { A: fa, B: fb, C: fc };
    };
    return {
      periodos: a.periodos.map((fa, k) => unir(fa, b.periodos[k], c.periodos[k])),
      total: unir(a.total, b.total, c.total),
    };
  }

  /** Repinta la tabla y el gráfico de intereses. */
  public actualizar(): void {
    if (!this.app.resultados) return;
    this.graficoIntereses.dibujar();
    const cuentaId = Dom.porId('detailAccount', HTMLSelectElement).value;
    const filas = Dom.porId('detailRows');
    const total = Dom.porId('detailTotal');
    if (!cuentaId || !this.app.resultados[cuentaId]) {
      filas.innerHTML = '';
      total.innerHTML = '';
      return;
    }
    const indice = this.app.estado.cuentas.findIndex((a) => a.id === cuentaId);
    const vista = this.vista(cuentaId, this.nivelActivo());
    const activos = this.escenariosActivos();
    const pintar = (p: PeriodoComparadoDto): string =>
      activos.map((id, i) => this.fila(p, id, i, activos.length, indice)).join('');
    filas.innerHTML = vista.periodos.map(pintar).join('');
    total.innerHTML = pintar(vista.total);
  }

  private fila(
    p: PeriodoComparadoDto,
    id: EscenarioId,
    i: number,
    total: number,
    cuenta: number,
  ): string {
    const r = p[id];
    const color = PresentacionCuenta.color(cuenta, id);
    const periodo = i
      ? ''
      : `<td rowspan="${total}" class="col-periodo"><b>${Html.escapar(p.A.label)}</b>${p.A.sub ? `<small>${Html.escapar(p.A.sub)}</small>` : ''}</td>`;
    const num = (v: number): string =>
      v === 0 ? '<span class="cero">0,00 €</span>' : Formateador.dinero(v);
    return `<tr class="fila-esc" style="--c:${color}">${periodo}
      <td><span class="badge-esc">${id}</span></td><td>${Formateador.dinero(r.inicio)}</td><td>${num(r.aportes)}</td><td class="grupo-rem">${num(r.neto)}</td><td class="grupo-rem">${num(r.retencion)}</td><td class="grupo-rem">${num(r.bruto)}</td>
      <td class="grupo-pre">${num(r.cuota)}</td><td class="grupo-pre">${num(r.interesPrestamo)}</td><td class="grupo-pre">${num(r.amortizacion)}</td><td class="grupo-pre">${num(r.deuda)}</td><td>${Formateador.dinero(r.saldo)}</td><td><b class="${r.patrimonio < 0 ? 'negativo' : ''}">${Formateador.dinero(r.patrimonio)}</b></td></tr>`;
  }

  private static esNivel(valor: string | undefined): valor is NivelAgrupacion {
    return ['dia', 'quincena', 'mes', 'trimestre', 'semestre', 'anio'].includes(valor ?? '');
  }
}
