/* Configuración y utilidades compartidas. Sin DOM en el estado financiero. */
(function (global) {
  'use strict';
  const CFG = global.SimuladorConfig;
  const MAX_MESES = CFG.campos.meses.max;
  const LIMITES = Object.freeze({capital:CFG.campos.capital.max,prestamo:CFG.campos.prestamo.max,periodicaB:CFG.campos.periodicaB.max,puntual:CFG.puntual.max});
  const mesActual = () => { const d=new Date(),c=CFG.calendario; return (c.anioInicio??d.getFullYear())+'-'+String(c.mesInicio??d.getMonth()+1).padStart(2,'0'); };
  const rangoAnios = () => { const y=new Date().getFullYear(); return [y,y+CFG.calendario.aniosAdelante]; };
  const defaults = Object.freeze({
    ...Object.fromEntries(Object.entries(CFG.campos).map(([k,c])=>[k,c.valor])),
    nombreMensual: CFG.nombres.nombreMensual, nombreDiario: CFG.nombres.nombreDiario,
    puntualesB: {}, calendario: CFG.calendario.modo, inicio: mesActual()
  });
  const moneda = new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR', minimumFractionDigits:2, maximumFractionDigits:2 });
  const numero = new Intl.NumberFormat('es-ES', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const round = v => Math.round((v + Math.sign(v || 1)*Number.EPSILON)*100)/100;
  const money = v => moneda.format(Math.abs(v) < 0.005 ? 0 : v);
  const signed = v => (v>0.005?'+':'')+money(v);
  const percentage = (v, digits=3) => v==null ? '—' : new Intl.NumberFormat('es-ES', { minimumFractionDigits:digits, maximumFractionDigits:digits }).format(v)+' %';
  const $ = id => document.getElementById(id);
  const validNumber = (v, fallback=0) => Number.isFinite(Number(v)) && String(v).trim()!=='' ? Number(v):fallback;
  const freshState=()=>JSON.parse(JSON.stringify(defaults));
  function normalizeConfig(payload) {
    const source=payload&&typeof payload==='object' ? (payload.configuration || payload):{};
    const next=freshState();
    const amounts=['capital','prestamo','periodicaB'];
    const rates=['tinPrestamo','tinMensual','tinDiario','retencion'];
    for (const k of [...amounts,...rates]) {
      if(source[k]===undefined)continue;
      const n=Number(source[k]);
      const upper=CFG.campos[k].max;
      if(!Number.isFinite(n)||n<0||n>upper)throw new Error(`Valor fuera de rango para ${k}: máximo ${upper.toLocaleString('es-ES')}.`);
      next[k]=k==='retencion'?Math.min(100,n):n;
    }
    for(const k of ['nombreMensual','nombreDiario'])if(typeof source[k]==='string')next[k]=source[k].trim().slice(0,CFG.nombres.maxLength);
    if(source.calendario!==undefined){if(!['30360','real'].includes(source.calendario))throw new Error('Calendario desconocido.');next.calendario=source.calendario;}
    if(source.inicio!==undefined){const [lo,hi]=rangoAnios(),y=Number(String(source.inicio).slice(0,4));if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(source.inicio)||y<lo||y>hi)throw new Error(`Mes de inicio inválido: año entre ${lo} y ${hi}.`);next.inicio=source.inicio;}
    if(source.meses!==undefined){const n=Number(source.meses);if(!Number.isInteger(n)||n<1||n>MAX_MESES)throw new Error(`El plazo debe estar entre 1 y ${MAX_MESES} meses.`);next.meses=n;}
    // En v3 solo existe una fuente de aportaciones compartida por B y C.
    // Al importar configuraciones v2 se ignoran las antiguas claves exclusivas de C.
    for(const k of ['puntualesB']){
      const src=source[k];if(src==null)continue;
      if(!src || Array.isArray(src)||typeof src!=='object')throw new Error('Formato de aportaciones incorrecto: '+k);
      next[k]={};
      for(const [key,value] of Object.entries(src)){
        const m=Number(key),n=Number(value);
        if(!Number.isInteger(m)||m<1||m>MAX_MESES||!Number.isFinite(n)||n<0||n>LIMITES.puntual)throw new Error(`Aportación puntual inválida en el mes ${key}: máximo ${LIMITES.puntual.toLocaleString('es-ES')} €.`);
        if(n>0)next[k][m]=n;
      }
    }
    return next;
  }
  global.Simulador={
    MAX_MESES, LIMITES, CFG, defaults, data:{state:freshState()},
    utils:{rangoAnios,$,round,money,signed,percentage,numero,validNumber,freshState,normalizeConfig}
  };
})(window);
