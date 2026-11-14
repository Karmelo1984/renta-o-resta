/* Presentación de resultados: DOM y tablas, sin lógica financiera. */
(function (Sim) {
'use strict';
const {$,money,signed,percentage,round}=Sim.utils;
const {PRODUCTS,CASES,simularTodos,umbralFinanciacion}=Sim.calculos;
let current=null;
function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(){
  const s=Sim.data.state;
  current=simularTodos(s);
  const real=s.calendario==='real',last=Sim.calculos.calendario(s,s.meses).at(-1);
  $('closingText').textContent=real?`último día de ${last.label}`:`día 30 del Mes ${s.meses}`;
  $('calChip').textContent=real?'Calendario real · base 365/366':'30 días/mes · 360 días/año';
  // Nombre personalizado si existe; si no, el TIN como hasta ahora.
  const monthlyName=s.nombreMensual||percentage(s.tinMensual,2),dailyName=s.nombreDiario||percentage(s.tinDiario,2);
  const monthlyLabel=s.nombreMensual||`Cuenta ${monthlyName}`,dailyLabel=s.nombreDiario||`Cuenta ${dailyName}`;
  document.querySelectorAll('.monthly-head').forEach(el=>el.textContent=`${monthlyLabel} · Liquidación mensual`);
  document.querySelectorAll('.daily-head').forEach(el=>el.textContent=`${dailyLabel} · Liquidación diaria`);
  for(const selectId of ['detailAccount']){
    const select=$(selectId);select.querySelector('option[value="mensual"]').textContent=`${monthlyName} · Mensual`;
    select.querySelector('option[value="diario"]').textContent=`${dailyName} · Diaria`;
  }

  document.querySelectorAll('.monthly-name').forEach(el=>el.textContent=monthlyName);
  document.querySelectorAll('.daily-name').forEach(el=>el.textContent=dailyName);
  let cards='';
  for(const caseId of Object.keys(CASES)){
    cards+=`<div class="matrix-row"><div class="matrix-label"><strong>${caseId}</strong><span>${esc(CASES[caseId].label.slice(4))}</span></div>`;
    for(const productId of Object.keys(PRODUCTS)){
      const r=current[productId][caseId];
      cards+=`<article class="result-card ${productId}" aria-label="Escenario ${caseId}, cuenta ${productId}">
        <div class="rc-title">${productId==='mensual'?'Liquidación mensual':'Liquidación diaria'}</div>
        <div class="rc-main">${money(r.patrimonio)}</div>
        <div class="rc-profit ${r.beneficio>=0?'positive':'negative'}">Beneficio neto: ${signed(r.beneficio)}</div>
        <div class="rc-extra"><span>Saldo disponible</span><b>${money(r.saldo)}</b>
          <span>Interés neto total</span><b>${money(r.netoTotal)}</b>
          <span>Retención total</span><b>${money(r.retencionTotal)}</b>
          <span>Aportaciones periódicas</span><b>${money(r.aportacionPeriodica)}</b>
          <span>Aportaciones extra</span><b>${money(r.aportacionPuntual)}</b>
        </div>
      </article>`;
    }
    cards+='</div>';
  }
  $('resultMatrix').innerHTML=cards;
  const thresh=[];
  const warns=[];
  const ids=Object.keys(PRODUCTS);
  const nameOf=id=>id==='mensual'?(s.nombreMensual||`Cuenta ${monthlyName} · Mensual`):(s.nombreDiario||`Cuenta ${dailyName} · Diaria`);
  const metrics=[
    ['B − A · Patrimonio',g=>g.diferenciaBA],
    ['C − B · Beneficio atribuible al préstamo',g=>g.apalancamiento],
    ['C − B · Intereses netos extra de la cuenta',g=>round(g.C.netoTotal-g.B.netoTotal)],
    ['C · Intereses pagados del préstamo',g=>-g.C.prestamoInteres]
  ];
  const comps=[`<article class="comparison-card"><div class="compare-stat compare-head"><span></span>${ids.map(id=>`<strong>${nameOf(id)}</strong>`).join('')}</div>
    ${metrics.map(([label,fn])=>`<div class="compare-stat"><span>${label}</span>${ids.map(id=>cell(fn(current[id]))).join('')}</div>`).join('')}
    </article>`];
  for(const productId of ids){
    const group=current[productId],name=nameOf(productId);
    const limit=umbralFinanciacion(s,productId);
    const ok=limit===null?'na':s.tinPrestamo<=limit?'ok':'bad';
    thresh.push(`<div class="threshold ${ok}" title="TIN máximo del préstamo al que C iguala a B (mismas aportaciones, sin préstamo)"><span>TIN máx. rentable<br><b>${esc(name)}</b></span><strong>${limit===null?'No evaluable':percentage(limit,2)}</strong></div>`);
    for(const id of Object.keys(CASES))if(group[id].descubierto)warns.push(`${id} con ${name}`);
  }
  $('comparisons').innerHTML=comps.join('');
  $('thresholds').innerHTML=thresh.join('');
  const warn=$('warning');warn.style.display=warns.length?'flex':'none';
  warn.textContent=warns.length?'Atención: existe saldo negativo en '+warns.join(', ')+'. La cuenta no puede cubrir todas las retiradas sin financiación externa. No se modelan descubiertos ni sus costes.':'';
  updateDetails();Sim.grafico.drawChart();
}
function cell(value){return `<strong class="${value>=0?'delta-positive':'delta-negative'}">${signed(value)}</strong>`;}
const num=v=>v===0?'<span class="zero">0,00 €</span>':money(v);
function updateDetails(){
  if(!current)return;
  const account=$('detailAccount').value,nivel=$('detailGroup').querySelector('.active').dataset.g;
  const vista=Sim.resultados.vista(account,nivel);
  const filas=p=>Object.keys(CASES).map((id,i)=>{
    const r=p[id],c=`style="--c:${Sim.grafico.colors[account+'-'+id]}"`;
    return `<tr class="esc" ${c}>${i?'':`<td rowspan="3" class="per"><b>${esc(p.A.label)}</b>${p.A.sub?`<small>${esc(p.A.sub)}</small>`:''}</td>`}
      <td><span class="esc-badge">${id}</span></td><td>${money(r.inicio)}</td><td>${num(r.aportes)}</td><td>${num(r.neto)}</td><td>${num(r.retencion)}</td><td>${num(r.bruto)}</td>
      <td>${num(r.cuota)}</td><td>${num(r.deuda)}</td><td>${money(r.saldo)}</td><td><b class="${r.patrimonio<0?'negative':''}">${money(r.patrimonio)}</b></td></tr>`;}).join('');
  $('detailRows').innerHTML=vista.periodos.map(filas).join('');
  $('detailTotal').innerHTML=filas(vista.total);
}
// Una fila por período con los tres escenarios: {A,B,C} (la etiqueta viaja en A).
function vista(account,nivel){
  const s=Sim.data.state,g=Object.keys(CASES).map(id=>Sim.agrupacion.agrupar(current[account][id],s,nivel));
  const unir=(f)=>Object.fromEntries(Object.keys(CASES).map((id,i)=>[id,f(g[i])]));
  return {periodos:g[0].periodos.map((_,k)=>unir(x=>x.periodos[k])),total:unir(x=>x.total)};
}
function getCurrent(){return current;}
Sim.resultados={render,updateDetails,vista,getCurrent};
})(window.Simulador);
