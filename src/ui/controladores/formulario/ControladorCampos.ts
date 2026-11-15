import { CONFIG } from '@/config/Configuracion';
import { PlazoSimulacion } from '@/core/calculo/comun/PlazoSimulacion';
import type { CampoNumericoId } from '@/core/dto/estado/CampoNumericoId';
import type { ActualizadorDiferido } from '../../app/ActualizadorDiferido';
import type { EstadoAplicacion } from '../../app/EstadoAplicacion';
import { Dom } from '../../base/Dom';
import { Stepper } from '../../componentes/comportamiento/Stepper';
import type { ControladorPuntuales } from '../puntuales/ControladorPuntuales';

const CAMPOS = Object.keys(CONFIG.campos) as CampoNumericoId[];

/** Campos numéricos del formulario: límites, deslizadores, validación y plazo. */
export class ControladorCampos {
  /**
   * @param app - Estado de la aplicación.
   * @param puntuales - Calendario de puntuales (depende del plazo).
   * @param actualizador - Recalcula con retardo.
   */
  public constructor(
    private readonly app: EstadoAplicacion,
    private readonly puntuales: ControladorPuntuales,
    private readonly actualizador: ActualizadorDiferido,
  ) {}

  /** Vuelca los límites de la configuración en el DOM. */
  public aplicarConfiguracion(): void {
    for (const id of CAMPOS) {
      const c = CONFIG.campos[id];
      Object.assign(Dom.porId(id, HTMLInputElement), {
        min: c.min,
        max: c.max,
        step: c.step,
        value: c.valor,
      });
      const rango = document.getElementById(`${id}Range`);
      if (rango instanceof HTMLInputElement) {
        Object.assign(rango, { min: c.min, max: c.rangeMax, step: c.step, value: c.valor });
      }
    }
    // Límites visibles en textos: siempre desde la configuración.
    for (const el of Dom.consultaTodos('[data-limite]', HTMLElement)) {
      const clave = el.dataset.limite ?? '';
      const max =
        clave === 'puntual' ? CONFIG.puntual.max : CONFIG.campos[clave as CampoNumericoId].max;
      el.textContent = max.toLocaleString(CONFIG.formato.locale);
    }
  }

  /** Registra los eventos de todos los campos numéricos. */
  public enlazar(): void {
    for (const id of CAMPOS) {
      const el = Dom.porId(id, HTMLInputElement);
      Stepper.instalar(el);
      el.addEventListener('input', () => {
        if (el.value.trim() === '') return;
        const n = Number(el.value);
        if (Number.isFinite(n)) this.fijar(id, n, false);
      });
      el.addEventListener('blur', () => {
        if (el.value.trim() === '') {
          el.value = String(this.app.estado[id]);
          return;
        }
        const n = Number(el.value);
        this.fijar(id, Number.isFinite(n) ? n : this.app.estado[id], true);
        el.value = String(this.app.estado[id]);
      });
      document.getElementById(`${id}Range`)?.addEventListener('input', (e) => {
        if (!(e.target instanceof HTMLInputElement)) return;
        el.value = e.target.value;
        this.fijar(id, Number(e.target.value), false);
      });
    }
  }

  /** Copia el estado a los campos y deslizadores. */
  public sincronizar(): void {
    this.aplicarPlazo();
    for (const id of CAMPOS) {
      Dom.porId(id, HTMLInputElement).value = String(this.app.estado[id]);
      const rango = document.getElementById(`${id}Range`);
      if (rango instanceof HTMLInputElement) {
        if (this.app.estado[id] > Number(rango.max)) rango.max = String(this.app.estado[id]);
        rango.value = String(this.app.estado[id]);
      }
    }
  }

  /** Ajusta paso y valor del plazo según las cuentas. */
  public aplicarPlazo(): void {
    const estado = this.app.estado;
    const paso = PlazoSimulacion.pasoMeses(estado.cuentas);
    for (const id of ['meses', 'mesesRange']) {
      Object.assign(Dom.porId(id, HTMLInputElement), { min: paso, step: paso });
    }
    if (estado.meses % paso) estado.meses = PlazoSimulacion.ajustar(estado.meses, paso);
    Dom.porId('meses', HTMLInputElement).value = String(estado.meses);
    Dom.porId('mesesRange', HTMLInputElement).value = String(estado.meses);
  }

  /**
   * Valida y guarda un campo numérico.
   * @param id - Campo.
   * @param valor - Valor introducido.
   * @param final - `true` al salir del campo (ajusta el plazo).
   */
  private fijar(id: CampoNumericoId, valor: number, final: boolean): void {
    const el = Dom.porId(id, HTMLInputElement);
    const inferior = Number(el.min || 0);
    const superior = el.max ? Number(el.max) : Infinity;
    let n = Math.max(inferior, Math.min(superior, valor));
    if (id === 'meses') {
      // El plazo es múltiplo del periodo más largo; al teclear solo se acepta un múltiplo.
      const paso = PlazoSimulacion.pasoMeses(this.app.estado.cuentas);
      const tope = CONFIG.campos.meses.max;
      n = Math.max(paso, Math.min(tope, Math.round(n)));
      if (n % paso) {
        if (!final) return;
        n = Math.max(paso, Math.min(tope, Math.round(n / paso) * paso));
      }
    }
    this.app.estado[id] = n;
    // Escribir o pegar un valor superior al máximo también lo corrige inmediatamente.
    if (valor !== n) el.value = String(n);
    const rango = document.getElementById(`${id}Range`);
    if (rango instanceof HTMLInputElement) rango.value = String(n);
    if (id === 'meses') this.puntuales.reconstruir();
    this.actualizador.solicitar();
  }
}
