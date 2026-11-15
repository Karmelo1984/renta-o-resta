import { CONFIG } from '@/config/Configuracion';
import type { MesCalendarioDto } from '@/core/dto/calendario/MesCalendarioDto';
import type { CuentaDto } from '@/core/dto/cuenta/CuentaDto';
import type { Editable } from '@/core/dto/Editable';
import type { EscenarioId } from '@/core/dto/escenario/EscenarioId';
import { Escenarios } from '@/core/dto/escenario/Escenarios';
import type { EstadoSimulacionDto } from '@/core/dto/estado/EstadoSimulacionDto';
import type { CuotaPrestamoDto } from '@/core/dto/resultado/CuotaPrestamoDto';
import type { DiaSimuladoDto } from '@/core/dto/resultado/DiaSimuladoDto';
import type { OpcionesSimulacionDto } from '@/core/dto/resultado/OpcionesSimulacionDto';
import type { PuntoPatrimonioDto } from '@/core/dto/resultado/PuntoPatrimonioDto';
import type { ResultadoSimulacionDto } from '@/core/dto/resultado/ResultadoSimulacionDto';
import type { ResultadosCuentaDto } from '@/core/dto/resultado/ResultadosCuentaDto';
import type { ResultadosPorCuentaDto } from '@/core/dto/resultado/ResultadosPorCuentaDto';
import type { ResumenMensualDto } from '@/core/dto/resultado/ResumenMensualDto';
import { Logger } from '@/core/log/Logger';
import { CalendarioFinanciero } from '../calendario/CalendarioFinanciero';
import { PlazoSimulacion } from '../comun/PlazoSimulacion';
import { Redondeo } from '../comun/Redondeo';
import { CuadroPrestamo } from './CuadroPrestamo';

const { mesesAnio } = CONFIG.calendario;
const { cero: CERO } = CONFIG.formato;
const redondear = (v: number): number => Redondeo.aCentimos(v);

/**
 * Motor financiero puro: meses de 30 días/año de 360 (o calendario real) y calendario de eventos.
 *
 * No depende del DOM. La simulación termina el último día del mes N, tras cobrar la última cuota.
 * Cada simulación pública deja trazas `debug` con el logger recibido.
 */
export class SimuladorFinanciero {
  /**
   * @param log - Logger de la capa de cálculo.
   */
  public constructor(private readonly log: Logger = new Logger('calculos')) {}

  /**
   * Simula un escenario diario completo.
   *
   * Orden diario: (1) aportaciones del día 1 (periódica y puntual), (2) devengo del día,
   * (3) abono neto según el periodo de ingreso, (4) cuota del préstamo el último día del mes.
   * El capital inicial y el préstamo entran antes del devengo del día 1 del mes 1.
   *
   * @param modelo - Estado validado de la aplicación.
   * @param escenario - Escenario a simular.
   * @param cuentaId - Id de la cuenta remunerada.
   * @param opciones - Opciones, p. ej. sustituir el TIN del préstamo.
   * @returns Resultado completo con registro diario.
   * @throws Error si el escenario o la cuenta no existen, o el plazo es inválido.
   */
  public simular(
    modelo: EstadoSimulacionDto,
    escenario: EscenarioId,
    cuentaId: string,
    opciones: OpcionesSimulacionDto = {},
  ): ResultadoSimulacionDto {
    return this.ejecutar(modelo, escenario, cuentaId, opciones, true);
  }

  /**
   * Simula A, B y C para cada cuenta.
   * @param modelo - Estado validado de la aplicación.
   * @returns Resultados por id de cuenta.
   */
  public simularTodos(modelo: EstadoSimulacionDto): ResultadosPorCuentaDto {
    this.log.debug('Simulación completa', { cuentas: modelo.cuentas.length, meses: modelo.meses });
    const entradas = modelo.cuentas.map(({ id }): [string, ResultadosCuentaDto] => [
      id,
      {
        A: this.simular(modelo, 'A', id),
        B: this.simular(modelo, 'B', id),
        C: this.simular(modelo, 'C', id),
      },
    ]);
    return Object.fromEntries(entradas);
  }

