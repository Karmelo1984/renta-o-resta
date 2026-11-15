import { CONFIG } from '@/config/Configuracion';

/** Descarga un texto como archivo desde el navegador. */
export class DescargadorArchivo {
  /**
   * Inicia la descarga.
   * @param contenido - Contenido del archivo.
   * @param nombre - Nombre del archivo.
   * @param tipo - Tipo MIME.
   */
  public descargar(contenido: string, nombre: string, tipo: string): void {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, CONFIG.ui.descargaMs);
  }
}
