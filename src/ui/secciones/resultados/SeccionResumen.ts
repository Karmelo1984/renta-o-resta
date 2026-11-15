import { Aviso } from '../../componentes/plantillas/Aviso';

/** Resumen de resultados: explicación de escenarios y matriz de tarjetas. */
export class SeccionResumen {
  private static readonly ESCENARIOS: readonly (readonly [string, string, string])[] = [
    ['A', 'Ahorro inicial', 'El capital inicial genera intereses, sin aportaciones posteriores.'],
    [
      'B',
      'Ahorro con aportaciones',
      'Suma aportaciones periódicas y puntuales al capital inicial.',
    ],
    [
      'C',
      'Ahorro con préstamo',
      'Repite las aportaciones de B, añade un préstamo y descuenta sus cuotas del saldo.',
    ],
  ];

  /**
   * HTML de la sección.
   * @returns Elemento `<section>` con tarjeta de resumen.
   */
  public render(): string {
    const items = SeccionResumen.ESCENARIOS.map(
      ([letra, nombre, descripcion]) => `<div class="escenario-item">
  <span class="escenario-letra">${letra}</span>
  <div class="min-w-0"><div class="escenario-nombre">${nombre}</div><p class="escenario-descripcion">${descripcion}</p></div>
</div>`,
    ).join('');
    return `<section class="tarjeta resumen" aria-labelledby="summaryTitle">
  <div class="resumen-cabecera">
    <div>
      <div class="sobretitulo">Resultados de la simulación</div>
      <h2 id="summaryTitle">Comparativa de escenarios</h2>
      <p class="texto-pequeno">Fin de la simulación: <span id="closingText"></span>.</p>
    </div>
    <span class="chip" id="calChip"></span>
  </div>
  <div class="escenarios-intro">
    <h3 class="escenarios-titulo">Qué se está comparando</h3>
    <div class="escenarios-rejilla">${items}</div>
    <p class="escenarios-nota">B y C reciben las mismas aportaciones. Comparar C con B permite aislar el efecto del préstamo.</p>
  </div>
  <div class="matriz-cabecera" id="accountHead"></div>
  <div id="resultMatrix" class="matriz" aria-live="polite"></div>
  ${Aviso.render('Las tarjetas muestran el patrimonio al cierre: saldo disponible menos deuda pendiente. El beneficio neto descuenta el capital inicial y las aportaciones propias.')}
  <div id="warning" class="aviso aviso-warn" hidden role="alert"></div>
</section>`;
  }
}