  /**
   * TIN máximo del préstamo al que C iguala a B (búsqueda binaria).
   * @param modelo - Estado validado de la aplicación.
   * @param cuentaId - Id de la cuenta remunerada.
   * @returns TIN en %, o `null` si no hay préstamo o no es evaluable.
   */
  public umbralFinanciacion(modelo: EstadoSimulacionDto, cuentaId: string): number | null {
    if (modelo.prestamo <= 0) return null;
    const umbral = CONFIG.umbral;
    // B ya contiene todos los ingresos propios de C, pero no el préstamo.
    const control = this.ejecutar(modelo, 'B', cuentaId, {}, false);
    const cero = this.ejecutar(modelo, 'C', cuentaId, { tinPrestamo: 0 }, false);
    if (!cero.valido || cero.patrimonio < control.patrimonio - umbral.tolerancia) {
      this.log.debug('Umbral no evaluable', { cuenta: cuentaId });
      return null;
    }
    let bajo = umbral.min;
    let alto = umbral.max;
    for (let i = 0; i < umbral.iteraciones; i++) {
      const medio = (bajo + alto) / 2;
      const variante = this.ejecutar(modelo, 'C', cuentaId, { tinPrestamo: medio }, false);
      if (variante.valido && variante.patrimonio >= control.patrimonio - umbral.tolerancia) {
        bajo = medio;
      } else {
        alto = medio;
      }
    }
    this.log.debug('TIN máximo rentable', { cuenta: cuentaId, tin: bajo });
    return bajo;
  }

  private ejecutar(
    modelo: EstadoSimulacionDto,
    escenario: EscenarioId,
    cuentaId: string,
    opciones: OpcionesSimulacionDto,
    trazar: boolean,
  ): ResultadoSimulacionDto {
    const cuenta = modelo.cuentas.find((a) => a.id === cuentaId);
    if (!cuenta) throw new Error('Escenario o cuenta desconocidos.');
    const meses = modelo.meses;
    if (!Number.isInteger(meses) || meses < 1 || meses > CONFIG.campos.meses.max) {
      throw new Error('Plazo fuera de rango.');
    }
    if (meses % PlazoSimulacion.pasoMeses([cuenta]) !== 0) {
      throw new Error('El plazo debe ser múltiplo del periodo de la cuenta.');
    }
    const tinPrestamo = opciones.tinPrestamo ?? modelo.tinPrestamo;
    const prestamo = escenario === 'C' ? redondear(modelo.prestamo) : 0;
    const cuotas = new CuadroPrestamo(prestamo, tinPrestamo, meses).cuotas;
    const etiqueta = Escenarios.etiqueta(escenario);
    if (trazar) {
      this.log.debug(`Inicio ${etiqueta}`, {
        cuenta: cuentaId,
        meses,
        capital: modelo.capital,
        prestamo,
        tinPrestamo,
        calendario: modelo.calendario,
        primeraCuota: cuotas[0]?.amount,
      });
    }
    const resultado = this.recorrerDias(modelo, escenario, cuenta, prestamo, cuotas, trazar);
    if (trazar) {
      this.log.debug(`Fin ${etiqueta}`, {
        cuenta: cuentaId,
        saldo: resultado.saldo,
        patrimonio: resultado.patrimonio,
        beneficio: resultado.beneficio,
        interesNeto: resultado.netoAbonado,
      });
      if (resultado.descubierto) {
        this.log.warn('Saldo negativo durante la simulación', { escenario, cuenta: cuentaId });
      }
    }
    return resultado;
  }

