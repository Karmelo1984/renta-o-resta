/* Pruebas de interfaz con Chrome headless (sin paquetes npm): node --test tests/ui.test.cjs
 * Se omiten si no hay Chrome. Cada caso inyecta un script en una copia temporal de index.html
 * y lee el resultado JSON volcado en el DOM. */
'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.join(__dirname, '..');
const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => fs.existsSync(p));
const skip = CHROME ? false : 'Chrome no disponible';
function run(script, width = 1440) {
  const tmp = path.join(root, '.ui-test.html');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(
    '</body>',
    `<script>addEventListener('load',()=>setTimeout(()=>{let out;try{out=JSON.stringify((function(){${script}})())}catch(e){out=JSON.stringify({error:String(e&&e.stack||e)})}
    const pre=document.createElement('pre');pre.id='__out';pre.textContent=out;document.body.append(pre)},150))</script></body>`,
  );
  fs.writeFileSync(tmp, html);
  try {
    const r = spawnSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'chr-'))}`,
        `--window-size=${width},900`,
        '--virtual-time-budget=3000',
        '--dump-dom',
        'file://' + tmp,
      ],
      { encoding: 'utf8', timeout: 30000 },
    );
    const m = /<pre id="__out">([\s\S]*?)<\/pre>/.exec(r.stdout || '');
    assert.ok(m, 'sin salida: ' + (r.stderr || '').slice(0, 300));
    const v = JSON.parse(
      m[1]
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&'),
    );
    assert.ok(!v.error, v.error);
    return v;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}
test(
  'Empieza plegado, el contenido no es enfocable y no existe la sección antigua',
  { skip },
  () => {
    const v =
      run(`const b=document.getElementById('toggleOneshots'),inner=document.getElementById('oneshotPanel').firstElementChild;
    return {exp:b.getAttribute('aria-expanded'),inert:inner.inert,old:!!document.getElementById('puntuales'),oldH:[...document.querySelectorAll('h2')].some(h=>h.textContent.includes('puntuales')&&h.id==='oneshotTitle'),
      inSidebar:!!document.querySelector('aside.controls #oneshotGrid'),ctl:b.getAttribute('aria-controls')}`);
    assert.deepEqual(
      [v.exp, v.inert, v.old, v.oldH, v.inSidebar, v.ctl],
      ['false', true, false, false, true, 'oneshotPanel'],
    );
  },
);
test(
  'Plegar/desplegar conserva valores; el resumen y los resultados se actualizan',
  { skip },
  () => {
    const v = run(`const $=id=>document.getElementById(id),b=$('toggleOneshots');
    b.click();const open=b.getAttribute('aria-expanded'),inertOpen=$('oneshotPanel').firstElementChild.inert;
    const before=document.querySelector('.matrix-row:nth-child(2) .result-card .rc-main').textContent;
    $('oneshotAmount').value='1500';$('oneshotAmount').dispatchEvent(new Event('input'));
    $('oneshotAdd').click();
    window.Simulador.resultados.render();const mid={m:$('oneshotMonths').textContent,t:$('oneshotTotal').textContent};
    const after=document.querySelector('.matrix-row:nth-child(2) .result-card .rc-main').textContent;
    const cardA=document.querySelector('.matrix-row:nth-child(1) .result-card .rc-main').textContent;
    b.click();b.click();
    const month1=document.querySelector('.once-month').textContent;
    const exp=JSON.stringify(Sim=window.Simulador.data.state.puntualesB);
    return {open,inertOpen,before,after,mid,month1,exp,still:{m:$('oneshotMonths').textContent,t:$('oneshotTotal').textContent},closed:b.getAttribute('aria-expanded'),cardA}`);
    assert.equal(v.open, 'true');
    assert.equal(v.inertOpen, false);
    assert.equal(v.mid.m, '1');
    assert.match(v.mid.t, /1500,00/);
    assert.notEqual(v.before, v.after);
    assert.equal(JSON.parse(v.exp)['1'], 1500);
    assert.deepEqual([v.still.m, v.still.t], [v.mid.m, v.mid.t]);
    assert.match(v.month1, /1500/);
  },
);
test('Rango, límites y borrado con 0 €; B y C reciben lo mismo', { skip }, () => {
  const v =
    run(`const $=id=>document.getElementById(id),st=window.Simulador.data.state,max=window.Simulador.CFG.puntual.max;
    $('toggleOneshots').click();
    const a=$('oneshotAmount');a.value=String(max+999);a.dispatchEvent(new Event('input'));const clamped=a.value;
    a.value='200';$('oneshotEvery').value='3';$('oneshotTo').value='10';$('oneshotSet').click();
    const meses=Object.keys(st.puntualesB).join();
    a.value='0';$('oneshotTo').value='1';$('oneshotSet').click();
    const afterZero=Object.keys(st.puntualesB).join();
    window.Simulador.resultados.render();const r=window.Simulador.resultados.getCurrent(),acc=Object.keys(r)[0];
    const eq=r[acc].B.aportacionPuntual===r[acc].C.aportacionPuntual&&r[acc].B.aportacionPuntual>0&&r[acc].A.aportacionPuntual===0;
    const csv=window.Simulador.resultados.vista(acc,'mes').total;
    return {clamped,max,meses,afterZero,eq,tot:csv.B.aportes}`);
  assert.equal(v.clamped, String(v.max));
  assert.equal(v.meses, '1,4,7,10');
  assert.equal(v.afterZero, '4,7,10');
  assert.ok(v.eq, JSON.stringify(v));
  assert.ok(v.tot >= 600);
});
for (const w of [320, 375, 768, 1024, 1440])
  test(`Sin desbordamiento horizontal a ${w}px (editor desplegado)`, { skip }, () => {
    const v = run(
      `document.getElementById('toggleOneshots').click();
    const bad=[...document.querySelectorAll('.controls *')].filter(e=>e.getBoundingClientRect().right>document.querySelector('.controls').getBoundingClientRect().right+1&&getComputedStyle(e).position!=='absolute').map(e=>e.tagName+'.'+e.className).slice(0,5);
    return {doc:document.documentElement.scrollWidth,win:innerWidth,bad}`,
      w,
    );
    assert.ok(v.doc <= v.win + 1, `scrollWidth ${v.doc} > ${v.win}`);
    assert.deepEqual(v.bad, []);
  });

test(
  'Restablecer usa el modal de la aplicación: Cancelar conserva, Aceptar restablece',
  { skip },
  () => {
    const v =
      run(`const $=id=>document.getElementById(id),st=window.Simulador.data.state;st.capital=1234;
    $('reset').click();const d=$('confirmModal'),abierto=d.open,titulo=$('confirmTitle').textContent;
    $('confirmNo').click();
    return {abierto,titulo}`);
    assert.equal(v.abierto, true);
    assert.equal(v.titulo, 'Restablecer configuración');
    const w =
      run(`const $=id=>document.getElementById(id),st=window.Simulador.data.state;st.capital=1234;
    $('reset').click();$('confirmNo').click();const tras={cap:st.capital,abierto:$('confirmModal').open};
    return tras`);
    assert.deepEqual([w.cap, w.abierto], [1234, false]);
  },
);
test(
  'Detalle: se pueden activar/desactivar A, B y C, pero siempre queda uno activo',
  { skip },
  () => {
    const v =
      run(`const $=id=>document.getElementById(id),btn=e=>$('detailEsc').querySelector('[data-e='+e+']'),rows=()=>$('detailRows').querySelectorAll('td.per').length&&$('detailRows').querySelector('td.per').rowSpan;
    const ini=rows();btn('A').click();btn('C').click();const dos=rows();const unico=[...$('detailEsc').querySelectorAll('.active')].map(b=>b.dataset.e).join();
    btn('B').click();const tras=[...$('detailEsc').querySelectorAll('.active')].map(b=>b.dataset.e).join();const dis=btn('B').getAttribute('aria-disabled');
    btn('A').click();const final=rows();
    return {ini,dos,unico,tras,dis,final,filas:$('detailRows').querySelectorAll('tr').length}`);
    assert.equal(v.ini, 3);
    assert.equal(v.dos, 1);
    assert.equal(v.unico, 'B');
    assert.equal(v.tras, 'B');
    assert.equal(v.dis, 'true');
    assert.equal(v.final, 2);
  },
);

test('Panel contraído: franja resumen con la configuración y cabecera fija', { skip }, () => {
  const v = run(`const $=id=>document.getElementById(id),L=document.querySelector('.layout');
    const antes=getComputedStyle($('strip')).display;$('toggleControls').click();
    const items=[...$('strip').querySelectorAll('.strip-item')].map(e=>e.textContent);
    return {antes,despues:getComputedStyle($('strip')).display,collapsed:L.classList.contains('collapsed'),items,head:getComputedStyle(document.querySelector('.head')).position,doc:document.documentElement.scrollWidth,win:innerWidth}`);
  assert.equal(v.antes, 'none');
  assert.equal(v.despues, 'flex');
  assert.equal(v.head, 'sticky');
  assert.ok(
    v.items.length >= 9 && v.items.some((t) => /Capital/i.test(t) && /25/.test(t)),
    v.items.join('|'),
  );
  assert.ok(v.doc <= v.win + 1);
});

test('Identidad, cabecera, escenarios, resultados y pie', { skip }, () => {
  const v =
    run(`const $=id=>document.getElementById(id),q=s=>document.querySelector(s),txt=e=>e.textContent.replace(/\\s+/g,' ').trim();
    const h=q('.head'),cnt=txt(q('.wrap'));
    const d=[...document.querySelectorAll('.scenario-description')].map(txt);
    const f=q('footer.footer');
    return {h1:txt(q('.head h1')),sub:txt(q('.head .subtitle')),title:document.title,
      letters:[...document.querySelectorAll('.scenario-letter')].map(txt).join(''),d,
      h2:txt($('summaryTitle')),seis:cnt.includes('Los seis escenarios'),k25:txt(q('.summary .notice')).includes('25.000'),
      ids:['closingText','calChip','accountHead','resultMatrix','warning'].map(i=>!!$(i)),
      fuera:!f.closest('.layout')&&f.parentElement.classList.contains('wrap'),footer:txt(f),
      iconAria:q('.head-icon').getAttribute('aria-hidden')}`);
  assert.equal(v.h1, 'Simulador de ahorro y apalancamiento');
  assert.equal(v.title, v.h1);
  assert.match(
    v.sub,
    /^Explora cómo evoluciona tu dinero .* mejorar —o empeorar— tu rentabilidad\.$/,
  );
  assert.equal(v.letters, 'ABC');
  assert.deepEqual(v.d, [
    'El capital inicial genera intereses, sin aportaciones posteriores.',
    'Suma aportaciones periódicas y puntuales al capital inicial.',
    'Repite las aportaciones de B, añade un préstamo y descuenta sus cuotas del saldo.',
  ]);
  assert.equal(v.h2, 'Comparativa de escenarios');
  assert.ok(!v.seis && !v.k25);
  assert.deepEqual(v.ids, [true, true, true, true, true]);
  assert.ok(v.fuera);
  for (const t of [
    'Sobre los resultados',
    'No garantiza rentabilidad',
    'tributación definitiva',
    'Herramienta de simulación financiera',
  ])
    assert.ok(v.footer.includes(t), t);
  assert.equal(v.iconAria, 'true');
});
for (const w of [320, 375, 550, 650, 768, 1024, 1440, 1920])
  test(`Cabecera compacta, escenarios y pie a ${w}px`, { skip }, () => {
    const v = run(
      `document.head.insertAdjacentHTML('beforeend','<style>*{transition:none!important}</style>');const q=s=>document.querySelector(s),gs=(e,p)=>getComputedStyle(e)[p],h=q('.head');
      const normal={eb:gs(q('.head .eyebrow'),'display'),sub:gs(q('.head .subtitle'),'display'),doc:document.documentElement.scrollWidth};
      h.classList.add('compacta');
      const r=q('.head-icon').getBoundingClientRect(),t=q('.head h1').getBoundingClientRect();
      const comp={eb:gs(q('.head .eyebrow'),'display'),sub:gs(q('.head .subtitle'),'display'),h:h.getBoundingClientRect().height,icon:r.width,iconVis:gs(q('.head-icon'),'display')!=='none'&&r.width>0,
        fs:gs(q('.head h1'),'fontSize'),ws:gs(q('.head h1'),'whiteSpace'),overlap:t.left<r.right,doc:document.documentElement.scrollWidth};
      h.classList.remove('compacta');
      const cols=gs(q('.scenario-overview-grid'),'gridTemplateColumns').split(' ').length;
      const clip=[...document.querySelectorAll('.scenario-description,.scenario-name,.footer *')].filter(e=>e.scrollWidth>e.clientWidth+1&&e.clientWidth>0).length;
      const f=q('.footer').getBoundingClientRect();
      return {normal,comp,cols,clip,fr:f.right,win:innerWidth}`,
      w,
    );
    assert.equal(v.normal.eb, 'block');
    assert.equal(v.comp.eb, 'none');
    assert.equal(v.comp.sub, 'none');
    assert.equal(v.comp.h, 54);
    assert.equal(v.comp.icon, 28);
    assert.ok(v.comp.iconVis && !v.comp.overlap);
    assert.equal(v.comp.fs, w <= 550 ? '16px' : '18px');
    assert.equal(v.comp.ws, 'nowrap');
    assert.equal(v.cols, w <= 650 ? 1 : 3);
    assert.equal(v.clip, 0);
    assert.ok(v.normal.doc <= v.win + 1 && v.comp.doc <= v.win + 1, 'desbordamiento horizontal');
    assert.ok(v.fr <= v.win + 1);
  });
test('Gráficos: dibujan y el tooltip responde al puntero sin escapar HTML', { skip }, () => {
  const v = run(`const ev=(id)=>{const c=document.getElementById(id),r=c.getBoundingClientRect();
      c.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+r.width/2,clientY:r.top+10}));
      return document.getElementById(id==='chart'?'chartTooltip':'intTooltip')};
    const a=ev('chart'),b=ev('intChart');
    return {a:a.style.display,aRows:a.querySelectorAll('div').length,b:b.style.display,bRows:b.querySelectorAll('div').length}`);
  assert.deepEqual([v.a, v.aRows > 0, v.b, v.bRows], ['block', true, 'block', 2]);
});
