import assert from 'node:assert/strict';
import { FabricaEstado } from '@/core/calculo/simulacion/FabricaEstado';
import type { CuentaDto } from '@/core/dto/cuenta/CuentaDto';
import type { DiaSimuladoDto } from '@/core/dto/resultado/DiaSimuladoDto';
import type { ResultadoSimulacionDto } from '@/core/dto/resultado/ResultadoSimulacionDto';
import type { EstadoSimulacionDto } from '@/core/dto/estado/EstadoSimulacionDto';
import { Redondeo } from '@/core/calculo/comun/Redondeo';

/** Campos numéricos del registro diario. */
export type CampoDia = Exclude<keyof DiaSimuladoDto, 'mes' | 'dia'>;

/** Utilidades compartidas por las pruebas del motor. */
export class AyudasPrueba {
  /**
   * Devuelve el valor o falla si es `undefined`/`null` (acceso indexado seguro en pruebas).
   * @param valor - Valor posiblemente indefinido.
   * @returns El mismo valor, ya sin `undefined`.
   */
  public static req<T>(valor: T | undefined | null): T {
    assert.ok(valor !== undefined && valor !== null, 'valor inesperadamente indefinido');
    return valor;
  }

  /**
   * Comprueba que dos números difieren menos que la tolerancia.
   * @param actual - Valor obtenido.
   * @param esperado - Valor esperado.
   * @param tol - Tolerancia absoluta.
   */
  public static cerca(actual: number, esperado: number, tol = 0.01): void {
    assert.ok(Math.abs(actual - esperado) <= tol, `${actual} != ${esperado} (tol ${tol})`);
  }

  /**
   * Estado por defecto en calendario 30/360 (los tests de motor lo asumen).
   * @returns Estado nuevo.
   */
  public static config(): EstadoSimulacionDto {
    return { ...FabricaEstado.crearInicial(), calendario: '30360' };
  }

  /**
   * Estado con una única cuenta, sin aportaciones ni préstamo.
   * @param cuenta - Cuenta a simular.
   * @param meses - Plazo.
   * @returns Estado de prueba.
   */
  public static conCuenta(cuenta: CuentaDto, meses = 12): EstadoSimulacionDto {
    const c = AyudasPrueba.config();
    c.cuentas = [cuenta];
    c.meses = meses;
    c.periodicaB = 0;
    c.prestamo = 0;
    return c;
  }

  /**
   * Cuenta de prueba con valores por defecto sobrescribibles.
   * @param o - Campos a sobrescribir.
   * @returns Cuenta completa.
   */
  public static cuenta(o: Partial<CuentaDto>): CuentaDto {
    return {
      id: 'x',
      nombre: 'X',
      tin: 3.6,
      calculo: 'diario',
      metodo: 'medio',
      ingreso: 'mensual',
      ...o,
    };
  }

  /**
   * TIN de una cuenta del estado.
   * @param m - Estado.
   * @param id - Id de cuenta.
   * @returns TIN en %.
   */
  public static tin(m: EstadoSimulacionDto, id: string): number {
    return AyudasPrueba.req(m.cuentas.find((a) => a.id === id)).tin;
  }

  /**
   * Interés neto de un bruto con la retención por defecto.
   * @param g - Interés bruto.
   * @returns Interés neto.
   */
  public static neto(g: number): number {
    const d = AyudasPrueba.config();
    return Redondeo.aCentimos(g - Redondeo.aCentimos((g * d.retencion) / 100));
  }

  /** Días con abono de intereses. */
  public static abonos(r: ResultadoSimulacionDto): DiaSimuladoDto[] {
    return r.dias.filter((d) => d.bruto !== 0 || d.retencion !== 0);
  }

  /** Días con cuota de préstamo. */
  public static cuotas(r: ResultadoSimulacionDto): DiaSimuladoDto[] {
    return r.dias.filter((d) => d.cuota > 0);
  }

  /** Suma de un campo del registro diario. */
  public static suma(r: ResultadoSimulacionDto, k: CampoDia): number {
    return Redondeo.aCentimos(r.dias.reduce((s, d) => s + d[k], 0));
  }

  /** Aportaciones propias totales. */
  public static aportado(r: ResultadoSimulacionDto): number {
    return r.aportacionPeriodica + r.aportacionPuntual;
  }

  /** Interés bruto de un mes. */
  public static brutoMes(r: ResultadoSimulacionDto, mes: number): number {
    return Redondeo.aCentimos(r.dias.filter((d) => d.mes === mes).reduce((s, d) => s + d.bruto, 0));
  }

  /** Último día simulado. */
  public static ultimoDia(r: ResultadoSimulacionDto): DiaSimuladoDto {
    return AyudasPrueba.req(r.dias.at(-1));
  }

  /** Primer día simulado. */
  public static primerDia(r: ResultadoSimulacionDto): DiaSimuladoDto {
    return AyudasPrueba.req(r.dias[0]);
  }
}
