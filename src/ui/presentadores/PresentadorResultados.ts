import { CONFIG } from '@/config/Configuracion';
import type { SimuladorFinanciero } from '@/core/calculo/simulacion/SimuladorFinanciero';
import { CalendarioFinanciero } from '@/core/calculo/calendario/CalendarioFinanciero';
import type { CuentaDto } from '@/core/dto/cuenta/CuentaDto';
import { Escenarios } from '@/core/dto/escenario/Escenarios';
import type { EstadoAplicacion } from '../app/EstadoAplicacion';
import { Dom } from '../base/Dom';
import { Formateador } from '../base/Formateador';
import { Html } from '../base/Html';
import type { GraficoPatrimonio } from '../graficos/GraficoPatrimonio';
import type { PresentadorDetalle } from './PresentadorDetalle';
import type { PresentadorFranja } from './PresentadorFranja';
import { PresentacionCuenta } from './PresentacionCuenta';

/** Recalcula y pinta todos los resultados: matriz de tarjetas, umbrales, avisos y gráficos. */
export class PresentadorResultados {
  private clavesChecks: string | null = null;

  /**
   * @param app - Estado de la aplicación.
   * @param simulador - Motor de cálculo (para el umbral de financiación).
   * @param detalle - Presentador de la tabla de detalle.
   * @param franja - Presentador de la franja resumen.
   * @param grafico - Gráfico de patrimonio.
   */
  public constructor(
    private readonly app: EstadoAplicacion,
    private readonly simulador: SimuladorFinanciero,
    private readonly detalle: PresentadorDetalle,
    private readonly franja: PresentadorFranja,
    private readonly grafico: GraficoPatrimonio,
  ) {}

