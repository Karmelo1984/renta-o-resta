import { CONFIG } from '@/config/Configuracion';
import type { AgrupacionDto } from '@/core/dto/agrupacion/AgrupacionDto';
import type { EtiquetaPeriodoDto } from '@/core/dto/agrupacion/EtiquetaPeriodoDto';
import type { FilaAgrupadaDto } from '@/core/dto/agrupacion/FilaAgrupadaDto';
import type { NivelAgrupacion } from '@/core/dto/agrupacion/NivelAgrupacion';
import { NivelesAgrupacion } from '@/core/dto/agrupacion/NivelesAgrupacion';
import type { MesCalendarioDto } from '@/core/dto/calendario/MesCalendarioDto';
import type { EstadoSimulacionDto } from '@/core/dto/estado/EstadoSimulacionDto';
import type { DiaSimuladoDto } from '@/core/dto/resultado/DiaSimuladoDto';
import type { ResultadoSimulacionDto } from '@/core/dto/resultado/ResultadoSimulacionDto';
import { Logger } from '@/core/log/Logger';
import { CalendarioFinanciero } from '../calendario/CalendarioFinanciero';
import { Redondeo } from '../comun/Redondeo';
import type { CampoSumable } from './CampoSumable';
import type { NivelInfo } from './NivelInfo';

const { diaQuincena, mesesBloque } = CONFIG.agrupacion;
const redondear = (v: number): number => Redondeo.aCentimos(v);

const NIVELES: Readonly<Record<NivelAgrupacion, NivelInfo>> = {
  dia: { label: 'Día', clave: () => 0 },
  quincena: { label: 'Quincena', clave: (d) => d.mes * 2 + (d.dia > diaQuincena ? 1 : 0) },
  mes: { label: 'Mes', clave: (d) => d.mes },
  trimestre: { label: 'Trimestre', clave: (d) => Math.ceil(d.mes / mesesBloque.trimestre) },
  semestre: { label: 'Semestre', clave: (d) => Math.ceil(d.mes / mesesBloque.semestre) },
  anio: { label: 'Año', clave: (d) => Math.ceil(d.mes / mesesBloque.anio) },
};

/**
 * Agrupación temporal del detalle financiero.
 *
 * Solo suma y lee el registro diario `dias` del motor: no recalcula intereses, cuotas ni saldos.
 */
export class AgrupadorDetalle {
  /**
   * @param log - Logger de la capa de cálculo.
   */
  public constructor(private readonly log: Logger = new Logger('agrupacion')) {}

  /**
   * Agrupa el registro diario por nivel temporal.
   * @param resultado - Resultado de `SimuladorFinanciero.simular`.
   * @param modelo - Estado validado de la aplicación.
   * @param nivel - Nivel de agrupación.
   * @returns Filas por periodo y total.
   * @throws Error si el nivel no existe.
   */
  public agrupar(
    resultado: ResultadoSimulacionDto,
    modelo: EstadoSimulacionDto,
    nivel: NivelAgrupacion,
  ): AgrupacionDto {
    if (!NivelesAgrupacion.TODOS.includes(nivel))
      throw new Error(`Agrupación desconocida: ${nivel}`);
    const cals = CalendarioFinanciero.construir(modelo, resultado.months);
    const grupos: DiaSimuladoDto[][] = [];
    let actual: DiaSimuladoDto[] = [];
    let clave: number | null = null;
    for (const d of resultado.dias) {
      const k = nivel === 'dia' ? grupos.length : NIVELES[nivel].clave(d);
      if (clave === null || nivel === 'dia' || k !== clave) {
        actual = [];
        grupos.push(actual);
        clave = k;
      }
      actual.push(d);
    }
    const periodos = grupos.map((g) => this.fila(g, this.etiqueta(nivel, g, cals), modelo));
    const etiquetaTotal: EtiquetaPeriodoDto = {
      label: 'Total / cierre',
      sub: `${resultado.months} meses`,
    };
    const total = this.fila(resultado.dias, etiquetaTotal, modelo);
    this.log.debug('Detalle agrupado', { nivel, periodos: periodos.length });
    return { periodos, total };
  }

  /**
   * Neto devengado pendiente de abono, con el redondeo de una liquidación.
   * @param bruto - Interés bruto pendiente.
   * @param retencion - Retención en %.
   * @returns Neto en €.
   */
  private netoPendiente(bruto: number, retencion: number): number {
    const g = redondear(bruto);
    const t = redondear((g * retencion) / 100);
    return redondear(g - t);
  }

  private fila(
    grupo: readonly DiaSimuladoDto[],
    etiqueta: EtiquetaPeriodoDto,
    modelo: EstadoSimulacionDto,
  ): FilaAgrupadaDto {
    const primero = grupo[0];
    const ultimo = grupo.at(-1);
    if (!primero || !ultimo) throw new Error('Grupo de días vacío.');
    const suma = (campo: CampoSumable): number =>
      redondear(grupo.reduce((s, d) => s + d[campo], 0));
    return {
      ...etiqueta,
      inicio: primero.inicio,
      aportes: suma('aportes'),
      neto: suma('neto'),
      retencion: suma('retencion'),
      bruto: suma('bruto'),
      cuota: suma('cuota'),
      interesPrestamo: suma('interesPrestamo'),
      amortizacion: suma('amortizacion'),
      deuda: ultimo.deuda,
      saldo: ultimo.saldo,
      patrimonio: redondear(
        ultimo.saldo + this.netoPendiente(ultimo.pendiente, modelo.retencion) - ultimo.deuda,
      ),
    };
  }

  private etiqueta(
    nivel: NivelAgrupacion,
    grupo: readonly DiaSimuladoDto[],
    cals: readonly MesCalendarioDto[],
  ): EtiquetaPeriodoDto {
    const a = grupo[0];
    const z = grupo.at(-1);
    const ca = a && cals[a.mes - 1];
    const cz = z && cals[z.mes - 1];
    if (!a || !z || !ca || !cz) throw new Error('Grupo de días vacío.');
    if (nivel === 'dia') return { label: CalendarioFinanciero.fechaTexto(ca, a.dia), sub: '' };
    if (nivel === 'quincena') {
      return {
        label: `${ca.label} · ${a.dia > diaQuincena ? '2ª' : '1ª'} quincena`,
        sub: `Días ${a.dia} – ${z.dia}`,
      };
    }
    if (nivel === 'mes') return { label: ca.label, sub: `Días ${a.dia} – ${z.dia}` };
    const n = Math.ceil(a.mes / mesesBloque[nivel]);
    return {
      label: `${NIVELES[nivel].label} ${n}`,
      sub: a.mes === z.mes ? ca.label : `${ca.label} – ${cz.label}`,
    };
  }
}
