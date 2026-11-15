import type { PuntoPatrimonioDto } from '@/core/dto/resultado/PuntoPatrimonioDto';

/** Series de patrimonio por clave `cuenta-escenario`. */
export type SeriesPatrimonioDto = Readonly<Record<string, readonly PuntoPatrimonioDto[]>>;
