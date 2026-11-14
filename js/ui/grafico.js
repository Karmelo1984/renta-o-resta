/* Evolución del patrimonio sobre Canvas sin bibliotecas externas. */
(function (Sim) {
'use strict';
const {$,money}=Sim.utils;
const colors={'mensual-A':'#058775','mensual-B':'#3566bb','mensual-C':'#b27d3a','diario-A':'#4cc9a8','diario-B':'#78a8f0','diario-C':'#e6b85c'};
let chartBox=null,hover=null;
function drawChart(){
  const all=Sim.resultados?.getCurrent?.();if(!all)return;
  const series={};
  document.querySelectorAll('#chartChecks input:checked').forEach(cb=>{const [acc,c]=cb.dataset.k.split('-');series[cb.dataset.k]=all[acc][c].points;});
  const canvas=$('chart'),rect=canvas.getBoundingClientRect();const w=rect.width,h=rect.height;if(w<20||h<20)return;
  const ratio=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.ceil(w*ratio);canvas.height=Math.ceil(h*ratio);
  const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);
  if(!Object.keys(series).length){chartBox=null;ctx.fillStyle='#788aa0';ctx.font='13px system-ui, sans-serif';ctx.textAlign='center';ctx.fillText('Marca al menos una opción',w/2,h/2);return;}
  const mobile=w<520,left=mobile?52:74,right=13,top=15,bottom=35,pw=w-left-right,ph=h-top-bottom;
  const points=Object.values(series)[0].length;
  const vals=Object.values(series).flatMap(rows=>rows.map(x=>x.patrimonio));
  let lo=Math.min(...vals),hi=Math.max(...vals),span=hi-lo;if(span<1)span=1000;lo-=span*.15;hi+=span*.12;
  const X=i=>left+i/(points-1)*pw,Y=v=>top+(hi-v)/(hi-lo)*ph;
  ctx.font='11px system-ui, sans-serif';ctx.textAlign='right';ctx.textBaseline='middle';
  for(let i=0;i<=4;i++){
    const value=lo+(hi-lo)*i/4,y=Y(value);
    ctx.strokeStyle='#e8edf4';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
    ctx.fillStyle='#788aa0';ctx.fillText(new Intl.NumberFormat('es-ES',{notation:'compact',maximumFractionDigits:1}).format(value)+' €',left-7,y);
  }
  const stride=Math.max(1,Math.ceil(points/(mobile?6:12)));ctx.textAlign='center';ctx.textBaseline='top';
  for(let i=0;i<points;i++)if(i===0||i===points-1||i%stride===0){ctx.fillStyle='#8190a5';ctx.fillText(i===0?'Inicio':i===points-1?'Cierre':Object.values(series)[0][i].corto,X(i),h-bottom+12);}
  for(const [id,rows] of Object.entries(series)){
    ctx.strokeStyle=colors[id];ctx.setLineDash(id.startsWith('diario')?[7,5]:[]);ctx.lineWidth=2.7;ctx.beginPath();
    rows.forEach((p,i)=>i===0?ctx.moveTo(X(i),Y(p.patrimonio)):ctx.lineTo(X(i),Y(p.patrimonio)));ctx.stroke();ctx.setLineDash([]);
  }
  if(hover!==null && hover>=0 && hover<points){
    const x=X(hover);ctx.setLineDash([4,4]);ctx.strokeStyle='#aebdce';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,h-bottom);ctx.stroke();ctx.setLineDash([]);
    for(const [id,rows] of Object.entries(series)){
      ctx.beginPath();ctx.fillStyle='white';ctx.strokeStyle=colors[id];ctx.lineWidth=2;
      ctx.arc(x,Y(rows[hover].patrimonio),4.3,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
  }
  const names={};document.querySelectorAll('#chartChecks .serie').forEach(l=>names[l.querySelector('input').dataset.k]=l.textContent.trim().replace(/\s+/g,' '));
  chartBox={left,pw,count:points,series,X,names};
}
function rowsAt(i){return Object.values(chartBox?chartBox.series:{})[0]?.[i]?.corto||'';}
function pointerMove(e){
  if(!chartBox)return;
  const rect=$('chart').getBoundingClientRect(),x=e.clientX-rect.left;
  const i=Math.max(0,Math.min(chartBox.count-1,Math.round((x-chartBox.left)/chartBox.pw*(chartBox.count-1))));hover=i;
  drawChart();
  const tip=$('chartTooltip');tip.style.display='block';
  tip.innerHTML=`<strong>${rowsAt(i)}</strong>`+
    Object.entries(chartBox.series).map(([id,rows])=>`<div><span>${chartBox.names[id]}</span><b>${money(rows[i].patrimonio)}</b></div>`).join('');
  const pos=Math.max(5,Math.min(rect.width-tip.offsetWidth-5,chartBox.X(i)-tip.offsetWidth/2));
  tip.style.left=pos+'px';tip.style.top='13px';
}
function clearHover(){hover=null;$('chartTooltip').style.display='none';drawChart();}
function init(){
  document.querySelectorAll('#chartChecks .serie').forEach(l=>l.style.setProperty('--c',colors[l.querySelector('input').dataset.k]));
  $('chart').addEventListener('pointermove',pointerMove);
  $('chart').addEventListener('pointerleave',clearHover);
  window.addEventListener('resize',()=>requestAnimationFrame(drawChart));
}
Sim.grafico={init,drawChart,colors};
})(window.Simulador);
