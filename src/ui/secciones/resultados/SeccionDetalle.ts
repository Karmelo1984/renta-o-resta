import { Boton } from '../../componentes/plantillas/Boton';
import { ControlSegmentado } from '../../componentes/plantillas/ControlSegmentado';
import { Selector } from '../../componentes/plantillas/Selector';

/** Tarjeta del detalle financiero comparativo (tabla con A, B y C). */
export class SeccionDetalle {
  private static readonly COLUMNAS: readonly (readonly [string, string])[] = [
    ['Período', ''],
    ['Escenario', ''],
    ['Saldo inicial', ''],
    ['Aportes', ''],
    ['Interés neto', 'grupo-rem'],
    ['Retención', 'grupo-rem'],
    ['Interés bruto', 'grupo-rem'],
    ['Cuota préstamo', 'grupo-pre'],
    ['Interés préstamo', 'grupo-pre'],
    ['Capital amortizado', 'grupo-pre'],
    ['Capital pendiente', 'grupo-pre'],
    ['Saldo final', ''],
    ['Patrimonio', ''],
  ];

  /**
   * HTML de la sección.
   * @returns Elemento `<section>`.
   */
  public render(): string {
    const cabeceras = SeccionDetalle.COLUMNAS.map(
      ([texto, clase]) => `<th${clase ? ` class="${clase}"` : ''}>${texto}</th>`,
    ).join('');
    return `<section class="tarjeta detalle" aria-labelledby="detailTitle">
  <div class="detalle-cabecera">
    <div>
      <h2 id="detailTitle">Detalle financiero comparativo</h2>
      <p class="texto-pequeno">Escenarios A, B y C por período: saldos, aportes, intereses, cuotas, deuda y patrimonio</p>
    </div>
    <div class="detalle-acciones">${Boton.render({ id: 'exportCsv', variante: 'primario', icono: 'down', texto: 'CSV' })}</div>
  </div>
  <div class="selectores-detalle">
    <div class="selector-detalle"><label class="etiqueta-mayus" for="detailAccount">Cuenta</label>${Selector.render('detailAccount')}</div>
    <div class="selector-detalle">
      <span class="etiqueta-mayus" id="escLabel">Escenarios</span>
      ${ControlSegmentado.render({
        id: 'detailEsc',
        clave: 'e',
        etiquetadoPor: 'escLabel',
        conmutador: true,
        clase: 'segmentado-compacto segmentado-3',
        opciones: [
          { valor: 'A', texto: 'A', activa: true },
          { valor: 'B', texto: 'B', activa: true },
          { valor: 'C', texto: 'C', activa: true },
        ],
      })}
    </div>
    <div class="selector-detalle">
      <span class="etiqueta-mayus" id="groupLabel">Agrupación</span>
      ${ControlSegmentado.render({
        id: 'detailGroup',
        clave: 'g',
        etiquetadoPor: 'groupLabel',
        clase: 'segmentado-compacto',
        opciones: [
          { valor: 'dia', texto: 'Día' },
          { valor: 'quincena', texto: 'Quincena' },
          { valor: 'mes', texto: 'Mes', activa: true },
          { valor: 'trimestre', texto: 'Trimestre' },
          { valor: 'semestre', texto: 'Semestre' },
          { valor: 'anio', texto: 'Año' },
        ],
      })}
    </div>
  </div>
  <div class="tabla-scroll">
    <table class="tabla-detalle">
      <thead><tr>${cabeceras}</tr></thead>
      <tbody id="detailRows"></tbody>
      <tfoot id="detailTotal"></tfoot>
    </table>
  </div>
  <p class="ayuda">Los flujos (aportes, intereses, retención, cuota = intereses del préstamo + capital amortizado) suman todo el período; saldo inicial, capital pendiente y saldo final son los del inicio y el cierre. Los intereses son los <b>abonados</b> en el período. <b>Patrimonio</b> = saldo final + interés neto devengado pendiente de abono − capital pendiente.</p>
</section>`;
  }
}
