import { CONFIG } from '@/config/Configuracion';
import { AgrupadorDetalle } from '@/core/calculo/detalle/AgrupadorDetalle';
import { SimuladorFinanciero } from '@/core/calculo/simulacion/SimuladorFinanciero';
import { Logger } from '@/core/log/Logger';
import { ExportadorCsv } from '@/services/archivos/ExportadorCsv';
import { DialogoConfirmacion } from '../componentes/comportamiento/DialogoConfirmacion';
import { ControladorCuentas } from '../controladores/cuentas/ControladorCuentas';
import { ControladorModalCuenta } from '../controladores/cuentas/ControladorModalCuenta';
import { ControladorDetalle } from '../controladores/detalle/ControladorDetalle';
import { ControladorCampos } from '../controladores/formulario/ControladorCampos';
import { ControladorFormulario } from '../controladores/formulario/ControladorFormulario';
import { ControladorPanel } from '../controladores/panel/ControladorPanel';
import { ControladorPuntuales } from '../controladores/puntuales/ControladorPuntuales';
import { GraficoIntereses } from '../graficos/GraficoIntereses';
import { GraficoPatrimonio } from '../graficos/GraficoPatrimonio';
import { PresentadorDetalle } from '../presentadores/PresentadorDetalle';
import { PresentadorFranja } from '../presentadores/PresentadorFranja';
import { PresentadorResultados } from '../presentadores/PresentadorResultados';
import { PlantillaPagina } from '../secciones/PlantillaPagina';
import { ActualizadorDiferido } from './ActualizadorDiferido';
import { EstadoAplicacion } from './EstadoAplicacion';

/** Raíz de composición: construye las dependencias, monta la página y arranca la aplicación. */
export class Aplicacion {
  private readonly log = new Logger('app');

  /**
   * @param raiz - Elemento donde se monta la aplicación.
   */
  public constructor(private readonly raiz: HTMLElement) {}

  /** Monta la página, enlaza los controladores y pinta el primer resultado. */
  public iniciar(): void {
    this.log.info('Iniciando aplicación', { nivelLog: Logger.obtenerNivel() });
    new PlantillaPagina().montar(this.raiz);

    const simulador = new SimuladorFinanciero();
    const app = new EstadoAplicacion(simulador);
    const graficoPatrimonio = new GraficoPatrimonio(app);
    const graficoIntereses = new GraficoIntereses(app);
    const detalle = new PresentadorDetalle(app, new AgrupadorDetalle(), graficoIntereses);
    const franja = new PresentadorFranja(app);
    const resultados = new PresentadorResultados(
      app,
      simulador,
      detalle,
      franja,
      graficoPatrimonio,
    );
    const recalcularYa = (): void => {
      resultados.render();
    };
    const diferido = new ActualizadorDiferido(recalcularYa, CONFIG.ui.debounceMs);
    const dialogo = new DialogoConfirmacion();

    const puntuales = new ControladorPuntuales(app, diferido, recalcularYa);
    const campos = new ControladorCampos(app, puntuales, diferido);
    const cuentas = new ControladorCuentas(app, campos, puntuales, dialogo, diferido, recalcularYa);
    const modalCuenta = new ControladorModalCuenta(app, () => {
      cuentas.render();
      campos.aplicarPlazo();
      puntuales.reconstruir();
      recalcularYa();
    });
    const formulario = new ControladorFormulario(
      app,
      campos,
      cuentas,
      puntuales,
      dialogo,
      diferido,
      recalcularYa,
    );
    const detalleCtrl = new ControladorDetalle(
      app,
      detalle,
      graficoPatrimonio,
      new ExportadorCsv(),
    );

    campos.aplicarConfiguracion();
    campos.enlazar();
    cuentas.enlazar();
    modalCuenta.enlazar();
    puntuales.enlazar();
    formulario.enlazar();
    detalleCtrl.enlazar();
    new ControladorPanel(franja).enlazar();
    graficoPatrimonio.iniciar();
    graficoIntereses.iniciar();
    formulario.sincronizar();
    detalleCtrl.sincronizarEscenarios();
    recalcularYa();
  }
}
