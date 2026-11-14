/* Entrada de datos, reglas de formulario y aportaciones puntuales. */
(function (Sim) {
'use strict';
const {$,validNumber,normalizeConfig,freshState}=Sim.utils;
const state=Sim.data.state;
const LIMITES=Sim.LIMITES;
const numericIds=['capital','prestamo','tinPrestamo','tinMensual','tinDiario','retencion','meses','periodicaB'];
const nameIds=['nombreMensual','nombreDiario'];
let debounced=null;
function scheduleRender(){clearTimeout(debounced);debounced=setTimeout(()=>Sim.resultados.render(),40);}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function setValue(id,value){
 const el=$(id),lower=Number(el.min||0),upper=el.max?Number(el.max):Infinity;
 const parsed=Number(value);
 if(!Number.isFinite(parsed))return;
 let n=clamp(parsed,lower,upper);
 if(id==='meses')n=Math.max(1,Math.round(n));
 state[id]=n;
 // Escribir o pegar un valor superior al máximo también lo corrige inmediatamente.
 if(parsed!==n)el.value=String(n);
 const slider=$(id+'Range');if(slider){slider.value=String(n);}
 if(id==='meses')buildOneshots();
 scheduleRender();
}
function installKeyboardLimits(input){
 input.addEventListener('keydown',e=>{
  if(!e.ctrlKey&&!e.metaKey&&!e.altKey && ['e','E','+','-'].includes(e.key))e.preventDefault();
 });
}
function makeStepper(input){
 const group=input.parentElement;if(!group.classList.contains('num') || group.querySelector('.stepper-btn'))return;
 installKeyboardLimits(input);
 for(const [sign,signText,cls,verb] of [[-1,'−','minus','Reducir'],[1,'+','plus','Aumentar']]){
   const button=document.createElement('button');button.className='stepper-btn '+cls;button.type='button';button.textContent=signText;
   const label=document.querySelector('label[for="'+input.id+'"]')?.textContent||input.getAttribute('aria-label')||'valor';
   button.setAttribute('aria-label',`${verb} ${label.trim()}`);
   const step=Number(input.step)||1;
   button.title=`${verb} ${step} ${['capital','prestamo','periodicaB'].includes(input.id)||input.dataset.oneshotKey?'€':(input.id.startsWith('tin')||input.id==='retencion'?'puntos porcentuales':'meses')}`;
   button.addEventListener('click',()=>{
     const decimal=(String(input.step).split('.')[1]||'').length;
     const min=input.min===''?-Infinity:Number(input.min),max=input.max===''?Infinity:Number(input.max);
     const base=validNumber(input.value,0);
     const next=clamp(Math.round((base+sign*step)*10**decimal)/10**decimal,min,max);
     input.value=decimal?next.toFixed(decimal):String(next);
     input.dispatchEvent(new Event('input',{bubbles:true}));
   });
   sign<0?group.prepend(button):group.append(button);
 }
}
let selMonth=1;
const eur=n=>n.toLocaleString('es-ES')+' €';
function buildOneshots(){
 const cals=Sim.calculos.calendario(state,state.meses),years=new Map();
 selMonth=Math.min(selMonth,state.meses);
 cals.forEach((c,i)=>{const k=c.y||'Año '+(Math.floor(i/12)+1);if(!years.has(k))years.set(k,[]);years.get(k).push({m:i+1,c});});
 $('oneshotGrid').replaceChildren(...[...years].map(([k,items])=>{
   const box=document.createElement('section');box.className='once-year';
   box.innerHTML=`<h3><span>${k}</span><span class="once-total"></span></h3><div class="once-months"></div>`;
   items.forEach(({m,c},j)=>{
     const b=document.createElement('button');b.type='button';b.className='once-month';b.dataset.month=String(m);
     // Alinea el primer mes del año con su columna (6 por fila).
     if(j===0&&c.y)b.style.gridColumnStart=String((c.m-1)%6+1);
     box.lastChild.append(b);
   });
   return box;
 }));
 refreshOneshots();refreshEditor();
}
function refreshOneshots(){
 const P=state.puntualesB,cals=Sim.calculos.calendario(state,state.meses);
 for(const b of $('oneshotGrid').querySelectorAll('.once-month')){
   const m=Number(b.dataset.month),a=P[m]||0,c=cals[m-1];
   b.innerHTML=`<small>${c.corto.split(' ')[0]}</small><b>${a?a.toLocaleString('es-ES'):'–'}</b>`;
   b.classList.toggle('has',a>0);b.classList.toggle('sel',m===selMonth);b.setAttribute('aria-pressed',String(m===selMonth));
   b.setAttribute('aria-label',`${c.label}: ${a?eur(a):'sin aportación'}`);
 }
 for(const box of $('oneshotGrid').children)
   box.querySelector('.once-total').textContent=eur([...box.querySelectorAll('.once-month')].reduce((s,b)=>s+(P[b.dataset.month]||0),0));
}
function refreshEditor(){
 const cals=Sim.calculos.calendario(state,state.meses);
 $('oneshotSel').textContent=cals[selMonth-1].label;
 $('oneshotAmount').value='0';
 $('oneshotTo').innerHTML=cals.slice(selMonth-1).map((c,i)=>`<option value="${selMonth+i}">${c.label}</option>`).join('');
}
function setOneshot(month,amount){if(amount>0)state.puntualesB[month]=amount;else delete state.puntualesB[month];}
function applyConfigToDOM(){
 for(const [id,c] of Object.entries(Sim.CFG.campos)){
   const el=$(id);Object.assign(el,{min:c.min,max:c.max,step:c.step,value:c.valor});
   const r=$(id+'Range');if(r)Object.assign(r,{min:c.min,max:c.rangeMax,step:c.step,value:c.valor});
 }
 for(const id of nameIds)$(id).maxLength=Sim.CFG.nombres.maxLength;
 // Límites visibles en textos y campos: siempre desde config.js.
 for(const el of document.querySelectorAll('[data-limite]')){const k=el.dataset.limite;el.textContent=(k==='puntual'?Sim.CFG.puntual.max:Sim.CFG.campos[k].max).toLocaleString('es-ES');}
 $('oneshotEvery').max=String(Sim.CFG.campos.meses.max);
 makeStepper($('oneshotEvery'));
}
function bindControls(){
 applyConfigToDOM();
 for(const id of numericIds){
   const el=$(id);makeStepper(el);
   el.addEventListener('input',()=>{if(el.value.trim()==='')return;const n=Number(el.value);if(Number.isFinite(n))setValue(id,n);});
   el.addEventListener('blur',()=>{if(el.value.trim()===''){el.value=state[id];return;}const n=validNumber(el.value,state[id]);setValue(id,n);el.value=String(state[id]);});
   $(id+'Range')?.addEventListener('input',e=>{el.value=e.target.value;setValue(id,e.target.value);});
 }
 for(const id of nameIds)$(id).addEventListener('input',e=>{state[id]=e.target.value.trim();scheduleRender();});
 const amountEl=$('oneshotAmount'),readAmount=()=>clamp(validNumber(amountEl.value,0),0,LIMITES.puntual);
 Object.assign(amountEl,{max:LIMITES.puntual,step:Sim.CFG.puntual.step});makeStepper(amountEl);
 $('oneshotGrid').addEventListener('click',e=>{
   const b=e.target.closest('.once-month');if(!b)return;
   selMonth=Number(b.dataset.month);refreshOneshots();refreshEditor();
 });
 amountEl.addEventListener('blur',()=>{amountEl.value=String(readAmount());});
 // Rango: desde el mes seleccionado hasta «Aplicar hasta», cada X meses.
 // Sumar acumula sobre lo existente (tope CFG.puntual.max por mes); Establecer sustituye (0 borra).
 const applyRange=add=>{
   const amount=readAmount(),to=Number($('oneshotTo').value),every=clamp(Math.round(validNumber($('oneshotEvery').value,1)),1,Sim.CFG.campos.meses.max);
   for(let m=selMonth;m<=to;m+=every)setOneshot(m,add?clamp((state.puntualesB[m]||0)+amount,0,LIMITES.puntual):amount);
   refreshOneshots();scheduleRender();
 };
 $('oneshotAdd').addEventListener('click',()=>applyRange(true));
 $('oneshotSet').addEventListener('click',()=>applyRange(false));
 $('clearOneshots').addEventListener('click',()=>{state.puntualesB={};buildOneshots();Sim.resultados.render();});
 $('toggleControls').addEventListener('click',e=>{const c=document.querySelector('.layout').classList.toggle('collapsed');e.target.textContent=c?'»':'«';e.target.setAttribute('aria-expanded',!c);e.target.setAttribute('aria-label',c?'Expandir configuración':'Contraer configuración');window.dispatchEvent(new Event('resize'));});
 $('reset').addEventListener('click',()=>{if(!confirm('¿Restablecer importes, tipos, plazo y aportaciones puntuales?'))return;Object.assign(state,freshState());syncUI();Sim.resultados.render();});
 $('calendario').addEventListener('change',e=>{state.calendario=e.target.value;$('inicioField').hidden=state.calendario!=='real';buildOneshots();scheduleRender();});
 for(const id of ['inicioMes','inicioAnio'])$(id).addEventListener('change',()=>{state.inicio=$('inicioAnio').value+'-'+$('inicioMes').value;buildOneshots();scheduleRender();});
 $('detailAccount').addEventListener('change',()=>Sim.resultados.updateDetails());
 $('detailGroup').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;for(const x of $('detailGroup').children)x.classList.toggle('active',x===b);Sim.resultados.updateDetails();});
 $('chartChecks').addEventListener('change',()=>Sim.grafico.drawChart());
 $('print').addEventListener('click',()=>window.print());
 $('exportCsv').addEventListener('click',()=>Sim.archivos.exportCSV());
 $('exportJson').addEventListener('click',()=>Sim.archivos.exportConfig());
 $('importJson').addEventListener('click',()=>$('jsonFile').click());
 $('jsonFile').addEventListener('change',e=>Sim.archivos.importConfig(e));
}
function fillInicio(){
 const [lo,hi]=Sim.utils.rangoAnios(),meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
 $('inicioMes').innerHTML=meses.map((n,i)=>`<option value="${String(i+1).padStart(2,'0')}">${n}</option>`).join('');
 $('inicioAnio').innerHTML=Array.from({length:hi-lo+1},(_,i)=>`<option>${lo+i}</option>`).join('');
}
function syncUI(){$('calendario').value=state.calendario;if(!$('inicioAnio').options.length)fillInicio();[$('inicioAnio').value,$('inicioMes').value]=state.inicio.split('-');$('inicioField').hidden=state.calendario!=='real';for(const id of nameIds)$(id).value=state[id]||'';for(const id of numericIds){$(id).value=state[id];const slider=$(id+'Range');if(slider){if(state[id]>Number(slider.max))slider.max=state[id];slider.value=state[id];}}buildOneshots();}
Sim.controles={bindControls,syncUI,buildOneshots};
})(window.Simulador);
