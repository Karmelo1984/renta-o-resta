/** Tarjeta del gráfico de evolución del patrimonio. */
export class SeccionGraficoPatrimonio {
  /**
   * HTML de la sección.
   * @returns Elemento `<section>`.
   */
  public render(): string {
    return `<section class="tarjeta grafico-tarjeta" aria-labelledby="chartTitle">
  <div class="grafico-cabecera">
    <div>
      <h2 id="chartTitle">Evolución del patrimonio neto</h2>
      <p class="texto-pequeno">Deuda pendiente descontada</p>
    </div>
  </div>
  <div class="series-grupos" id="chartChecks"></div>
  <div class="grafico-caja" id="chartWrap">
    <canvas id="chart" role="img" aria-label="Gráfico del patrimonio de los escenarios A, B y C en cada mes"></canvas>
    <div class="grafico-tooltip" id="chartTooltip"></div>
  </div>
</section>`;
  }
}
