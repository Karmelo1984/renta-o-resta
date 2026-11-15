import { CONFIG } from '@/config/Configuracion';
import type { MesCalendarioDto } from '@/core/dto/calendario/MesCalendarioDto';
import type { ParametrosCalendarioDto } from '@/core/dto/calendario/ParametrosCalendarioDto';

/** Construcción del calendario mensual de la simulación y formato de fechas. */
export class CalendarioFinanciero {
  /**
   * Indica si un año es bisiesto.
   * @param anio - Año natural.
   * @returns `true` si tiene 366 días.
   */
  public static esBisiesto(anio: number): boolean {
    return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  }

  /**
   * Calendario por mes. 30/360: 30 días y base 360. Real: días naturales y base 365/366.
   * @param modelo - Modo de calendario y mes de inicio `YYYY-MM`.
   * @param meses - Número de meses.
   * @returns Un elemento por mes.
   */
  public static construir(modelo: ParametrosCalendarioDto, meses: number): MesCalendarioDto[] {
    const { diasMes, diasAnio, diasAnioReal, diasAnioBisiesto, mesesAnio, mesesCorto } =
      CONFIG.calendario;
    const real = modelo.calendario === 'real';
    const [anio0 = 0, mes0 = 1] = real ? modelo.inicio.split('-').map(Number) : [0, 1];
    return Array.from({ length: meses }, (_, i): MesCalendarioDto => {
      if (!real) {
        return { dias: diasMes, base: diasAnio, label: `Mes ${i + 1}`, corto: `M${i + 1}` };
      }
      const idx = mes0 - 1 + i;
      const anio = anio0 + Math.floor(idx / mesesAnio);
      const mes = (idx % mesesAnio) + 1;
      const nombre = mesesCorto[mes - 1] ?? '';
      return {
        anio,
        mes,
        dias: new Date(Date.UTC(anio, mes, 0)).getUTCDate(),
        base: CalendarioFinanciero.esBisiesto(anio) ? diasAnioBisiesto : diasAnioReal,
        label: `${nombre} ${anio}`,
        corto: `${nombre} ${String(anio).slice(2)}`,
      };
    });
  }

  /**
   * Texto de fecha de un día concreto.
   * @param mes - Mes del calendario.
   * @param dia - Día del mes.
   * @returns `dd/mm/aaaa` (real) o `Mes N · día D` (30/360).
   */
  public static fechaTexto(mes: MesCalendarioDto, dia: number): string {
    return mes.anio !== undefined && mes.mes !== undefined
      ? `${String(dia).padStart(2, '0')}/${String(mes.mes).padStart(2, '0')}/${mes.anio}`
      : `Mes ${mes.label.slice(4)} · día ${dia}`;
  }
}
