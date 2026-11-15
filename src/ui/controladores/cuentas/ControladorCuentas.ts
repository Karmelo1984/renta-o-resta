import { CONFIG } from '@/config/Configuracion';
import type { CuentaDto } from '@/core/dto/cuenta/CuentaDto';
import type { ActualizadorDiferido } from '../../app/ActualizadorDiferido';
import type { EstadoAplicacion } from '../../app/EstadoAplicacion';
import { Dom } from '../../base/Dom';
import { Html } from '../../base/Html';
import type { DialogoConfirmacion } from '../../componentes/comportamiento/DialogoConfirmacion';
import { Stepper } from '../../componentes/comportamiento/Stepper';
import { Icono } from '../../componentes/plantillas/Icono';
import { PresentacionCuenta } from '../../presentadores/PresentacionCuenta';
import type { ControladorCampos } from '../formulario/ControladorCampos';
import type { ControladorPuntuales } from '../puntuales/ControladorPuntuales';

/** Lista de cuentas remuneradas del panel: TIN editable y eliminación con confirmación. */
export class ControladorCuentas {
  /**
   * @param app - Estado de la aplicación.
   * @param campos - Controlador de campos (reajusta el plazo).
   * @param puntuales - Calendario de puntuales.
   * @param dialogo - Confirmación modal.
   * @param actualizador - Recalcula con retardo.
   * @param recalcularYa - Recalcula inmediatamente.
   */
  public constructor(
    private readonly app: EstadoAplicacion,
    private readonly campos: ControladorCampos,
    private readonly puntuales: ControladorPuntuales,
    private readonly dialogo: DialogoConfirmacion,
    private readonly actualizador: ActualizadorDiferido,
    private readonly recalcularYa: () => void,
  ) {}

  /** Registra los eventos de la lista. */
  public enlazar(): void {
    const lista = Dom.porId('accountList');
    lista.addEventListener('input', (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || !el.dataset.acc) return;
      const cuenta = this.buscar(el);
      if (!cuenta) return;
      if (el.type === 'range') Dom.porId(`tin-${cuenta.id}`, HTMLInputElement).value = el.value;
      else if (el.value.trim() === '') return;
      const n = Number(el.value);
      if (Number.isFinite(n)) this.fijarTin(cuenta, n, false);
    });
    lista.addEventListener('focusout', (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || el.type !== 'number' || !el.dataset.acc) return;
      const cuenta = this.buscar(el);
      if (!cuenta) return;
      if (el.value.trim() === '') el.value = String(cuenta.tin);
      else
        this.fijarTin(
          cuenta,
          Number.isFinite(Number(el.value)) ? Number(el.value) : cuenta.tin,
          true,
        );
    });
    lista.addEventListener('click', (e) => {
      const boton =
        e.target instanceof Element ? e.target.closest<HTMLElement>('.cuenta-eliminar') : null;
      const cuenta = boton && this.buscar(boton);
      if (cuenta) void this.eliminar(cuenta);
    });
  }

  /** Pinta la lista de cuentas. */
  public render(): void {
    const t = CONFIG.cuentas.tin;
    const cuentas = this.app.estado.cuentas;
    Dom.porId('accountList').innerHTML = cuentas
      .map((a, i) => {
        const nombre = Html.escapar(PresentacionCuenta.nombre(a));
        return `<div class="cuenta-tarjeta" style="--c:${PresentacionCuenta.color(i, 'B')}">
  <div class="cuenta-cabecera"><div class="cuenta-titulo"><strong>${nombre}</strong><span>${Html.escapar(PresentacionCuenta.describir(a))}</span></div><button type="button" class="boton boton-peligro cuenta-eliminar" data-acc="${a.id}" aria-label="Eliminar ${nombre}" title="Eliminar cuenta">${Icono.render('trash')}</button></div>
  <div class="campo"><div class="campo-linea"><label class="campo-etiqueta" for="tin-${a.id}">TIN</label><div class="entrada-num"><input id="tin-${a.id}" type="number" data-acc="${a.id}"><span>%</span></div></div><input class="deslizador" type="range" id="tin-${a.id}Range" data-acc="${a.id}" aria-label="TIN ${nombre}"></div></div>`;
      })
      .join('');
    for (const a of cuentas) {
      const numero = Dom.porId(`tin-${a.id}`, HTMLInputElement);
      const rango = Dom.porId(`tin-${a.id}Range`, HTMLInputElement);
      Object.assign(numero, { min: t.min, max: t.max, step: t.step, value: a.tin });
      Object.assign(rango, {
        min: t.min,
        max: Math.max(t.rangeMax, a.tin),
        step: t.step,
        value: a.tin,
      });
      Stepper.instalar(numero);
    }
    Dom.porId('accountEmpty').hidden = cuentas.length > 0;
    Dom.porId('addAccount', HTMLButtonElement).disabled = cuentas.length >= CONFIG.cuentas.max;
  }

  private buscar(el: HTMLElement): CuentaDto | undefined {
    return this.app.estado.cuentas.find((a) => a.id === el.dataset.acc);
  }

  private fijarTin(cuenta: CuentaDto, valor: number, final: boolean): void {
    const t = CONFIG.cuentas.tin;
    const n = Math.max(t.min, Math.min(t.max, valor));
    const entrada = Dom.porId(`tin-${cuenta.id}`, HTMLInputElement);
    const rango = Dom.porId(`tin-${cuenta.id}Range`, HTMLInputElement);
    cuenta.tin = n;
    if (n !== valor || final) entrada.value = String(n);
    if (Number(rango.max) < n) rango.max = String(n);
    rango.value = String(n);
    this.actualizador.solicitar();
  }

  private async eliminar(cuenta: CuentaDto): Promise<void> {
    const confirmado = await this.dialogo.confirmar({
      titulo: 'Eliminar cuenta',
      mensaje: `¿Eliminar la cuenta «${PresentacionCuenta.nombre(cuenta)}»?`,
      aceptar: 'Eliminar',
    });
    if (!confirmado) return;
    this.app.estado.cuentas = this.app.estado.cuentas.filter((x) => x !== cuenta);
    this.render();
    this.campos.aplicarPlazo();
    this.puntuales.reconstruir();
    this.recalcularYa();
  }
}
