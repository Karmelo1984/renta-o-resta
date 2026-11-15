import type { BotonProps } from './BotonProps';
import { Icono } from './Icono';

/** Plantilla de botón reutilizable. */
export class Boton {
  /**
   * HTML del botón.
   * @param props - Propiedades del botón.
   * @returns Elemento `<button>`.
   */
  public static render(props: BotonProps): string {
    const variante =
      props.variante === 'primario'
        ? ' boton-primario'
        : props.variante === 'peligro'
          ? ' boton-peligro'
          : '';
    const id = props.id ? ` id="${props.id}"` : '';
    const icono = props.icono ? Icono.render(props.icono) : '';
    return `<button type="${props.tipo ?? 'button'}"${id} class="boton${variante} ${props.clase ?? ''}" ${props.atributos ?? ''}>${icono}${props.texto ?? ''}</button>`;
  }
}
