/** Botón de un control segmentado. */
export interface OpcionSegmentadaDto {
  /** Valor guardado en `data-<clave>`. */
  readonly valor: string;
  readonly texto: string;
  readonly activa?: boolean;
}
