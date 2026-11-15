import { CONFIG } from '@/config/Configuracion';
import { PlazoSimulacion } from '@/core/calculo/comun/PlazoSimulacion';
import type { MetodoCalculo } from '@/core/dto/cuenta/MetodoCalculo';
import type { NuevaCuentaDto } from '@/core/dto/cuenta/NuevaCuentaDto';
import type { PeriodoLiquidacion } from '@/core/dto/cuenta/PeriodoLiquidacion';
import type { EstadoAplicacion } from '../../app/EstadoAplicacion';
import { Dom } from '../../base/Dom';

/** Candidata del formulario del modal; el TIN es `NaN` si el campo está vacío. */
interface CandidataCuenta extends NuevaCuentaDto {
  readonly tinValido: boolean;
}

/** Modal de alta de una cuenta remunerada: validación en vivo y creación. */
export class ControladorModalCuenta {
  /**
   * @param app - Estado de la aplicación.
   * @param alCrear - Callback tras añadir la cuenta (repinta lista, plazo y resultados).
   */
  public constructor(
    private readonly app: EstadoAplicacion,
    private readonly alCrear: () => void,
  ) {}

  /** Registra los eventos del botón «Añadir cuenta» y del modal. */
  public enlazar(): void {
    const dialogo = Dom.porId('accountModal', HTMLDialogElement);
    Dom.porId('accNombre', HTMLInputElement).maxLength = CONFIG.cuentas.maxLength;
    Dom.porId('addAccount').addEventListener('click', () => {
      this.abrir();
    });
    Dom.porId('accCancelar').addEventListener('click', () => {
      dialogo.close();
    });
    dialogo.addEventListener('click', (e) => {
      if (e.target === dialogo) dialogo.close();
    });
    for (const id of ['accNombre', 'accTin', 'accCalculo', 'accIngreso']) {
      Dom.porId(id).addEventListener('input', () => {
        this.validar();
      });
    }
    const metodo = Dom.porId('accMetodo');
    metodo.addEventListener('click', (e) => {
      const boton = e.target instanceof Element ? e.target.closest('button') : null;
      if (!boton) return;
      for (const x of metodo.children) x.classList.toggle('active', x === boton);
      this.validar();
    });
    Dom.porId('accountForm', HTMLFormElement).addEventListener('submit', (e) => {
      e.preventDefault();
      this.validar();
      if (Dom.porId('accCrear', HTMLButtonElement).disabled) return;
      const nueva = this.leer();
      const usados = new Set(this.app.estado.cuentas.map((a) => a.id));
      let k = 1;
      while (usados.has(`c${k}`)) k++;
      this.app.estado.cuentas.push({
        id: `c${k}`,
        nombre: nueva.nombre,
        tin: nueva.tin,
        calculo: nueva.calculo,
        metodo: nueva.metodo,
        ingreso: nueva.ingreso,
      });
      dialogo.close();
      this.alCrear();
    });
  }

  /** Abre el modal con los valores por defecto. */
  private abrir(): void {
    Dom.porId('accNombre', HTMLInputElement).value = '';
    Dom.porId('accTin', HTMLInputElement).value = String(CONFIG.cuentas.tin.valor);
    Dom.porId('accCalculo', HTMLSelectElement).value = 'diario';
    Dom.porId('accIngreso', HTMLSelectElement).value = 'mensual';
    for (const b of Dom.porId('accMetodo').children) {
      b.classList.toggle('active', b instanceof HTMLElement && b.dataset.m === 'medio');
    }
    this.validar();
    Dom.porId('accountModal', HTMLDialogElement).showModal();
    Dom.porId('accNombre').focus();
  }

  /** Lee el formulario del modal. */
  private leer(): CandidataCuenta {
    const texto = Dom.porId('accTin', HTMLInputElement).value.trim();
    const calculo = this.periodo(Dom.porId('accCalculo', HTMLSelectElement).value);
    const metodo: MetodoCalculo =
      Dom.consulta('#accMetodo .active', HTMLElement).dataset.m === 'cierre' ? 'cierre' : 'medio';
    return {
      nombre: Dom.porId('accNombre', HTMLInputElement).value.trim(),
      tin: texto === '' ? NaN : Number(texto),
      tinValido: texto !== '',
      calculo,
      metodo: calculo === 'diario' ? 'medio' : metodo,
      ingreso: this.periodo(Dom.porId('accIngreso', HTMLSelectElement).value),
    };
  }

  private periodo(valor: string): PeriodoLiquidacion {
    return valor === 'mensual' || valor === 'anual' ? valor : 'diario';
  }

  /** Valida el modal y actualiza avisos y botón. */
  private validar(): void {
    const calculo = this.periodo(Dom.porId('accCalculo', HTMLSelectElement).value);
    const ingreso = Dom.porId('accIngreso', HTMLSelectElement);
    Dom.porId('accMetodoField').hidden = calculo === 'diario';
    // El ingreso no puede ser más frecuente que el cálculo.
    for (const o of ingreso.options) {
      const oculta = PlazoSimulacion.RANGO[this.periodo(o.value)] < PlazoSimulacion.RANGO[calculo];
      o.hidden = oculta;
      o.disabled = oculta;
    }
    if (PlazoSimulacion.RANGO[this.periodo(ingreso.value)] < PlazoSimulacion.RANGO[calculo]) {
      ingreso.value = calculo;
    }
    const v = this.leer();
    const paso = PlazoSimulacion.pasoMeses([v]);
    const meses = this.app.estado.meses;
    const nota = Dom.porId('accNota');
    nota.hidden = meses % paso === 0;
    const texto = nota.querySelector('div');
    if (texto) {
      texto.textContent = `El plazo se ajustará de ${meses} a ${PlazoSimulacion.ajustar(meses, paso)} meses (múltiplo de ${paso}).`;
    }
    const t = CONFIG.cuentas.tin;
    let error = '';
    if (!v.nombre) error = 'Indica un nombre.';
    else if (!v.tinValido || v.tin < t.min || v.tin > t.max) {
      error = `El TIN debe estar entre ${t.min} y ${t.max} %.`;
    } else if (this.app.estado.cuentas.length >= CONFIG.cuentas.max) {
      error = `Máximo ${CONFIG.cuentas.max} cuentas.`;
    }
    Dom.porId('accError').textContent = error;
    Dom.porId('accCrear', HTMLButtonElement).disabled = error !== '';
  }
}
