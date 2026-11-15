import { ControlSegmentado } from '../../componentes/plantillas/ControlSegmentado';

/** Tarjeta del gráfico de interés neto frente a interés del préstamo. */
export class SeccionGraficoIntereses {
  /**
   * HTML de la sección.
   * @returns Elemento `<section>`.
   */
  public render(): string {
    return `<section class="tarjeta grafico-tarjeta" aria-labelledby="intTitle">
  <div class="grafico-cabecera">
    <div>
      <h2 id="intTitle">Interés neto vs interés del préstamo</h2>
      <p class="texto-pequeno">Escenario C de la cuenta elegida en el detalle</p>
      <div class="leyenda">
        <span><i class="bg-remuneracion"></i>Interés neto</span>
        <span><i class="bg-prestamo"></i>Interés préstamo</span>
      </div>
    </div>
    ${ControlSegmentado.render({
      id: 'intMode',
      clave: 'm',
      ariaLabel: 'Tipo de valor',
      opciones: [
        { valor: 'mes', texto: 'Mensual', activa: true },
        { valor: 'acum', texto: 'Acumulado' },
      ],
    })}
  </div>
  <div class="grafico-caja">
    <canvas id="intChart" role="img" aria-label="Interés neto frente a interés del préstamo en cada mes"></canvas>
    <div class="grafico-tooltip" id="intTooltip"></div>
  </div>
</section>`;
  }
}
