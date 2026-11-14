/* Bloque colapsable accesible: botón con aria-expanded/aria-controls; el contenido plegado es `inert`
 * (no enfocable) y conserva su estado, porque solo se oculta. */
(function (Sim) {
  'use strict';
  /**
   * Enlaza un botón con su panel colapsable (parte plegado).
   * @param {HTMLButtonElement} button Botón con `aria-controls`.
   * @param {{onToggle?: function(boolean): void}} [opciones] Callback al cambiar.
   * @returns {void}
   */
  function bind(button, { onToggle } = {}) {
    const panel = document.getElementById(button.getAttribute('aria-controls')),
      inner = panel.firstElementChild;
    const set = (open) => {
      button.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('open', open);
      inner.inert = !open;
      if (onToggle) onToggle(open);
    };
    button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
    set(false);
  }
  Sim.colapsable = { bind };
})(window.Simulador);
