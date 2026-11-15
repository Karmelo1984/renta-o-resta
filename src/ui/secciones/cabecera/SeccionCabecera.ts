import { Icono } from '../../componentes/plantillas/Icono';

/** Cabecera fija con nombre, subtítulo y descripción. */
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
      <span class="sobretitulo">Simulador de ahorro y apalancamiento</span>
      <h1>Renta o Resta</h1>
      <p class="subtitulo">Compara estrategias de ahorro y financiación. Descubre cómo pueden cambiar tus resultados.</p>
    </div>
  </div>
</header>`;
  }
}
