import { CONFIG } from '@/config/Configuracion';
import { AportacionesPuntuales } from '@/core/calculo/simulacion/AportacionesPuntuales';
import { CalendarioFinanciero } from '@/core/calculo/calendario/CalendarioFinanciero';
import type { ActualizadorDiferido } from '../../app/ActualizadorDiferido';
import type { EstadoAplicacion } from '../../app/EstadoAplicacion';
import { Dom } from '../../base/Dom';
import { Formateador } from '../../base/Formateador';
import { Colapsable } from '../../componentes/comportamiento/Colapsable';
import { Stepper } from '../../componentes/comportamiento/Stepper';

const { max: MAX_PUNTUAL, step: PASO_PUNTUAL } = CONFIG.puntual;
const MAX_MESES = CONFIG.campos.meses.max;

/** Calendario de aportaciones puntuales y editor por rango (compartidas por B y C). */
export class ControladorPuntuales {
  private mesSeleccionado = 1;

  /**
   * @param app - Estado de la aplicación.
   * @param actualizador - Recalcula con retardo.
   * @param recalcularYa - Recalcula inmediatamente.
   */
  public constructor(
    private readonly app: EstadoAplicacion,
    private readonly actualizador: ActualizadorDiferido,
    private readonly recalcularYa: () => void,
  ) {}

  /** Registra los eventos del bloque de aportaciones puntuales. */
  public enlazar(): void {
    const importe = Dom.porId('oneshotAmount', HTMLInputElement);
    const leerImporte = (): number => this.acotar(this.numero(importe.value, 0), 0, MAX_PUNTUAL);
    Object.assign(importe, { max: MAX_PUNTUAL, step: PASO_PUNTUAL });
    Dom.porId('oneshotEvery', HTMLInputElement).max = String(MAX_MESES);
    Stepper.instalar(importe);
    Stepper.instalar(Dom.porId('oneshotEvery', HTMLInputElement));
    new Colapsable(Dom.porId('toggleOneshots', HTMLButtonElement));
    const rejilla = Dom.porId('oneshotGrid');
    rejilla.addEventListener('click', (e) => {
      const mes =
        e.target instanceof Element ? e.target.closest<HTMLElement>('.mes-puntual') : null;
      if (!mes) return;
      this.mesSeleccionado = Number(mes.dataset.month);
      this.refrescar();
      this.refrescarEditor();
    });
    // Teclear o pegar por encima del máximo se corrige al instante.
    importe.addEventListener('input', () => {
      if (Number(importe.value) > MAX_PUNTUAL) importe.value = String(MAX_PUNTUAL);
    });
    importe.addEventListener('blur', () => {
      importe.value = String(leerImporte());
    });
    // Rango: desde el mes seleccionado hasta «Aplicar hasta», cada X meses.
    // Sumar acumula (tope por mes); Establecer sustituye (0 borra).
    const aplicar = (sumar: boolean): void => {
      const cantidad = leerImporte();
      const hasta = Number(Dom.porId('oneshotTo', HTMLSelectElement).value);
      const cada = this.acotar(
        Math.round(this.numero(Dom.porId('oneshotEvery', HTMLInputElement).value, 1)),
        1,
        MAX_MESES,
      );
      for (let m = this.mesSeleccionado; m <= hasta; m += cada) {
        const previo = this.app.estado.puntualesB[m] ?? 0;
        this.fijar(m, sumar ? this.acotar(previo + cantidad, 0, MAX_PUNTUAL) : cantidad);
      }
      this.refrescar();
      this.actualizador.solicitar();
    };
    Dom.porId('oneshotAdd').addEventListener('click', () => {
      aplicar(true);
    });
    Dom.porId('oneshotSet').addEventListener('click', () => {
      aplicar(false);
    });
    Dom.porId('clearOneshots').addEventListener('click', () => {
      this.app.estado.puntualesB = {};
      this.reconstruir();
      this.recalcularYa();
    });
  }

