import { FabricaEstado } from '@/core/calculo/simulacion/FabricaEstado';
import type { SimuladorFinanciero } from '@/core/calculo/simulacion/SimuladorFinanciero';
import type { EstadoSimulacionDto } from '@/core/dto/estado/EstadoSimulacionDto';
import type { ResultadosPorCuentaDto } from '@/core/dto/resultado/ResultadosPorCuentaDto';

/** Estado mutable de la aplicación: datos de entrada y últimos resultados calculados. */
export class EstadoAplicacion {
  /** Datos de entrada de la simulación (la referencia no cambia nunca). */
  public readonly estado: EstadoSimulacionDto = FabricaEstado.crearInicial();
  private ultimos: ResultadosPorCuentaDto | null = null;

  /**
   * @param simulador - Motor de cálculo.
   */
  public constructor(private readonly simulador: SimuladorFinanciero) {}

  /**
   * Últimos resultados calculados.
   * @returns Resultados por cuenta o `null` si aún no se calculó.
   */
  public get resultados(): ResultadosPorCuentaDto | null {
    return this.ultimos;
  }

  /**
   * Recalcula todos los escenarios con el estado actual.
   * @returns Resultados por cuenta.
   */
  public calcular(): ResultadosPorCuentaDto {
    this.ultimos = this.simulador.simularTodos(this.estado);
    return this.ultimos;
  }

  /** Restablece el estado a los valores por defecto conservando la referencia. */
  public reiniciar(): void {
    Object.assign(this.estado, FabricaEstado.crearInicial());
  }
}