  private recorrerDias(
    modelo: EstadoSimulacionDto,
    escenario: EscenarioId,
    cuenta: CuentaDto,
    prestamo: number,
    cuotas: readonly CuotaPrestamoDto[],
    trazar: boolean,
  ): ResultadoSimulacionDto {
    const meses = modelo.meses;
    const tin = cuenta.tin / 100;
    const cierre = cuenta.calculo !== 'diario' && cuenta.metodo === 'cierre';
    // Fin de periodo: mensual = último día de cada mes; anual = último día de cada bloque de 12 meses.
    const finPeriodo = (
      frecuencia: CuentaDto['ingreso'],
      mes: number,
      dia: number,
      cal: MesCalendarioDto,
    ): boolean =>
      frecuencia === 'diario' ||
      (dia === cal.dias && (frecuencia === 'mensual' || mes % mesesAnio === 0));

    let saldo = redondear(modelo.capital + prestamo);
    let deuda = prestamo;
    let pendiente = 0;
    let descubierto = false;
    let netoAbonado = 0;
    let retencionAbonada = 0;
    let aportacionPeriodica = 0;
    let aportacionPuntual = 0;
    const rows: ResumenMensualDto[] = [];
    const dias: DiaSimuladoDto[] = [];
    const cals = CalendarioFinanciero.construir(modelo, meses);
    // B y C comparten todos los ingresos propios; C solo añade el préstamo y sus cuotas.
    const periodica = escenario === 'A' ? 0 : modelo.periodicaB;
    const puntuales = escenario === 'A' ? {} : modelo.puntualesB;
    const points: PuntoPatrimonioDto[] = [
      { corto: 'Inicio', patrimonio: redondear(saldo - deuda) },
    ];
    let fila: Editable<ResumenMensualDto> = { corto: '', netoAbonado: 0, interesPrestamo: 0 };
    let dia: Editable<DiaSimuladoDto> = this.diaVacio(0, 0, saldo);

    // Cierra el resumen del mes en curso y lo añade a `rows` y al gráfico.
    const cerrarMes = (): void => {
      rows.push(fila);
      points.push({ corto: fila.corto, patrimonio: redondear(saldo - deuda) });
      if (trazar) {
        this.log.debug('Cierre de mes', {
          mes: rows.length,
          saldo,
          deuda,
          interesNeto: fila.netoAbonado,
          interesPrestamo: fila.interesPrestamo,
        });
      }
    };
    // Redondeo del interés bruto y de la retención por liquidación efectuada.
    const abonar = (brutoSinRedondear: number): void => {
      const bruto = redondear(brutoSinRedondear);
      const retencion = redondear((bruto * modelo.retencion) / 100);
      const neto = redondear(bruto - retencion);
      saldo = redondear(saldo + neto);
      retencionAbonada = redondear(retencionAbonada + retencion);
      netoAbonado = redondear(netoAbonado + neto);
      fila.netoAbonado = redondear(fila.netoAbonado + neto);
      dia.bruto = bruto;
      dia.retencion = retencion;
      dia.neto = neto;
    };

    for (let mes = 1; mes <= meses; mes++) {
      const cal = cals[mes - 1];
      if (!cal) throw new Error('Calendario incompleto.');
      for (let d = 1; d <= cal.dias; d++) {
        if (d === 1) {
          if (mes > 1) cerrarMes();
          fila = { corto: cal.corto, netoAbonado: 0, interesPrestamo: 0 };
        }
        dia = this.diaVacio(mes, d, saldo);
        // 1. Aportaciones: día 1, cuentan ya para el devengo de ese día.
        if (d === 1) {
          const puntual = redondear(Math.max(0, Number(puntuales[mes]) || 0));
          saldo = redondear(saldo + periodica + puntual);
          aportacionPeriodica = redondear(aportacionPeriodica + periodica);
          aportacionPuntual = redondear(aportacionPuntual + puntual);
          dia.aportes = redondear(periodica + puntual);
        }
        // 2-3. Saldo medio: devengo diario con el saldo del día; se abona al fin del periodo de
        // ingreso (diario: el mismo día). Con saldo a cierre no hay devengo diario: ver paso 5.
        if (!cierre) {
          pendiente += (Math.max(0, saldo) * tin) / cal.base;
          if (finPeriodo(cuenta.ingreso, mes, d, cal)) {
            abonar(pendiente);
            pendiente = 0;
          }
        }
        // 4. Cuota del préstamo el último día del mes, después del devengo de ese día.
        const cuota = cuotas[mes - 1];
        if (escenario === 'C' && d === cal.dias && cuota) {
          saldo = redondear(saldo - cuota.amount);
          deuda = cuota.debt;
          fila.interesPrestamo = redondear(fila.interesPrestamo + cuota.interest);
          dia.cuota = cuota.amount;
          dia.interesPrestamo = cuota.interest;
          dia.amortizacion = cuota.amortization;
        }
        // 5. Saldo a cierre: al fin del periodo de cálculo, sobre el saldo tras aportaciones y cuota
        // y antes de abonar.
        if (cierre) {
          if (finPeriodo(cuenta.calculo, mes, d, cal)) {
            pendiente +=
              (Math.max(0, saldo) * tin) / (cuenta.calculo === 'mensual' ? mesesAnio : 1);
          }
          if (finPeriodo(cuenta.ingreso, mes, d, cal)) {
            abonar(pendiente);
            pendiente = 0;
          }
        }
        dia.deuda = deuda;
        dia.saldo = saldo;
        dia.pendiente = pendiente;
        dias.push(dia);
        if (saldo < -CERO) descubierto = true;
      }
    }
    cerrarMes();
    const patrimonio = redondear(saldo - deuda);
    return {
      months: meses,
      saldo,
      patrimonio,
      // El beneficio neto no es el saldo: se resta el dinero propio aportado.
      beneficio: redondear(patrimonio - modelo.capital - aportacionPeriodica - aportacionPuntual),
      aportacionPeriodica,
      aportacionPuntual,
      netoAbonado,
      retencionAbonada,
      descubierto,
      // Remuneración negativa no contemplada; un descubierto invalida el resultado bancario.
      valido: !descubierto && deuda === 0,
      rows,
      points,
      dias,
    };
  }

  private diaVacio(mes: number, dia: number, saldo: number): Editable<DiaSimuladoDto> {
    return {
      mes,
      dia,
      inicio: saldo,
      aportes: 0,
      bruto: 0,
      retencion: 0,
      neto: 0,
      cuota: 0,
      interesPrestamo: 0,
      amortizacion: 0,
      deuda: 0,
      saldo: 0,
      pendiente: 0,
    };
  }
}
