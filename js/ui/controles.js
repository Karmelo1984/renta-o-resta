/* Entrada de datos, reglas de formulario y aportaciones puntuales. */
(function (Sim) {
  'use strict';
  const {
    $,
    validNumber,
    freshState,
    RANGO,
    pasoMeses,
    ajustarPlazo,
    clamp,
    esc,
    eur,
    eurCompacto,
    money,
  } = Sim.utils;
  const state = Sim.data.state;
  const CFG = Sim.CFG,
    UI = CFG.ui,
    LOCALE = CFG.formato.locale,
    MAX_MESES = CFG.campos.meses.max,
    MAX_PUNTUAL = CFG.puntual.max;
  const numericIds = Object.keys(CFG.campos);
  let debounced = null;
  /**
   * Aplaza el recálculo para agrupar entradas rápidas.
   * @returns {void}
   */
  function scheduleRender() {
    clearTimeout(debounced);
    debounced = setTimeout(() => Sim.resultados.render(), UI.debounceMs);
  }
  /**
   * Valida y guarda un campo numérico.
   * @param {string} id Id del campo.
   * @param {number|string} value Valor.
   * @param {boolean} [final] `true` al salir del campo (ajusta el plazo).
   * @returns {void}
   */
  function setValue(id, value, final) {
    const el = $(id),
      lower = Number(el.min || 0),
      upper = el.max ? Number(el.max) : Infinity;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    let n = clamp(parsed, lower, upper);
    if (id === 'meses') {
      // El plazo es múltiplo del periodo más largo; mientras se teclea solo se acepta un múltiplo, al salir se redondea.
      const p = pasoMeses(state.cuentas),
        top = MAX_MESES;
      n = clamp(Math.round(n), p, top);
      if (n % p) {
        if (!final) return;
        n = clamp(Math.round(n / p) * p, p, top);
      }
    }
    state[id] = n;
    // Escribir o pegar un valor superior al máximo también lo corrige inmediatamente.
    if (parsed !== n) el.value = String(n);
    const slider = $(id + 'Range');
    if (slider) slider.value = String(n);
    if (id === 'meses') buildOneshots();
    scheduleRender();
  }
  /**
   * Bloquea `e`, `+` y `-` en un input numérico.
   * @param {HTMLInputElement} input Campo.
   * @returns {void}
   */
  function installKeyboardLimits(input) {
    input.addEventListener('keydown', (e) => {
      if (!e.ctrlKey && !e.metaKey && !e.altKey && ['e', 'E', '+', '-'].includes(e.key))
        e.preventDefault();
    });
  }
  /**
   * Añade botones − / + a un campo numérico.
   * @param {HTMLInputElement} input Campo dentro de un `.num`.
   * @returns {void}
   */
  function makeStepper(input) {
    const group = input.parentElement;
    if (!group.classList.contains('num') || group.querySelector('.stepper-btn')) return;
    installKeyboardLimits(input);
    for (const [sign, signText, cls, verb] of [
      [-1, '−', 'minus', 'Reducir'],
      [1, '+', 'plus', 'Aumentar'],
    ]) {
      const button = document.createElement('button');
      button.className = 'stepper-btn ' + cls;
      button.type = 'button';
      button.textContent = signText;
      const label =
        document.querySelector('label[for="' + input.id + '"]')?.textContent ||
        input.getAttribute('aria-label') ||
        'valor';
      button.setAttribute('aria-label', `${verb} ${label.trim()}`);
      const step = Number(input.step) || 1;
      button.title = `${verb} ${step} ${['capital', 'prestamo', 'periodicaB'].includes(input.id) || input.dataset.oneshotKey ? '€' : input.id.startsWith('tin') || input.id === 'retencion' ? 'puntos porcentuales' : 'meses'}`;
      button.addEventListener('click', () => {
        const decimal = (String(input.step).split('.')[1] || '').length;
        const min = input.min === '' ? -Infinity : Number(input.min),
          max = input.max === '' ? Infinity : Number(input.max);
        const base = validNumber(input.value, 0);
        const next = clamp(
          Math.round((base + sign * (Number(input.step) || 1)) * 10 ** decimal) / 10 ** decimal,
          min,
          max,
        );
        input.value = decimal ? next.toFixed(decimal) : String(next);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      sign < 0 ? group.prepend(button) : group.append(button);
    }
  }
  let selMonth = 1;
  /**
   * Aportaciones puntuales dentro del plazo (el motor ignora el resto).
   * @returns {Array<[string, number]>} Pares mes/importe.
   */
  const puntualesDentro = () =>
    Object.entries(state.puntualesB).filter(([m, a]) => Number(m) <= state.meses && a > 0);
  /**
   * Suma de las aportaciones puntuales dentro del plazo.
   * @returns {number} Total en €.
   */
  const totalPuntual = () => puntualesDentro().reduce((t, [, a]) => t + a, 0);
  /**
   * Reconstruye la rejilla de meses de aportaciones puntuales.
   * @returns {void}
   */
  function buildOneshots() {
    const cals = Sim.calculos.calendario(state, state.meses),
      years = new Map();
    selMonth = Math.min(selMonth, state.meses);
    cals.forEach((c, i) => {
      const k = c.y || 'Año ' + (Math.floor(i / CFG.calendario.mesesAnio) + 1);
      if (!years.has(k)) years.set(k, []);
      years.get(k).push({ m: i + 1, c });
    });
    $('oneshotGrid').replaceChildren(
      ...[...years].map(([k, items]) => {
        const box = document.createElement('section');
        box.className = 'once-year';
        box.innerHTML = `<h3><span>${k}</span><span class="once-total"></span></h3><div class="once-months"></div>`;
        items.forEach(({ m, c }, j) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'once-month';
          b.dataset.month = String(m);
          // Alinea el primer mes del año con su columna.
          if (j === 0 && c.y) b.style.gridColumnStart = String(((c.m - 1) % UI.columnasMes) + 1);
          box.lastChild.append(b);
        });
        return box;
      }),
    );
    refreshOneshots();
    refreshEditor();
  }
  /**
   * Actualiza importes, selección y totales de la rejilla.
   * @returns {void}
   */
  function refreshOneshots() {
    const P = state.puntualesB,
      cals = Sim.calculos.calendario(state, state.meses);
    for (const b of $('oneshotGrid').querySelectorAll('.once-month')) {
      const m = Number(b.dataset.month),
        a = P[m] || 0,
        c = cals[m - 1];
      b.innerHTML = `<small>${c.corto.split(' ')[0]}</small><b>${a ? a.toLocaleString(LOCALE) : '–'}</b>`;
      b.classList.toggle('has', a > 0);
      b.classList.toggle('sel', m === selMonth);
      b.setAttribute('aria-pressed', String(m === selMonth));
      b.setAttribute('aria-label', `${c.label}: ${a ? eur(a) : 'sin aportación'}`);
    }
    const dentro = puntualesDentro();
    $('oneshotMonths').textContent = dentro.length;
    $('oneshotTotal').textContent = money(totalPuntual());
    for (const box of $('oneshotGrid').children)
      box.querySelector('.once-total').textContent = eur(
        [...box.querySelectorAll('.once-month')].reduce((s, b) => s + (P[b.dataset.month] || 0), 0),
      );
  }
  /**
   * Actualiza el editor del mes seleccionado.
   * @returns {void}
   */
  function refreshEditor() {
    const cals = Sim.calculos.calendario(state, state.meses);
    $('oneshotSel').textContent = cals[selMonth - 1].label;
    $('oneshotAmount').value = '0';
    $('oneshotTo').innerHTML = cals
      .slice(selMonth - 1)
      .map((c, i) => `<option value="${selMonth + i}">${c.label}</option>`)
      .join('');
  }
  /**
   * Fija o borra la aportación puntual de un mes.
   * @param {number} month Mes.
   * @param {number} amount Importe (0 borra).
   * @returns {void}
   */
  function setOneshot(month, amount) {
    if (amount > 0) state.puntualesB[month] = amount;
    else delete state.puntualesB[month];
  }
  /**
   * Vuelca los límites de `config.js` en el DOM.
   * @returns {void}
   */
  function applyConfigToDOM() {
    for (const [id, c] of Object.entries(CFG.campos)) {
      const el = $(id);
      Object.assign(el, { min: c.min, max: c.max, step: c.step, value: c.valor });
      const r = $(id + 'Range');
      if (r) Object.assign(r, { min: c.min, max: c.rangeMax, step: c.step, value: c.valor });
    }
    $('accNombre').maxLength = CFG.cuentas.maxLength;
    // Límites visibles en textos y campos: siempre desde config.js.
    for (const el of document.querySelectorAll('[data-limite]')) {
      const k = el.dataset.limite;
      el.textContent = (k === 'puntual' ? MAX_PUNTUAL : CFG.campos[k].max).toLocaleString(LOCALE);
    }
    $('oneshotEvery').max = String(MAX_MESES);
    makeStepper($('oneshotEvery'));
  }
  /**
   * Registra todos los eventos del formulario.
   * @returns {void}
   */
  function bindControls() {
    applyConfigToDOM();
    for (const id of numericIds) {
      const el = $(id);
      makeStepper(el);
      el.addEventListener('input', () => {
        if (el.value.trim() === '') return;
        const n = Number(el.value);
        if (Number.isFinite(n)) setValue(id, n);
      });
      el.addEventListener('blur', () => {
        if (el.value.trim() === '') {
          el.value = state[id];
          return;
        }
        const n = validNumber(el.value, state[id]);
        setValue(id, n, true);
        el.value = String(state[id]);
      });
      $(id + 'Range')?.addEventListener('input', (e) => {
        el.value = e.target.value;
        setValue(id, e.target.value);
      });
    }
    bindCuentas();
    const amountEl = $('oneshotAmount'),
      readAmount = () => clamp(validNumber(amountEl.value, 0), 0, MAX_PUNTUAL);
    Object.assign(amountEl, { max: MAX_PUNTUAL, step: CFG.puntual.step });
    makeStepper(amountEl);
    Sim.colapsable.bind($('toggleOneshots'));
    $('oneshotGrid').addEventListener('click', (e) => {
      const b = e.target.closest('.once-month');
      if (!b) return;
      selMonth = Number(b.dataset.month);
      refreshOneshots();
      refreshEditor();
    });
    // Teclear o pegar por encima del máximo se corrige al instante.
    amountEl.addEventListener('input', () => {
      if (Number(amountEl.value) > MAX_PUNTUAL) amountEl.value = String(MAX_PUNTUAL);
    });
    amountEl.addEventListener('blur', () => {
      amountEl.value = String(readAmount());
    });
    // Rango: desde el mes seleccionado hasta «Aplicar hasta», cada X meses.
    // Sumar acumula sobre lo existente (tope puntual.max por mes); Establecer sustituye (0 borra).
    const applyRange = (add) => {
      const amount = readAmount(),
        to = Number($('oneshotTo').value),
        every = clamp(Math.round(validNumber($('oneshotEvery').value, 1)), 1, MAX_MESES);
      for (let m = selMonth; m <= to; m += every)
        setOneshot(m, add ? clamp((state.puntualesB[m] || 0) + amount, 0, MAX_PUNTUAL) : amount);
      refreshOneshots();
      scheduleRender();
    };
    $('oneshotAdd').addEventListener('click', () => applyRange(true));
    $('oneshotSet').addEventListener('click', () => applyRange(false));
    $('clearOneshots').addEventListener('click', () => {
      state.puntualesB = {};
      buildOneshots();
      Sim.resultados.render();
    });
    $('toggleControls').addEventListener('click', toggleControls);
    $('strip').addEventListener('click', toggleControls);
    bindCabecera();
    $('reset').addEventListener('click', async () => {
      if (
        !(await Sim.dialogo.confirmar({
          titulo: 'Restablecer configuración',
          mensaje: '¿Restablecer importes, tipos, plazo, cuentas y aportaciones puntuales?',
          aceptar: 'Restablecer',
        }))
      )
        return;
      Object.assign(state, freshState());
      syncUI();
      Sim.resultados.render();
    });
    $('calendario').addEventListener('change', (e) => {
      state.calendario = e.target.value;
      $('inicioField').hidden = state.calendario !== 'real';
      buildOneshots();
      scheduleRender();
    });
    for (const id of ['inicioMes', 'inicioAnio'])
      $(id).addEventListener('change', () => {
        state.inicio = $('inicioAnio').value + '-' + $('inicioMes').value;
        buildOneshots();
        scheduleRender();
      });
    $('detailAccount').addEventListener('change', () => Sim.resultados.updateDetails());
    $('detailGroup').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      for (const x of $('detailGroup').children) x.classList.toggle('active', x === b);
      Sim.resultados.updateDetails();
    });
    $('detailEsc').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.getAttribute('aria-disabled') === 'true') return;
      b.classList.toggle('active');
      syncEsc();
      Sim.resultados.updateDetails();
    });
    $('chartChecks').addEventListener('change', () => Sim.grafico.drawChart());
    $('print').addEventListener('click', () => window.print());
    $('exportCsv').addEventListener('click', () => Sim.archivos.exportCSV());
  }
  /**
   * Sincroniza `aria-*` de escenarios; siempre queda uno activo.
   * @returns {void}
   */
  function syncEsc() {
    const act = $('detailEsc').querySelectorAll('.active');
    for (const b of $('detailEsc').children) {
      b.setAttribute('aria-pressed', String(b.classList.contains('active')));
      b.setAttribute('aria-disabled', String(act.length === 1 && b.classList.contains('active')));
    }
  }
  /**
   * Expande o contrae el panel de configuración.
   * @returns {void}
   */
  function toggleControls() {
    const b = $('toggleControls'),
      c = document.querySelector('.layout').classList.toggle('collapsed');
    b.textContent = c ? '»' : '«';
    b.setAttribute('aria-expanded', !c);
    b.setAttribute('aria-label', c ? 'Expandir configuración' : 'Contraer configuración');
    renderStrip();
    window.dispatchEvent(new Event('resize'));
  }
  /**
   * Franja con el resumen de la configuración (visible con el panel contraído).
   * @returns {void}
   */
  function renderStrip() {
    const s = state,
      pct = (v) => String(v).replace('.', ',') + ' %',
      dentro = puntualesDentro();
    const item = (label, value, color, title) =>
      `<span class="strip-item" title="${esc(title || label + ': ' + value)}"><small>${label}</small><b>${color ? `<i style="background:${color}"></i>` : ''}${esc(value)}</b></span>`;
    const html = [
      item('Modo', s.calendario === 'real' ? 'Real' : '30/360'),
      item('Capital', eurCompacto(s.capital)),
      item('Préstamo', eurCompacto(s.prestamo)),
      item('TIN pr.', pct(s.tinPrestamo)),
      item('Plazo', s.meses + ' m'),
      ...s.cuentas.map((a, i) =>
        item(
          a.nombre ? a.nombre.slice(0, UI.nombreCortoStrip) : 'Cuenta',
          pct(a.tin),
          Sim.grafico.colorOf(i, 'B'),
          `${Sim.resultados.nameOf(a)}: ${pct(a.tin)} · ${Sim.resultados.describe(a)}`,
        ),
      ),
      item('Retenc.', pct(s.retencion), null, 'Retención: ' + pct(s.retencion)),
      item('Periód.', s.periodicaB + ' €/m', null, `Aportación periódica: ${s.periodicaB} €/mes`),
      item('Puntual.', dentro.length ? `${dentro.length} · ${eurCompacto(totalPuntual())}` : '—'),
    ].join('');
    $('strip').innerHTML = html;
  }
  /**
   * Cabecera fija que se encoge al desplazarse (con histéresis).
   * @returns {void}
   */
  function bindCabecera() {
    const head = document.querySelector('.head');
    let compact = false;
    const check = () => {
      const y = window.scrollY;
      if (!compact && y > UI.cabeceraCompactaY) compact = true;
      else if (compact && y < UI.cabeceraExpandeY) compact = false;
      head.classList.toggle('compacta', compact);
    };
    addEventListener('scroll', check, { passive: true });
    check();
  }
  /**
   * Rellena los selectores de mes y año de inicio.
   * @returns {void}
   */
  function fillInicio() {
    const [lo, hi] = Sim.utils.rangoAnios(),
      meses = CFG.calendario.mesesLargo;
    $('inicioMes').innerHTML = meses
      .map((n, i) => `<option value="${String(i + 1).padStart(2, '0')}">${n}</option>`)
      .join('');
    $('inicioAnio').innerHTML = Array.from(
      { length: hi - lo + 1 },
      (_, i) => `<option>${lo + i}</option>`,
    ).join('');
  }
  /**
   * Sincroniza todo el DOM con el estado.
   * @returns {void}
   */
  function syncUI() {
    syncEsc();
    renderCuentas();
    applyPlazoStep();
    $('calendario').value = state.calendario;
    if (!$('inicioAnio').options.length) fillInicio();
    [$('inicioAnio').value, $('inicioMes').value] = state.inicio.split('-');
    $('inicioField').hidden = state.calendario !== 'real';
    for (const id of numericIds) {
      $(id).value = state[id];
      const slider = $(id + 'Range');
      if (slider) {
        if (state[id] > Number(slider.max)) slider.max = state[id];
        slider.value = state[id];
      }
    }
    buildOneshots();
  }

  // ---- Cuentas remuneradas: lista con TIN editable y modal de alta ----
  /**
   * Ajusta paso y valor del plazo según las cuentas.
   * @returns {void}
   */
  function applyPlazoStep() {
    const p = pasoMeses(state.cuentas);
    for (const id of ['meses', 'mesesRange']) Object.assign($(id), { min: p, step: p });
    if (state.meses % p) state.meses = ajustarPlazo(state.meses, p);
    $('meses').value = state.meses;
    $('mesesRange').value = state.meses;
  }
  /**
   * Pinta la lista de cuentas.
   * @returns {void}
   */
  function renderCuentas() {
    const t = CFG.cuentas.tin;
    $('accountList').innerHTML = state.cuentas
      .map((a, i) => {
        const name = esc(Sim.resultados.nameOf(a));
        return `<div class="account-card" style="--c:${Sim.grafico.colorOf(i, 'B')}">
  <div class="account-top"><div class="account-title"><strong>${name}</strong><span>${esc(Sim.resultados.describe(a))}</span></div><button type="button" class="btn destruct acc-del" data-acc="${a.id}" aria-label="Eliminar ${name}" title="Eliminar cuenta"><svg class="i" aria-hidden="true"><use href="#i-trash"/></svg></button></div>
  <div class="field"><div class="fieldline"><label class="fieldlabel" for="tin-${a.id}">TIN</label><div class="num"><input id="tin-${a.id}" type="number" data-acc="${a.id}"><span>%</span></div></div><input class="range" type="range" id="tin-${a.id}Range" data-acc="${a.id}" aria-label="TIN ${name}"></div></div>`;
      })
      .join('');
    for (const a of state.cuentas) {
      const n = $('tin-' + a.id),
        r = $('tin-' + a.id + 'Range');
      Object.assign(n, { min: t.min, max: t.max, step: t.step, value: a.tin });
      Object.assign(r, {
        min: t.min,
        max: Math.max(t.rangeMax, a.tin),
        step: t.step,
        value: a.tin,
      });
      makeStepper(n);
    }
    $('accountEmpty').hidden = state.cuentas.length > 0;
    $('addAccount').disabled = state.cuentas.length >= CFG.cuentas.max;
  }
  /**
   * Guarda el TIN de una cuenta.
   * @param {object} a Cuenta.
   * @param {number} value TIN en %.
   * @param {boolean} [final] Reescribe el campo con el valor acotado.
   * @returns {void}
   */
  function setTin(a, value, final) {
    const t = CFG.cuentas.tin,
      n = clamp(value, t.min, t.max),
      inp = $('tin-' + a.id),
      sl = $('tin-' + a.id + 'Range');
    a.tin = n;
    if (n !== value || final) inp.value = String(n);
    if (Number(sl.max) < n) sl.max = n;
    sl.value = n;
    scheduleRender();
  }
  /**
   * Método de cálculo elegido en el modal.
   * @returns {string} `medio` o `cierre`.
   */
  const metodoActivo = () => $('accMetodo').querySelector('.active').dataset.m;
  /**
   * Lee el formulario del modal de alta.
   * @returns {object} Cuenta candidata y límites `t`.
   */
  function leerModal() {
    const t = CFG.cuentas.tin,
      tin = $('accTin').value.trim() === '' ? NaN : Number($('accTin').value),
      calculo = $('accCalculo').value;
    return {
      nombre: $('accNombre').value.trim(),
      tin,
      calculo,
      metodo: calculo === 'diario' ? 'medio' : metodoActivo(),
      ingreso: $('accIngreso').value,
      t,
    };
  }
  /**
   * Valida el modal y actualiza avisos y botón.
   * @returns {void}
   */
  function updateModal() {
    const calculo = $('accCalculo').value,
      sel = $('accIngreso');
    $('accMetodoField').hidden = calculo === 'diario';
    // El ingreso no puede ser más frecuente que el cálculo.
    for (const o of sel.options) o.hidden = o.disabled = RANGO[o.value] < RANGO[calculo];
    if (RANGO[sel.value] < RANGO[calculo]) sel.value = calculo;
    const v = leerModal(),
      p = pasoMeses([v]),
      nuevo = ajustarPlazo(state.meses, p);
    const nota = $('accNota');
    nota.hidden = state.meses % p === 0;
    nota.querySelector('div').textContent =
      `El plazo se ajustará de ${state.meses} a ${nuevo} meses (múltiplo de ${p}).`;
    let error = '';
    if (!v.nombre) error = 'Indica un nombre.';
    else if (!Number.isFinite(v.tin) || v.tin < v.t.min || v.tin > v.t.max)
      error = `El TIN debe estar entre ${v.t.min} y ${v.t.max} %.`;
    else if (state.cuentas.length >= CFG.cuentas.max) error = `Máximo ${CFG.cuentas.max} cuentas.`;
    $('accError').textContent = error;
    $('accCrear').disabled = !!error;
  }
  /**
   * Abre el modal de alta con valores por defecto.
   * @returns {void}
   */
  function abrirModal() {
    $('accNombre').value = '';
    $('accTin').value = String(CFG.cuentas.tin.valor);
    $('accCalculo').value = 'diario';
    $('accIngreso').value = 'mensual';
    for (const b of $('accMetodo').children) b.classList.toggle('active', b.dataset.m === 'medio');
    updateModal();
    $('accountModal').showModal();
    $('accNombre').focus();
  }
  /**
   * Registra los eventos de la lista y del modal de cuentas.
   * @returns {void}
   */
  function bindCuentas() {
    const list = $('accountList'),
      find = (el) => state.cuentas.find((a) => a.id === el.dataset.acc);
    list.addEventListener('input', (e) => {
      const el = e.target,
        a = el.dataset.acc && find(el);
      if (!a) return;
      if (el.type === 'range') $('tin-' + a.id).value = el.value;
      else if (el.value.trim() === '') return;
      const n = Number(el.value);
      if (Number.isFinite(n)) setTin(a, n);
    });
    list.addEventListener('focusout', (e) => {
      const el = e.target,
        a = el.type === 'number' && el.dataset.acc && find(el);
      if (!a) return;
      if (el.value.trim() === '') el.value = String(a.tin);
      else setTin(a, validNumber(el.value, a.tin), true);
    });
    list.addEventListener('click', async (e) => {
      const b = e.target.closest('.acc-del'),
        a = b && find(b);
      if (
        !a ||
        !(await Sim.dialogo.confirmar({
          titulo: 'Eliminar cuenta',
          mensaje: `¿Eliminar la cuenta «${Sim.resultados.nameOf(a)}»?`,
          aceptar: 'Eliminar',
        }))
      )
        return;
      state.cuentas = state.cuentas.filter((x) => x !== a);
      renderCuentas();
      applyPlazoStep();
      Sim.resultados.render();
    });
    const dlg = $('accountModal');
    $('addAccount').addEventListener('click', abrirModal);
    $('accCancelar').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) dlg.close();
    });
    for (const id of ['accNombre', 'accTin', 'accCalculo', 'accIngreso'])
      $(id).addEventListener('input', updateModal);
    $('accMetodo').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      for (const x of $('accMetodo').children) x.classList.toggle('active', x === b);
      updateModal();
    });
    $('accountForm').addEventListener('submit', (e) => {
      e.preventDefault();
      updateModal();
      if ($('accCrear').disabled) return;
      const { nombre, tin, calculo, metodo, ingreso } = leerModal(),
        ids = new Set(state.cuentas.map((a) => a.id));
      let k = 1;
      while (ids.has('c' + k)) k++;
      state.cuentas.push({ id: 'c' + k, nombre, tin, calculo, metodo, ingreso });
      dlg.close();
      renderCuentas();
      applyPlazoStep();
      buildOneshots();
      Sim.resultados.render();
    });
  }
  Sim.controles = { bindControls, syncUI, renderStrip };
})(window.Simulador);
