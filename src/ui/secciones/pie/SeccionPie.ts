/** Pie de página con el aviso legal de las estimaciones. */
export class SeccionPie {
  /**
   * HTML de la sección.
   * @returns Elemento `<footer>`.
   */
  public render(): string {
    return `<footer class="pie">
  <div>
    <h2 class="pie-titulo">Sobre los resultados</h2>
    <p class="pie-descripcion">Este simulador genera estimaciones a partir de los parámetros que configures. No garantiza rentabilidad y sus resultados pueden diferir de los de una entidad financiera.</p>
    <p class="pie-limitaciones">Los cálculos no incluyen comisiones, seguros, penalizaciones, cambios de tipos ni límites de remuneración. La retención elegida puede no coincidir con la tributación definitiva.</p>
  </div>
  <div class="pie-base">
    <strong class="pie-marca">Renta o Resta</strong>
    <span class="pie-leyenda">Simulador de ahorro y apalancamiento · Los números deciden.</span>
  </div>
</footer>`;
  }
}
