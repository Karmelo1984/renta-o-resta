/** Constructor de un elemento del DOM, usado para comprobar el tipo en tiempo de ejecución. */
type ConstructorElemento<T extends Element> = new () => T;

/** Acceso tipado al DOM sin aserciones de tipo. */
export class Dom {
  /**
   * Obtiene un elemento por id comprobando su tipo.
   * @param id - Id del elemento.
   * @param tipo - Clase esperada, p. ej. `HTMLInputElement`.
   * @returns El elemento con el tipo pedido.
   * @throws Error si no existe o no es del tipo esperado.
   */
  public static porId<T extends HTMLElement>(id: string, tipo: ConstructorElemento<T>): T;
  /**
   * Obtiene un elemento por id.
   * @param id - Id del elemento.
   * @returns El elemento.
   * @throws Error si no existe.
   */
  public static porId(id: string): HTMLElement;
  public static porId<T extends HTMLElement>(
    id: string,
    tipo?: ConstructorElemento<T>,
  ): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`No existe el elemento #${id}`);
    if (tipo && !(el instanceof tipo)) throw new Error(`#${id} no es un ${tipo.name}`);
    return el;
  }

  /**
   * Busca el primer elemento que cumpla el selector comprobando su tipo.
   * @param selector - Selector CSS.
   * @param tipo - Clase esperada.
   * @param raiz - Nodo desde el que buscar.
   * @returns El elemento.
   * @throws Error si no existe o no es del tipo esperado.
   */
  public static consulta<T extends Element>(
    selector: string,
    tipo: ConstructorElemento<T>,
    raiz: ParentNode = document,
  ): T {
    const el = raiz.querySelector(selector);
    if (!el) throw new Error(`No existe ${selector}`);
    if (!(el instanceof tipo)) throw new Error(`${selector} no es un ${tipo.name}`);
    return el;
  }

  /**
   * Busca todos los elementos de un tipo que cumplan el selector.
   * @param selector - Selector CSS.
   * @param tipo - Clase esperada; los demás se descartan.
   * @param raiz - Nodo desde el que buscar.
   * @returns Lista de elementos.
   */
  public static consultaTodos<T extends Element>(
    selector: string,
    tipo: ConstructorElemento<T>,
    raiz: ParentNode = document,
  ): T[] {
    return [...raiz.querySelectorAll(selector)].filter((el): el is T => el instanceof tipo);
  }
}
