/** Añade botones − / + a un campo numérico dentro de `.entrada-num` y bloquea `e`, `+`, `-`. */
export class Stepper {
  /**
   * Instala los botones en un campo (idempotente).
   * @param input - Campo dentro de un `.entrada-num`.
   */
  public static instalar(input: HTMLInputElement): void {
    const grupo = input.parentElement;
    if (!grupo?.classList.contains('entrada-num') || grupo.querySelector('.stepper-btn')) return;
    input.addEventListener('keydown', (e) => {
      if (!e.ctrlKey && !e.metaKey && !e.altKey && ['e', 'E', '+', '-'].includes(e.key)) {
        e.preventDefault();
      }
    });
    const pasos: readonly [number, string, string, string][] = [
      [-1, '−', 'minus', 'Reducir'],
      [1, '+', 'plus', 'Aumentar'],
    ];
    for (const [signo, texto, clase, verbo] of pasos) {
      const boton = document.createElement('button');
      boton.className = `stepper-btn ${clase}`;
      boton.type = 'button';
      boton.textContent = texto;
      const etiqueta =
        document.querySelector(`label[for="${input.id}"]`)?.textContent ??
        input.getAttribute('aria-label') ??
        'valor';
      boton.setAttribute('aria-label', `${verbo} ${etiqueta.trim()}`);
      boton.title = `${verbo} ${Number(input.step) || 1} ${Stepper.unidad(input)}`;
      boton.addEventListener('click', () => {
        Stepper.pulsar(input, signo);
      });
      if (signo < 0) grupo.prepend(boton);
      else grupo.append(boton);
    }
  }

  private static unidad(input: HTMLInputElement): string {
    if (['capital', 'prestamo', 'periodicaB'].includes(input.id) || input.dataset.oneshotKey) {
      return '€';
    }
    return input.id.startsWith('tin') || input.id === 'retencion' ? 'puntos porcentuales' : 'meses';
  }

  private static pulsar(input: HTMLInputElement, signo: number): void {
    const paso = Number(input.step) || 1;
    const decimales = (input.step.split('.')[1] ?? '').length;
    const min = input.min === '' ? -Infinity : Number(input.min);
    const max = input.max === '' ? Infinity : Number(input.max);
    const base =
      Number.isFinite(Number(input.value)) && input.value.trim() !== '' ? Number(input.value) : 0;
    const siguiente = Math.min(
      max,
      Math.max(min, Math.round((base + signo * paso) * 10 ** decimales) / 10 ** decimales),
    );
    input.value = decimales ? siguiente.toFixed(decimales) : String(siguiente);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
