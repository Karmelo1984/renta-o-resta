/* Servicios de descarga de archivos y persistencia opcional local. */
(function (Sim) {
'use strict';
const {$,normalizeConfig}=Sim.utils;
const state=Sim.data.state;
const csvCell=value=>'"'+String(value).replace(/"/g,'""')+'"';
const numberCell=value=>Number(value).toFixed(2).replace('.',',');
function download(source,name,type){
 const blob=new Blob([source],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function exportCSV(){
 const account=$('detailAccount').value,nivel=$('detailGroup').querySelector('.active').dataset.g;
 const v=Sim.resultados.vista(account,nivel);
 const lines=[['Período','Detalle período','Escenario','Saldo inicial','Aportes','Interés neto','Retención','Interés bruto','Cuota préstamo','Deuda pendiente','Saldo final','Patrimonio'].map(csvCell).join(';')];
 for(const p of [...v.periodos,v.total])for(const id of ['A','B','C']){
   const r=p[id];
   lines.push([p.A.label,p.A.sub,id,...[r.inicio,r.aportes,r.neto,r.retencion,r.bruto,r.cuota,r.deuda,r.saldo,r.patrimonio].map(numberCell)].map(csvCell).join(';'));
 }
 download('\uFEFF'+lines.join('\r\n'),`detalle_${account}_${nivel}_${state.meses}m.csv`,'text/csv;charset=utf-8');
}
function exportConfig(){download(JSON.stringify({app:'simulador_30_360',version:3,configuration:state},null,2),'configuracion_6_escenarios.json','application/json;charset=utf-8');}
async function importConfig(event){
 const file=event.target.files[0];if(!file)return;
 try{const data=JSON.parse(await file.text());Object.assign(state,normalizeConfig(data));Sim.controles.syncUI();Sim.resultados.render();notify('Configuración importada.');}
 catch(e){notify('Error al importar JSON: '+e.message,true);}finally{event.target.value='';}
}
function notify(message,error=false){$('saveMsg').textContent=message;$('saveMsg').style.color=error?'var(--red)':'var(--teal)';}
Sim.archivos={exportCSV,exportConfig,importConfig,notify};
})(window.Simulador);