  /** Reconstruye la rejilla de meses de aportaciones puntuales. */
  public reconstruir(): void {
    const estado = this.app.estado;
    const meses = CalendarioFinanciero.construir(estado, estado.meses);
    this.mesSeleccionado = Math.min(this.mesSeleccionado, estado.meses);
    const anios = new Map<string, { m: number; indice: number }[]>();
    meses.forEach((c, i) => {
      const clave =
        c.anio !== undefined
          ? String(c.anio)
          : `Año ${Math.floor(i / CONFIG.calendario.mesesAnio) + 1}`;
      const lista = anios.get(clave) ?? [];
      lista.push({ m: i + 1, indice: i });
      anios.set(clave, lista);
    });
    Dom.porId('oneshotGrid').replaceChildren(
      ...[...anios].map(([clave, items]) => {
        const caja = document.createElement('section');
        caja.className = 'puntuales-anio';
        caja.innerHTML = `<h3><span>${clave}</span><span class="puntuales-total"></span></h3><div class="puntuales-meses"></div>`;
        items.forEach(({ m, indice }, j) => {
          const boton = document.createElement('button');
          boton.type = 'button';
          boton.className = 'mes-puntual';
          boton.dataset.month = String(m);
          const cal = meses[indice];
          // Alinea el primer mes del año con su columna.
          if (j === 0 && cal?.mes !== undefined) {
            boton.style.gridColumnStart = String(((cal.mes - 1) % CONFIG.ui.columnasMes) + 1);
          }
          caja.lastElementChild?.append(boton);
        });
        return caja;
      }),
    );
    this.refrescar();
    this.refrescarEditor();
  }

  /** Actualiza importes, selección y totales de la rejilla. */
  public refrescar(): void {
    const estado = this.app.estado;
    const puntuales = estado.puntualesB;
    const meses = CalendarioFinanciero.construir(estado, estado.meses);
    const rejilla = Dom.porId('oneshotGrid');
    for (const b of Dom.consultaTodos('.mes-puntual', HTMLElement, rejilla)) {
      const m = Number(b.dataset.month);
      const importe = puntuales[m] ?? 0;
      const cal = meses[m - 1];
      if (!cal) continue;
      b.innerHTML = `<small>${cal.corto.split(' ')[0] ?? ''}</small><b>${importe ? importe.toLocaleString(CONFIG.formato.locale) : '–'}</b>`;
      b.classList.toggle('has', importe > 0);
      b.classList.toggle('sel', m === this.mesSeleccionado);
      b.setAttribute('aria-pressed', String(m === this.mesSeleccionado));
      b.setAttribute(
        'aria-label',
        `${cal.label}: ${importe ? Formateador.euros(importe) : 'sin aportación'}`,
      );
    }
    Dom.porId('oneshotMonths').textContent = String(
      AportacionesPuntuales.dentroDelPlazo(estado).length,
    );
    Dom.porId('oneshotTotal').textContent = Formateador.dinero(AportacionesPuntuales.total(estado));
    for (const caja of rejilla.children) {
      const total = Dom.consultaTodos('.mes-puntual', HTMLElement, caja).reduce(
        (s, b) => s + (puntuales[Number(b.dataset.month)] ?? 0),
        0,
      );
      const etiqueta = caja.querySelector('.puntuales-total');
      if (etiqueta) etiqueta.textContent = Formateador.euros(total);
    }
  }

  private refrescarEditor(): void {
    const estado = this.app.estado;
    const meses = CalendarioFinanciero.construir(estado, estado.meses);
    Dom.porId('oneshotSel').textContent = meses[this.mesSeleccionado - 1]?.label ?? '';
    Dom.porId('oneshotAmount', HTMLInputElement).value = '0';
    Dom.porId('oneshotTo').innerHTML = meses
      .slice(this.mesSeleccionado - 1)
      .map((c, i) => `<option value="${this.mesSeleccionado + i}">${c.label}</option>`)
      .join('');
  }

  /** Fija o borra la aportación puntual de un mes (0 borra). */
  private fijar(mes: number, importe: number): void {
    if (importe > 0) this.app.estado.puntualesB[mes] = importe;
    else Reflect.deleteProperty(this.app.estado.puntualesB, mes);
  }

  private numero(valor: string, porDefecto: number): number {
    return Number.isFinite(Number(valor)) && valor.trim() !== '' ? Number(valor) : porDefecto;
  }

  private acotar(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }
}
