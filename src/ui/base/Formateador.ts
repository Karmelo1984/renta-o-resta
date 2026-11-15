import { CONFIG } from '@/config/Configuracion';

/** Formato de importes y porcentajes según la configuración regional. */
export class Formateador {
  private static readonly moneda = Formateador.crear(CONFIG.formato.decimales, undefined, {
    style: 'currency',
    currency: CONFIG.formato.moneda,
  });
  private static readonly compacto = Formateador.crear(0, CONFIG.formato.compactoDecimales, {
    notation: 'compact',
  });
  private static readonly porcentajes = new Map<number, Intl.NumberFormat>();

  /**
   * Formatea importe en moneda.
   * @param v - Importe.
   * @returns Texto formateado (los valores casi nulos se muestran como 0).
   */
  public static dinero(v: number): string {
    return Formateador.moneda.format(Math.abs(v) < CONFIG.formato.cero ? 0 : v);
  }

  /**
   * Formatea importe con `+` si es positivo.
   * @param v - Importe.
   * @returns Texto formateado.
   */
  public static conSigno(v: number): string {
    return (v > CONFIG.formato.cero ? '+' : '') + Formateador.dinero(v);
  }

  /**
   * Formatea porcentaje.
   * @param v - Valor en %.
   * @param decimales - Decimales.
   * @returns Texto o `—` si no hay valor.
   */
  public static porcentaje(
    v: number | null | undefined,
    decimales: number = CONFIG.formato.decimalesPct,
  ): string {
    if (v === null || v === undefined) return '—';
    let f = Formateador.porcentajes.get(decimales);
    if (!f) {
      f = Formateador.crear(decimales);
      Formateador.porcentajes.set(decimales, f);
    }
    return `${f.format(v)} %`;
  }

  /**
   * Formatea euros enteros con separador de miles.
   * @param v - Importe.
   * @returns Texto formateado.
   */
  public static euros(v: number): string {
    return `${v.toLocaleString(CONFIG.formato.locale)} €`;
  }

  /**
   * Formatea euros en notación compacta.
   * @param v - Importe.
   * @returns Texto formateado.
   */
  public static eurosCompacto(v: number): string {
    return `${Formateador.compacto.format(v)} €`;
  }

  private static crear(
    min: number,
    max = min,
    opciones?: Intl.NumberFormatOptions,
  ): Intl.NumberFormat {
    return new Intl.NumberFormat(CONFIG.formato.locale, {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
      ...opciones,
    });
  }
}
