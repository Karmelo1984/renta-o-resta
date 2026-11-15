/** Desplegable con la metodología y el calendario exacto. */
export class SeccionMetodologia {
  /**
   * HTML de la sección.
   * @returns Elemento `<details>`.
   */
  public render(): string {
    return `<details class="tarjeta metodologia">
  <summary>Metodología y calendario exacto (leer antes de interpretar los resultados)</summary>
  <ul>
    <li><b>Calendario:</b> meses de 30 días, años de 360. Sin fechas reales ni bisiestos.</li>
    <li><b>Calendario real</b> (opcional): meses naturales desde el mes de inicio; devengo sobre días reales con base 365/366 según el año; cuota y abono mensual el último día del mes.</li>
    <li><b>Capital inicial (día 1, Mes 1):</b> A y B igual; C = capital de B + préstamo.</li>
    <li><b>Aportaciones:</b> solo B y C, día 1. Periódicas en Meses 1 a N; puntuales en el mes elegido.</li>
    <li><b>Cálculo y ingreso:</b> cada cuenta tiene un periodo de cálculo (diario, mensual, anual) y uno de ingreso (diario, mensual, anual), este nunca más frecuente que el cálculo. Los intereses se abonan netos de retención el último día del periodo de ingreso y cuentan para el saldo desde el día siguiente.</li>
    <li><b>Saldo medio:</b> devengo diario <code>max(0, saldo) × TIN / base</code> acumulado hasta el ingreso, sin capitalizar dentro del periodo.</li>
    <li><b>Saldo a cierre</b> (cálculo mensual o anual): al fin del periodo, <code>max(0, saldo) × TIN / 12</code> (mensual) o <code>× TIN</code> (anual), con el saldo tras aportaciones y cuota y antes del abono. Se abona en el periodo de ingreso.</li>
    <li><b>Plazo:</b> debe ser múltiplo de 12 meses si alguna cuenta calcula o ingresa anualmente. El año de ingreso son 12 meses desde el inicio.</li>
    <li><b>Orden del día:</b> aportaciones (día 1) → devengo sobre el saldo resultante → abono del neto (según el ingreso de cada cuenta) → cuota (día 30, <b>después</b> del devengo). Fin: último día del Mes N.</li>
    <li><b>Préstamo:</b> cuota francesa con tipo TIN/12, pagada el día 30 de los Meses 1 a N; la última cuota cancela el principal. Intereses y cuotas afectan al saldo posterior.</li>
    <li><b>Redondeo:</b> a céntimos en bruto, retención y neto de cada liquidación. El bruto diario no se redondea antes de acumular. Puede diferir de bancos con otras reglas.</li>
    <li><b>Patrimonio</b> al cierre = saldo disponible − deuda pendiente (todo el interés ya abonado).</li>
    <li><b>Umbral de TIN:</b> compara C contra B (mismas aportaciones, mismas fechas), aislando la rentabilidad del apalancamiento.</li>
    <li><b>Descubierto:</b> se avisa. No se modelan comisiones ni remuneración de saldos negativos; la operación podría ser inviable.</li>
  </ul>
</details>`;
  }
}
