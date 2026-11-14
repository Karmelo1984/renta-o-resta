/* Pruebas sin paquetes npm: node --test tests/calculos.test.cjs */
'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const sandbox={window:{},Intl,Number,Math,Date,JSON,Object,Array,console};
vm.createContext(sandbox);
for(const file of ['js/config.js','js/core/estado.js','js/core/calculos.js','js/core/agrupacion.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
const sim=sandbox.window.Simulador;
const {simular,simularTodos,umbralFinanciacion,loanSchedule}=sim.calculos;
const config=()=>sim.utils.freshState();
// Valores esperados derivados de config.js: cambiar los predeterminados no rompe las pruebas.
const D=config(),round2=sim.utils.round;
const net=g=>round2(g-round2(g*D.retencion/100));
const close=(actual,expected,tol=0.01)=>assert.ok(Math.abs(actual-expected)<=tol,`${actual} != ${expected} (tol ${tol})`);

test('A mensual: 30/360, abono el día 30 del mes, sin pendiente al cierre',()=>{
 const c=config();c.meses=1;c.periodicaB=0;c.periodicaC=0;
 const r=simular(c,'A','mensual');
 const g=round2(D.capital*D.tinMensual/100*30/360);
 close(r.rows[0].brutoDevengado,g);
 close(r.rows[0].brutoAbonado,g);
 close(r.rows[0].retencionAbonada,round2(g*D.retencion/100));
 close(r.rows[0].netoAbonado,net(g));
 close(r.saldo,D.capital+net(g));
 close(r.patrimonio,D.capital+net(g));
 assert.equal(r.rows.length,1);
 const e=r.ledger.find(x=>x.type==='Abono de intereses');
 assert.equal(e.month,1);assert.equal(e.day,30);
});

test('A diaria: abono el mismo día y reinversión desde el día siguiente',()=>{
 const c=config();c.meses=1;
 const r=simular(c,'A','diario');
 close(r.rows[0].brutoDevengado,D.capital*D.tinDiario/100/360*30,1);
 const ab=r.ledger.filter(e=>e.type==='Abono de intereses');
 assert.equal(ab.length,30);
 assert.equal(ab[0].day,1);
 const g1=round2(D.capital*D.tinDiario/100/360);
 close(ab[0].net,net(g1),.0001);close(ab[0].balance,D.capital+net(g1),.0001);
 assert.ok(ab[1].gross>=ab[0].gross);
 assert.ok(r.saldo>c.capital);
});

test('A ignora aportaciones compartidas por B y C',()=>{
 const c=config();c.meses=12;
 const old=simular(c,'A','mensual').patrimonio;
 c.periodicaB=7000;c.puntualesB={1:20000,6:5000};
 close(simular(c,'A','mensual').patrimonio,old,0);
});

test('B: aportación periódica y puntual el día 1 aumentan saldo y base remunerada',()=>{
 const c=config();c.meses=1;c.periodicaB=100;c.puntualesB={1:300};
 const r=simular(c,'B','mensual');
 close(r.aportaciones,400,0);
 // Las dos aportaciones cuentan desde el devengo del día 1: 30 días con 25400 €.
 close(r.rows[0].brutoDevengado,(c.capital+400)*30*c.tinMensual/100/360,.01);
 assert.equal(r.ledger.find(e=>e.type==='Aportación puntual').day,1);
});

test('C: crédito y cuotas sistema francés, día 30 de cada mes, cierre tras la última',()=>{
 const c=config();c.meses=12;c.periodicaB=0;
 const r=simular(c,'C','mensual');
 const q=loanSchedule(c.prestamo,c.tinPrestamo,c.meses);
 close(r.initial,c.capital+c.prestamo,0);
 close(r.cuotaTeorica,q.nominal,0);
 close(r.cuotasPagadas,c.prestamo+r.prestamoInteres,.01);
 close(r.deuda,0,0);
 const cuotas=r.ledger.filter(e=>e.type==='Cuota préstamo');
 assert.equal(cuotas.length,c.meses);
 assert.deepEqual([cuotas[0].month,cuotas[0].day],[1,30]);
 assert.deepEqual([cuotas.at(-1).month,cuotas.at(-1).day],[c.meses,30]);
 assert.equal(r.rows.length,c.meses);
});

test('El día 30 el devengo es previo a la cuota; el día 1 siguiente ya parte sin ella',()=>{
 const c=config();c.meses=2;c.periodicaB=0;
 const r=simular(c,'C','diario');
 const day=(m,d,type)=>r.ledger.filter(e=>e.month===m&&e.day===d);
 const ev=day(1,30);
 assert.equal(ev[0].type,'Abono de intereses');
 assert.equal(ev.at(-1).type,'Cuota préstamo');
 const next=day(2,1)[0];
 assert.ok(next.balance<ev[0].balance);
});

test('La cuenta mensual no capitaliza durante el mes; la diaria sí capitaliza diariamente',()=>{
 const c=config();c.meses=2;c.periodicaB=0;
 const monthly=simular(c,'A','mensual');
 const daily=simular(c,'A','diario');
 close(monthly.rows[0].brutoDevengado,c.capital*c.tinMensual/100*30/360,.005);
 assert.ok(monthly.rows[1].brutoDevengado>monthly.rows[0].brutoDevengado);
 assert.equal(monthly.ledger.filter(e=>e.type==='Abono de intereses').length,2);
 assert.equal(daily.ledger.filter(e=>e.type==='Abono de intereses').length,60);
});

test('Conciliación: patrimonio = capital + aportaciones + interés neto − intereses del préstamo',()=>{
 const c=config();c.meses=24;c.puntualesB={5:1000,18:500};
 const variants=simularTodos(c);
 for(const product of ['mensual','diario'])for(const caseId of ['A','B','C']){
   const r=variants[product][caseId];
   close(r.patrimonio,c.capital+r.aportaciones+r.netoTotal-r.prestamoInteres,.03);
   close(r.beneficio,r.netoTotal-r.prestamoInteres,.03);
   assert.equal(r.deuda,0);
 }
});

test('Aportaciones periódicas y puntuales solo en Meses 1..N, día 1',()=>{
 const c=config();c.meses=2;c.periodicaB=500;c.puntualesB={1:100,2:200,3:99999};
 const r=simular(c,'B','mensual');
 close(r.aportaciones,1300,0);
 assert.equal(r.rows.length,2);
});

test('La cuenta diaria a retención 0 supera su equivalente con retención 19 en ambos saldos',()=>{
 const c=config();c.meses=6;
 const withTax=simular(c,'B','diario');c.retencion=0;
 const withoutTax=simular(c,'B','diario');
 assert.ok(withoutTax.patrimonio>withTax.patrimonio);
 assert.ok(withoutTax.netoTotal>withTax.netoTotal);
});

test('El umbral de TIN no altera la configuración y depende de la remuneración',()=>{
 const c=config();c.meses=12;c.periodicaB=1000;
 const snapshot=JSON.stringify(c);
 const m=umbralFinanciacion(c,'mensual'),d=umbralFinanciacion(c,'diario');
 const tope=sim.CFG.umbral.max;
 assert.ok(m>0&&m<tope);
 assert.ok(d>0&&d<tope);
 assert.equal(JSON.stringify(c),snapshot);
});

test('Préstamo sin capital: C y su control coinciden, umbral no aplicable',()=>{
 const c=config();c.meses=7;c.prestamo=0;
 const r=simularTodos(c);
 assert.equal(r.mensual.apalancamiento,0);
 assert.equal(r.diario.apalancamiento,0);
 assert.equal(umbralFinanciacion(c,'mensual'),null);
});


test('B y C tienen exactamente las mismas aportaciones, fechas y cuantías (ambos productos)',()=>{
 const c=config();c.meses=5;c.periodicaB=1100;c.puntualesB={1:100,2:20000,4:2500,5:400};
 // Importaciones antiguas pueden traer claves C obsoletas, pero el motor debe ignorarlas.
 c.periodicaC=19999;c.puntualesC={1:20000,3:20000};
 for(const product of ['mensual','diario']){
   const b=simular(c,'B',product),v=simular(c,'C',product);
   close(b.aportacionPeriodica,v.aportacionPeriodica,0);
   close(b.aportacionPuntual,v.aportacionPuntual,0);
   close(b.aportaciones,v.aportaciones,0);
   for(const type of ['Aportación periódica','Aportación puntual']){
     const eventsB=b.ledger.filter(e=>e.type===type).map(e=>[e.month,e.day,e.change]);
     const eventsC=v.ledger.filter(e=>e.type===type).map(e=>[e.month,e.day,e.change]);
     assert.deepEqual(eventsB,eventsC);
   }
   close(b.initial+c.prestamo,v.initial,0);
   const difference=simularTodos(c)[product].diferenciaCB;
   close(difference,v.patrimonio-b.patrimonio,.01);
 }
});

test('Validación de cantidades máximas, puntuales y formato legacy de C',()=>{
 const normalize=sim.utils.normalizeConfig;
 const K=sim.CFG.campos,P=sim.CFG.puntual.max;
 const max=normalize({capital:K.capital.max,prestamo:K.prestamo.max,periodicaB:K.periodicaB.max,puntualesB:{1:P,12:1500}});
 assert.equal(max.capital,K.capital.max);assert.equal(max.prestamo,K.prestamo.max);
 assert.equal(max.periodicaB,K.periodicaB.max);assert.equal(max.puntualesB[1],P);
 for(const values of [{capital:K.capital.max+1},{prestamo:K.prestamo.max+1},{periodicaB:K.periodicaB.max+1},{puntualesB:{1:P+1}},{puntualesB:{1:-1}},{capital:-1}]){
   assert.throws(()=>normalize(values),/fuera de rango|inválida/);
 }
 const legacy=normalize({capital:D.capital,prestamo:D.prestamo,periodicaB:D.periodicaB,periodicaC:19000,puntualesB:{2:600},puntualesC:{2:20000}});
 assert.equal(legacy.periodicaB,D.periodicaB);
 assert.deepEqual(JSON.parse(JSON.stringify(legacy.puntualesB)),{2:600});
 assert.equal(Object.hasOwn(legacy,'periodicaC'),false);
 assert.equal(Object.hasOwn(legacy,'puntualesC'),false);
});

test('El coste de C es el de B más el préstamo y las cuotas, manteniendo entradas idénticas',()=>{
 const c=config();c.meses=12;c.periodicaB=500;c.puntualesB={1:5000,7:1500};
 for(const product of ['mensual','diario']){
   const b=simular(c,'B',product),v=simular(c,'C',product);
   close(v.aportaciones,b.aportaciones,0);
   close(v.loan,c.prestamo,0);
   close(v.cuotasPagadas, v.loan+v.prestamoInteres,.01);
   close(v.patrimonio-b.patrimonio, v.netoTotal-b.netoTotal-v.prestamoInteres,.04);
 }
});

const [Y0,Y1]=sim.utils.rangoAnios();
const bisiesto=y=>(y%4===0&&y%100!==0)||y%400===0;
const dd=n=>String(n).padStart(2,'0');
test('Calendario real: enero del año inicial, 31 días, base 365/366, abono el 31/01',()=>{
 const c=config();c.meses=1;c.periodicaB=0;c.calendario='real';c.inicio=Y0+'-01';
 const r=simular(c,'A','mensual');
 close(r.rows[0].brutoDevengado,c.capital*c.tinMensual/100*31/(bisiesto(Y0)?366:365),.01);
 assert.equal(r.rows[0].label,'ene '+Y0);
 assert.equal(r.ledger.find(e=>e.type==='Abono de intereses').fecha,'31/01/'+Y0);
});
test('Calendario real: febrero con sus días reales (29 si bisiesto); cuota el último día',()=>{
 const y=Y0,fd=bisiesto(y)?29:28;
 const c=config();c.meses=2;c.periodicaB=0;c.calendario='real';c.inicio=y+'-01';
 const r=simular(c,'C','mensual'),a=simular(c,'A','diario');
 close(a.rows[1].brutoDevengado,a.rows[1].inicio*c.tinDiario/100*fd/(bisiesto(y)?366:365),.5);
 assert.equal(r.ledger.filter(e=>e.type==='Cuota préstamo').map(e=>e.fecha).join(),`31/01/${y},${fd}/02/${y}`);
 assert.equal(a.ledger.filter(e=>e.type==='Abono de intereses').length,31+fd);
});
test('Calendario real: un plazo largo cruza años y usa la base de cada año',()=>{
 const c=config();c.meses=14;c.periodicaB=0;c.calendario='real';c.inicio=Y0+'-12';
 const r=simular(c,'A','mensual');
 assert.equal(r.rows[1].label,'ene '+(Y0+1));
 close(r.rows[1].brutoDevengado,r.rows[1].inicio*c.tinMensual/100*31/(bisiesto(Y0+1)?366:365),.01);
});
test('Importación: calendario e inicio se validan (año actual .. actual+aniosAdelante)',()=>{
 const n=sim.utils.normalizeConfig;
 assert.throws(()=>n({calendario:'x'}));
 assert.throws(()=>n({inicio:Y0+'-13'}));
 assert.throws(()=>n({inicio:(Y0-1)+'-06'}),/año entre/);
 assert.throws(()=>n({inicio:(Y1+1)+'-06'}),/año entre/);
 assert.equal(n({calendario:'real',inicio:Y1+'-12'}).inicio,Y1+'-12');
 assert.equal(n({}).inicio,D.inicio);
 assert.equal(n({}).calendario,sim.CFG.calendario.modo);
});

// Agrupación del detalle comparativo: solo suma el registro diario, sin recalcular.
const NIVELES=['dia','quincena','mes','trimestre','semestre','anio'];
for(const calendario of ['30360','real'])for(const productId of ['mensual','diario'])for(const nivel of NIVELES){
 test(`Agrupación ${nivel} · ${productId} · ${calendario}: sumas y cierres coinciden con el motor`,()=>{
  const c=config();c.meses=14;c.calendario=calendario;c.puntualesB={3:2000,8:500};
  for(const caseId of ['A','B','C']){
   const r=simular(c,caseId,productId),{periodos,total}=sim.agrupacion.agrupar(r,c,nivel);
   const sum=k=>round2(periodos.reduce((s,p)=>s+p[k],0));
   close(sum('aportes'),r.aportaciones,.001);close(sum('neto'),r.netoAbonado,.001);
   close(sum('retencion'),r.retencionAbonada,.001);close(sum('bruto'),r.brutoAbonado,.001);
   close(sum('cuota'),r.cuotasPagadas,.001);
   // Continuidad: el saldo inicial de cada período es el saldo final del anterior.
   periodos.forEach((p,i)=>{if(i)close(p.inicio,periodos[i-1].saldo,0);});
   close(periodos[0].inicio,r.initial,0);
   // Cierre: el último período acaba en el estado final del motor (sin interés pendiente).
   const z=periodos.at(-1);close(z.saldo,r.saldo,0);close(z.deuda,r.deuda,0);close(z.patrimonio,r.patrimonio,.001);
   for(const k of ['inicio','aportes','neto','retencion','bruto','cuota','deuda','saldo','patrimonio'])close(total[k],k==='inicio'?r.initial:['deuda','saldo','patrimonio'].includes(k)?z[k]:sum(k),.001);
   // Cada período mensual agregado coincide con las filas mensuales del motor.
   if(nivel==='mes')periodos.forEach((p,i)=>{const m=r.rows[i];close(p.aportes,m.periodica+m.puntual,.001);close(p.neto,m.netoAbonado,.001);close(p.cuota,m.cuota,.001);close(p.patrimonio,m.patrimonio,.001);});
  }
 });
}
test('Número de períodos por agrupación',()=>{
 const c=config();c.meses=14;c.calendario='30360';
 const r=simular(c,'B','mensual'),n=l=>sim.agrupacion.agrupar(r,c,l).periodos.length;
 assert.deepEqual([n('dia'),n('quincena'),n('mes'),n('trimestre'),n('semestre'),n('anio')],[420,28,14,5,3,2]);
});
test('Patrimonio intramensual (cuenta mensual) suma el neto devengado pendiente',()=>{
 const c=config();c.meses=1;c.calendario='30360';c.periodicaB=0;
 const r=simular(c,'A','mensual'),q=sim.agrupacion.agrupar(r,c,'quincena').periodos[0];
 assert.equal(q.neto,0);assert.ok(q.patrimonio>q.saldo);
});