  /** Recalcula y pinta todos los resultados. */
  public render(): void {
    const s = this.app.estado;
    this.franja.render();
    const actuales = this.app.calcular();
    const real = s.calendario === 'real';
    const ultimo = CalendarioFinanciero.construir(s, s.meses).at(-1);
    Dom.porId('closingText').textContent = real
      ? `último día de ${ultimo?.label ?? ''}`
      : `día 30 del Mes ${s.meses}`;
    Dom.porId('calChip').textContent = real
      ? 'Calendario real · base 365/366'
      : '30 días/mes · 360 días/año';
    const n = s.cuentas.length;
    const select = Dom.porId('detailAccount', HTMLSelectElement);
    const previa = select.value;
    select.innerHTML = s.cuentas
      .map(
        (a) =>
          `<option value="${a.id}">${Html.escapar(PresentacionCuenta.nombre(a))} · ${a.ingreso}</option>`,
      )
      .join('');
    if (s.cuentas.some((a) => a.id === previa)) select.value = previa;
    Dom.porId('accountHead').style.setProperty('--n', String(n));
    Dom.porId('resultMatrix').style.setProperty('--n', String(n));
    this.pintarSeries(s.cuentas);
    const aviso = Dom.porId('warning');
    if (!n) {
      Dom.porId('accountHead').innerHTML = '';
      Dom.porId('resultMatrix').innerHTML =
        '<div class="aviso"><span class="aviso-marca">i</span><div>No hay cuentas remuneradas. Añade una en «Cuentas remuneradas» para ver los resultados.</div></div>';
      Dom.porId('thresholds').innerHTML = '';
      aviso.hidden = true;
      this.detalle.actualizar();
      this.grafico.dibujar();
      return;
    }
    Dom.porId('accountHead').innerHTML =
      '<span>Escenario</span>' +
      s.cuentas
        .map(
          (a, i) =>
            `<span style="color:${PresentacionCuenta.color(i, 'B')}">${Html.escapar(PresentacionCuenta.nombre(a))} · ${PresentacionCuenta.liquidacion(a.ingreso)}</span>`,
        )
        .join('');
    let tarjetas = '';
    for (const id of Escenarios.TODOS) {
      tarjetas += `<div class="matriz-fila"><div class="matriz-etiqueta"><strong>${id}</strong><span>${Html.escapar(Escenarios.etiqueta(id).slice(4))}</span></div>`;
      s.cuentas.forEach((a, i) => {
        const r = actuales[a.id]?.[id];
        if (!r) return;
        const nombre = PresentacionCuenta.nombre(a);
        tarjetas += `<article class="resultado-card" style="--c:${PresentacionCuenta.color(i, 'B')}" aria-label="Escenario ${id}, ${Html.escapar(nombre)}">
        <div class="rc-titulo">${Html.escapar(nombre)} · ${PresentacionCuenta.liquidacion(a.ingreso)}</div>
        <div class="rc-principal">${Formateador.dinero(r.patrimonio)}</div>
        <div class="rc-beneficio ${r.beneficio >= 0 ? 'positivo' : 'negativo'}">Beneficio neto: ${Formateador.conSigno(r.beneficio)}</div>
        <div class="rc-extra"><span>Saldo disponible</span><b>${Formateador.dinero(r.saldo)}</b>
          <span>Interés neto total</span><b>${Formateador.dinero(r.netoAbonado)}</b>
          <span>Retención total</span><b>${Formateador.dinero(r.retencionAbonada)}</b>
          <span>Aportaciones periódicas</span><b>${Formateador.dinero(r.aportacionPeriodica)}</b>
          <span>Aportaciones extra</span><b>${Formateador.dinero(r.aportacionPuntual)}</b>
        </div>
      </article>`;
      });
      tarjetas += '</div>';
    }
    Dom.porId('resultMatrix').innerHTML = tarjetas;
    const umbrales: string[] = [];
    const avisos: string[] = [];
    for (const a of s.cuentas) {
      const grupo = actuales[a.id];
      const nombre = PresentacionCuenta.nombre(a);
      const limite = this.simulador.umbralFinanciacion(s, a.id);
      const estado = limite === null ? 'na' : s.tinPrestamo <= limite ? 'ok' : 'bad';
      umbrales.push(
        `<div class="umbral ${estado}" title="TIN máximo del préstamo al que C iguala a B (mismas aportaciones, sin préstamo)"><span>TIN máx. rentable<br><b>${Html.escapar(nombre)}</b></span><strong>${limite === null ? 'No evaluable' : Formateador.porcentaje(limite, CONFIG.formato.decimalesPctCorto)}</strong></div>`,
      );
      for (const id of Escenarios.TODOS) {
        if (grupo?.[id].descubierto) avisos.push(`${id} con ${nombre}`);
      }
    }
    Dom.porId('thresholds').innerHTML = umbrales.join('');
    aviso.hidden = avisos.length === 0;
    aviso.textContent = avisos.length
      ? `Atención: existe saldo negativo en ${avisos.join(', ')}. La cuenta no puede cubrir todas las retiradas sin financiación externa. No se modelan descubiertos ni sus costes.`
      : '';
    this.detalle.actualizar();
    this.grafico.dibujar();
  }

  /** Regenera las casillas del gráfico solo si cambian las cuentas. */
  private pintarSeries(cuentas: readonly CuentaDto[]): void {
    const clave = cuentas
      .map((a) => `${a.id}|${PresentacionCuenta.nombre(a)}|${a.ingreso}`)
      .join(';');
    if (clave === this.clavesChecks) return;
    const caja = Dom.porId('chartChecks');
    const marcadas = new Set(
      Dom.consultaTodos('input:checked', HTMLInputElement, caja).map((i) => i.dataset.k),
    );
    const primera = this.clavesChecks === null;
    this.clavesChecks = clave;
    const series: readonly (readonly [string, string])[] = [
      ['A', 'Capital'],
      ['B', 'Aportaciones'],
      ['C', 'Préstamo'],
    ];
    caja.innerHTML = cuentas
      .map((a, i) => {
        const etiquetas = series
          .map(([c, texto]) => {
            const k = `${a.id}-${c}`;
            const activa = marcadas.has(k) || (primera && i === 0);
            const color = PresentacionCuenta.color(
              i,
              c === 'A' || c === 'B' || c === 'C' ? c : 'A',
            );
            return `<label class="serie" style="--c:${color}"><input type="checkbox" data-k="${k}"${activa ? ' checked' : ''}><i></i>${c} · ${texto}</label>`;
          })
          .join('');
        return `<div class="series-fila"><span class="series-etiqueta">${Html.escapar(PresentacionCuenta.nombre(a))}</span>${etiquetas}</div>`;
      })
      .join('');
  }
}
