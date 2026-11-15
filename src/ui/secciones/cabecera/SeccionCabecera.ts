import { Icono } from '../../componentes/plantillas/Icono';

/** Cabecera fija con marca, título y subtítulo. */
export class SeccionCabecera {
  /**
   * HTML de la sección.
   * @returns Elemento `<header>`.
   */
  public render(): string {
    return `<header class="cabecera">
  <div class="cabecera-marca">
    <span class="cabecera-icono" aria-hidden="true">${Icono.render('growth')}</span>
    <div class="cabecera-contenido">
      <span class="sobretitulo">Herramienta de simulación financiera</span>
      <h1>Simulador de ahorro y apalancamiento</h1>
      <p class="subtitulo">Explora cómo evoluciona tu dinero con cuentas remuneradas, aportaciones y financiación. Compara tres escenarios y descubre cuándo un préstamo puede mejorar —o empeorar— tu rentabilidad.</p>
    </div>
  </div>
</header>`;
  }
}
