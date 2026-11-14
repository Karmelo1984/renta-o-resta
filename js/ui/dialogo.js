/* Confirmación con el modal de la aplicación (sustituye a window.confirm). Devuelve Promise<boolean>. */
(function (Sim) {
  'use strict';
  /**
   * Muestra el modal de confirmación.
   * @param {{titulo: string, mensaje: string, aceptar?: string}} opciones Textos del modal.
   * @returns {Promise<boolean>} `true` si el usuario acepta.
   */
  function confirmar({ titulo, mensaje, aceptar = 'Aceptar' }) {
    const $ = Sim.utils.$,
      d = $('confirmModal');
    return new Promise((resolve) => {
      $('confirmTitle').textContent = titulo;
      $('confirmMsg').textContent = mensaje;
      $('confirmYes').textContent = aceptar;
      d.returnValue = '';
      $('confirmYes').onclick = () => d.close('si');
      $('confirmNo').onclick = () => d.close();
      d.onclick = (e) => {
        if (e.target === d) d.close();
      };
      // Esc, fondo y Cancelar equivalen a rechazar.
      d.onclose = () => resolve(d.returnValue === 'si');
      d.showModal();
      $('confirmNo').focus();
    });
  }
  Sim.dialogo = { confirmar };
})(window.Simulador);
