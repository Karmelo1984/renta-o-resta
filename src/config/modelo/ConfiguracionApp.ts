import type { CampoNumericoId } from '@/core/dto/estado/CampoNumericoId';
import type { GraficoConfig } from './interfaz/GraficoConfig';
import type { UiConfig } from './interfaz/UiConfig';
import type { AgrupacionConfig } from './simulacion/AgrupacionConfig';
import type { CalendarioConfig } from './simulacion/CalendarioConfig';
import type { CampoConfig } from './simulacion/CampoConfig';
import type { CuentasConfig } from './simulacion/CuentasConfig';
import type { FormatoConfig } from './simulacion/FormatoConfig';
import type { PuntualConfig } from './simulacion/PuntualConfig';
import type { UmbralConfig } from './simulacion/UmbralConfig';

/** Configuración completa de la aplicación. */
export interface ConfiguracionApp {
  readonly campos: Readonly<Record<CampoNumericoId, CampoConfig>>;
  readonly puntual: PuntualConfig;
  readonly cuentas: CuentasConfig;
  readonly calendario: CalendarioConfig;
  readonly umbral: UmbralConfig;
  readonly formato: FormatoConfig;
  readonly agrupacion: AgrupacionConfig;
  readonly ui: UiConfig;
  readonly grafico: GraficoConfig;
}
