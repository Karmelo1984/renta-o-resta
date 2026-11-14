/* Presentación de resultados: DOM y tablas, sin lógica financiera. */
(function (Sim) {
  'use strict';
  const { $, money, signed, percentage, esc } = Sim.utils;
  const { CASES, simularTodos, umbralFinanciacion } = Sim.calculos;
  const INGRESO = {
    diario: 'Liquidación diaria',
    mensual: 'Liquidación mensual',
    anual: 'Liquidación anual',
  };
  let current = null,
    checksKey = null;
  /**
   * Nombre de la cuenta; si no tiene, el TIN.
   * @param {object} a Cuenta.
   * @returns {string} Nombre.
   */
  const nameOf = (a) =>
    a.nombre || `Cuenta ${percentage(a.tin, Sim.CFG.formato.decimalesPctCorto)}`;
  /**
   * Color de la cuenta en el escenario B.
   * @param {object} s Estado.
   * @param {string} id Id de la cuenta.
   * @returns {string} Color `hsl()`.
   */
  const colorOf = (s, id) =>
    Sim.grafico.colorOf(
      s.cuentas.findIndex((a) => a.id === id),
      'B',
    );
  /**
   * Resumen de la configuración fija de la cuenta.
   * @param {object} a Cuenta.
   * @returns {string} Texto descriptivo.
   */
  function describe(a) {
    const calculo =
      a.calculo === 'diario'
        ? 'Cálculo diario'
        : `Cálculo ${a.calculo} (${a.metodo === 'cierre' ? 'saldo a cierre' : 'saldo medio'})`;
    return `${calculo} · Ingreso ${a.ingreso}`;
  }
  /**
   * Regenera las casillas del gráfico solo si cambian las cuentas.
   * @param {object} s Estado.
   * @returns {void}
   */
  function renderChecks(s) {
    const key = s.cuentas.map((a) => a.id + '|' + nameOf(a) + '|' + a.ingreso).join(';');
    if (key === checksKey) return;
    const box = $('chartChecks'),
      keep = new Set([...box.querySelectorAll('input:checked')].map((i) => i.dataset.k)),
      first = checksKey === null;
    checksKey = key;
    box.innerHTML = s.cuentas
      .map(
        (a, i) =>
          `<div class="chiprow"><span class="chiplabel">${esc(nameOf(a))}</span>${[
            ['A', 'Capital'],
            ['B', 'Aportaciones'],
            ['C', 'Préstamo'],
          ]
            .map(([c, t]) => {
              const k = a.id + '-' + c,
                on = keep.has(k) || (first && i === 0);
              return `<label class="serie" style="--c:${Sim.grafico.colorOf(i, c)}"><input type="checkbox" data-k="${k}"${on ? ' checked' : ''}><i></i>${c} · ${t}</label>`;
            })
            .join('')}</div>`,
      )
      .join('');
  }
  /**
   * Recalcula y pinta todos los resultados.
   * @returns {void}
   */
  function render() {
    const s = Sim.data.state;
    Sim.controles.renderStrip();
    current = simularTodos(s);
    const real = s.calendario === 'real',
      last = Sim.calculos.calendario(s, s.meses).at(-1);
    $('closingText').textContent = real
      ? `último día de ${last.label}`
      : `día 30 del Mes ${s.meses}`;
    $('calChip').textContent = real
      ? 'Calendario real · base 365/366'
      : '30 días/mes · 360 días/año';
    const n = s.cuentas.length;
    const select = $('detailAccount'),
      prev = select.value;
    select.innerHTML = s.cuentas
      .map((a) => `<option value="${a.id}">${esc(nameOf(a))} · ${a.ingreso}</option>`)
      .join('');
    if (s.cuentas.some((a) => a.id === prev)) select.value = prev;
    $('accountHead').style.setProperty('--n', n);
    $('resultMatrix').style.setProperty('--n', n);
    renderChecks(s);
    if (!n) {
      $('accountHead').innerHTML = '';
      $('resultMatrix').innerHTML =
        '<div class="notice"><span class="mark">i</span><div>No hay cuentas remuneradas. Añade una en «Cuentas remuneradas» para ver los resultados.</div></div>';
      $('thresholds').innerHTML = '';
      $('warning').style.display = 'none';
      updateDetails();
      Sim.grafico.drawChart();
      return;
    }
    $('accountHead').innerHTML =
      '<span>Escenario</span>' +
      s.cuentas
        .map(
          (a, i) =>
            `<span style="color:${Sim.grafico.colorOf(i, 'B')}">${esc(nameOf(a))} · ${INGRESO[a.ingreso]}</span>`,
        )
        .join('');
    let cards = '';
    for (const caseId of Object.keys(CASES)) {
      cards += `<div class="matrix-row"><div class="matrix-label"><strong>${caseId}</strong><span>${esc(CASES[caseId].label.slice(4))}</span></div>`;
      for (const a of s.cuentas) {
        const r = current[a.id][caseId];
        cards += `<article class="result-card" style="--c:${colorOf(s, a.id)}" aria-label="Escenario ${caseId}, ${esc(nameOf(a))}">
        <div class="rc-title">${esc(nameOf(a))} · ${INGRESO[a.ingreso]}</div>
        <div class="rc-main">${money(r.patrimonio)}</div>
        <div class="rc-profit ${r.beneficio >= 0 ? 'positive' : 'negative'}">Beneficio neto: ${signed(r.beneficio)}</div>
        <div class="rc-extra"><span>Saldo disponible</span><b>${money(r.saldo)}</b>
          <span>Interés neto total</span><b>${money(r.netoAbonado)}</b>
          <span>Retención total</span><b>${money(r.retencionAbonada)}</b>
          <span>Aportaciones periódicas</span><b>${money(r.aportacionPeriodica)}</b>
          <span>Aportaciones extra</span><b>${money(r.aportacionPuntual)}</b>
        </div>
      </article>`;
      }
      cards += '</div>';
    }
    $('resultMatrix').innerHTML = cards;
    const thresh = [],
      warns = [];
    for (const a of s.cuentas) {
      const group = current[a.id],
        name = nameOf(a);
      const limit = umbralFinanciacion(s, a.id);
      const ok = limit === null ? 'na' : s.tinPrestamo <= limit ? 'ok' : 'bad';
      thresh.push(
        `<div class="threshold ${ok}" title="TIN máximo del préstamo al que C iguala a B (mismas aportaciones, sin préstamo)"><span>TIN máx. rentable<br><b>${esc(name)}</b></span><strong>${limit === null ? 'No evaluable' : percentage(limit, Sim.CFG.formato.decimalesPctCorto)}</strong></div>`,
      );
      for (const id of Object.keys(CASES))
        if (group[id].descubierto) warns.push(`${id} con ${name}`);
    }
    $('thresholds').innerHTML = thresh.join('');
    const warn = $('warning');
    warn.style.display = warns.length ? 'flex' : 'none';
    warn.textContent = warns.length
      ? 'Atención: existe saldo negativo en ' +
        warns.join(', ') +
        '. La cuenta no puede cubrir todas las retiradas sin financiación externa. No se modelan descubiertos ni sus costes.'
      : '';
    updateDetails();
    Sim.grafico.drawChart();
  }
  /**
   * Importe, con cero atenuado.
   * @param {number} v Importe.
   * @returns {string} HTML.
   */
  const num = (v) => (v === 0 ? '<span class="zero">0,00 €</span>' : money(v));
  /**
   * Pinta la tabla de detalle de la cuenta y agrupación elegidas.
   * @returns {void}
   */
  function updateDetails() {
    if (!current) return;
    Sim.graficoIntereses.draw();
    const account = $('detailAccount').value;
    if (!account || !current[account]) {
      $('detailRows').innerHTML = '';
      $('detailTotal').innerHTML = '';
      return;
    }
    const nivel = $('detailGroup').querySelector('.active').dataset.g,
      s = Sim.data.state;
    const idx = s.cuentas.findIndex((a) => a.id === account);
    const v = vista(account, nivel);
    const act = escActivos();
    const filas = (p) =>
      act
        .map((id, i) => {
          const r = p[id],
            c = `style="--c:${Sim.grafico.colorOf(idx, id)}"`;
          return `<tr class="esc" ${c}>${i ? '' : `<td rowspan="${act.length}" class="per"><b>${esc(p.A.label)}</b>${p.A.sub ? `<small>${esc(p.A.sub)}</small>` : ''}</td>`}
      <td><span class="esc-badge">${id}</span></td><td>${money(r.inicio)}</td><td>${num(r.aportes)}</td><td class="g-rem">${num(r.neto)}</td><td class="g-rem">${num(r.retencion)}</td><td class="g-rem">${num(r.bruto)}</td>
      <td class="g-pre">${num(r.cuota)}</td><td class="g-pre">${num(r.interesPrestamo)}</td><td class="g-pre">${num(r.amortizacion)}</td><td class="g-pre">${num(r.deuda)}</td><td>${money(r.saldo)}</td><td><b class="${r.patrimonio < 0 ? 'negative' : ''}">${money(r.patrimonio)}</b></td></tr>`;
        })
        .join('');
    $('detailRows').innerHTML = v.periodos.map(filas).join('');
    $('detailTotal').innerHTML = filas(v.total);
  }
  /**
   * Una fila por periodo con los tres escenarios (la etiqueta viaja en A).
   * @param {string} account Id de la cuenta.
   * @param {string} nivel Nivel de agrupación.
   * @returns {{periodos: Array<object>, total: object}} Filas `{A, B, C}`.
   */
  function vista(account, nivel) {
    const s = Sim.data.state,
      g = Object.keys(CASES).map((id) => Sim.agrupacion.agrupar(current[account][id], s, nivel));
    const unir = (f) => Object.fromEntries(Object.keys(CASES).map((id, i) => [id, f(g[i])]));
    return {
      periodos: g[0].periodos.map((_, k) => unir((x) => x.periodos[k])),
      total: unir((x) => x.total),
    };
  }
  /**
   * Escenarios activos en el detalle.
   * @returns {string[]} Ids `A`/`B`/`C`.
   */
  const escActivos = () =>
    [...$('detailEsc').querySelectorAll('button.active')].map((b) => b.dataset.e);
  /**
   * Últimos resultados calculados.
   * @returns {object|null} Resultados por cuenta.
   */
  function getCurrent() {
    return current;
  }
  Sim.resultados = { render, updateDetails, vista, getCurrent, escActivos, nameOf, describe };
})(window.Simulador);
