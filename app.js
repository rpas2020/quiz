/* ====== Lógica del Quiz RPAS (PWA) ====== */
let data = [];      // banco de la sesión (25 o 100)
let idx = 0;        // índice actual
let answers = {};   // {id: 'a'|'b'|'c'|'d'}
let keyMap = {};    // {id: 'a'|'b'|'c'|'d'} desde FULL_BANK

// util DOM
const el = (id) => document.getElementById(id);
const intro = el('intro'), quiz = el('quiz'), results = el('results');
const qtext = el('qtext'), optionsBox = el('options');
const idxSpan = el('idx'), lenSpan = el('len'), status = el('status'), bar = el('bar');

// utils
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr;
}
function sampleN(arr, n){
  const a = shuffle([...arr]);
  return a.slice(0, Math.min(n, a.length));
}

// banco completo desde localStorage (lo deja questions.js)
function getFullBank(){
  try{
    const raw = localStorage.getItem('quiz_rpas_full_bank');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr;
    }
  }catch{}
  return [];
}

function persistProgress(){
  localStorage.setItem('quiz_rpas_progress', JSON.stringify({answers, idx}));
}
function restoreProgress(){
  try{
    const raw = localStorage.getItem('quiz_rpas_progress');
    if(!raw) return false;
    const s = JSON.parse(raw);
    answers = s.answers || {};
    idx = Math.min(Math.max(0, s.idx||0), data.length-1);
    return true;
  }catch{ return false; }
}

function renderQuestion(){
  const q = data[idx];
  idxSpan.textContent = idx+1;
  lenSpan.textContent = data.length;
  qtext.textContent = q.text;
  status.textContent = answers[q.id] ? `Marcada: ${answers[q.id].toUpperCase()}` : 'Sin responder';

  optionsBox.innerHTML = '';
  (q.options||[]).forEach(opt => {
    const row = document.createElement('label');
    row.className = 'opt';
    row.innerHTML = `<input type="radio" name="opt" value="${opt.key}"> <div><b>${opt.key.toUpperCase()}.</b> ${opt.text}</div>`;
    const input = row.querySelector('input');
    input.checked = answers[q.id] === opt.key;
    input.addEventListener('change', ()=>{
      answers[q.id] = opt.key;
      status.textContent = `Marcada: ${opt.key.toUpperCase()}`;
      persistProgress();
    });
    optionsBox.appendChild(row);
  });

  el('prev').disabled = idx===0;
  el('next').textContent = (idx === data.length-1) ? 'Finalizar' : 'Guardar y siguiente →';
}

function updateProgress(){
  const pct = Math.round(((idx) / Math.max(1,data.length)) * 100);
  bar.style.width = pct + '%';
}

function next(){ if(idx < data.length-1){ idx++; updateProgress(); renderQuestion(); } else { finish(); } }
function prev(){ if(idx>0){ idx--; updateProgress(); renderQuestion(); } }
function skip(){ next(); }

function finish(){
  // keyMap desde FULL_BANK
  const full = getFullBank();
  keyMap = {}; full.forEach(q=>{ if(q.answer) keyMap[q.id] = String(q.answer).toLowerCase(); });

  let correct=0, wrong=0, blank=0, pending=0;
  const review = data.map(q => {
    const sel = answers[q.id];
    const ok = keyMap[q.id]; // undefined si no hay respuesta en el banco
    if(!sel){ blank++; }
    else if(ok===undefined){ pending++; }
    else if(sel===ok){ correct++; }
    else{ wrong++; }
    return { q, sel, ok };
  });

  const totalEval = data.length - pending;
  const pct = totalEval>0 ? Math.round((correct / totalEval) * 100) : 0;

  let mensaje = '';
  if (pct >= 90) mensaje = '¡Excelente Futuro Operador RPAS!';
  else if (pct >= 70) mensaje = '¡Muy bien! Sigue practicando para perfeccionar.';
  else if (pct >= 50) mensaje = 'Ahí nomás. Un poco más de estudio y despega.';
  else mensaje = 'Buen intento. Repasa y vuelve a intentarlo.';

  results.innerHTML = `
    <h3>Resultado</h3>
    <p class="muted">Aciertos: <b class="ok">${correct}</b> · Errores: <b class="bad">${wrong}</b> · En blanco: ${blank}
      · Evaluadas: ${totalEval} · Puntaje: <b>${pct}%</b></p>
    <div class="progress" style="margin:.6rem 0 1rem">
      <div class="bar" style="width:${pct}%;background:linear-gradient(90deg,var(--primary),#1aa3b0)"></div>
    </div>
    <div class="rev" style="font-size:1.05rem"><b>${mensaje}</b></div>
    <div class="list-review" style="margin-top:12px">
      ${review.map((r,i)=>{
        const hasKey = r.ok!==undefined;
        const isOk = hasKey && r.sel === r.ok;
        const selTxt = r.sel ? r.sel.toUpperCase() : '—';
        const okTxt  = hasKey ? r.ok.toUpperCase() : '—';
        const note = hasKey ? '' : '<span class="muted">(sin clave)</span>';

        const opts = (r.q.options||[]).map(o=>{
          const cls = hasKey && (o.key===r.ok) ? 'correct' : (o.key===r.sel && r.sel!==r.ok ? 'wrong' : '');
          return `<div class="opt ${cls}"><div><b>${o.key.toUpperCase()}.</b> ${o.text}</div></div>`;
        }).join('');

        return `
          <div class="rev">
            <div class="qtext">${i+1}. ${r.q.text} ${note}</div>
            <div class="muted" style="margin:.25rem 0 .5rem">Tu respuesta: <b class="${isOk?'ok':'bad'}">${selTxt}</b> · Correcta: <b>${okTxt}</b></div>
            <div class="options" style="margin-top:6px">${opts}</div>
          </div>`;
      }).join('')}
    </div>
    <div class="footer-controls" style="margin-top:12px">
      <button class="secondary" id="btnReview">Volver a empezar (mismo set)</button>
      <div style="display:flex;gap:8px">
        <button id="btnResample" class="secondary">↻ Nuevo set aleatorio</button>
        <button id="btnClear">Limpiar progreso</button>
      </div>
    </div>
  `;

  intro.hidden = true; quiz.hidden = true; results.hidden = false;

  results.querySelector('#btnReview').addEventListener('click', ()=>{
    idx = 0; answers = {}; updateProgress(); renderQuestion(); quiz.hidden=false; results.hidden=true;
  });
  results.querySelector('#btnResample').addEventListener('click', ()=>{
    // reusar tamaño del set actual
    startWithN(data.length);
  });
  results.querySelector('#btnClear').addEventListener('click', ()=>{
    localStorage.removeItem('quiz_rpas_progress'); answers={}; idx=0; updateProgress(); renderQuestion(); quiz.hidden=false; results.hidden=true;
  });
}

// Sesión con N preguntas aleatorias
function startWithN(n){
  const full = getFullBank();
  if(!full.length){ alert('No hay banco cargado. Revisa questions.js'); return; }
  data = sampleN(full, n).map(q => ({...q, options:[...(q.options||[])]}));
  data.forEach(q => q.options = shuffle(q.options));
  answers = {}; idx = 0;
  el('totalQ').textContent = data.length; lenSpan.textContent = data.length;
  updateProgress(); renderQuestion();
  intro.hidden = true; quiz.hidden = false; results.hidden = true;
  persistProgress();
}

// Eventos UI
document.addEventListener('keydown', (e)=>{
  if(results.hidden && !quiz.hidden){
    if(e.key==='ArrowRight') next();
    if(e.key==='ArrowLeft') prev();
  }
});
el('next').addEventListener('click', next);
el('prev').addEventListener('click', prev);
el('skip').addEventListener('click', skip);
el('btnSave').addEventListener('click', ()=>{ persistProgress(); alert('Progreso guardado.'); });
el('btnRestore').addEventListener('click', ()=>{
  if(restoreProgress()){ updateProgress(); renderQuestion(); intro.hidden=true; quiz.hidden=false; results.hidden=true; alert('Progreso restaurado.'); }
  else alert('No hay progreso guardado.');
});
el('btnReset').addEventListener('click', ()=>{
  if(confirm('¿Reiniciar todo? (limpia progreso)')){
    localStorage.removeItem('quiz_rpas_progress');
    idx=0; answers={}; updateProgress(); renderQuestion(); intro.hidden=true; quiz.hidden=false; results.hidden=true;
  }
});

el('btnMode25').addEventListener('click', ()=> startWithN(25));
el('btnMode100').addEventListener('click', ()=> startWithN(100));
el('btnReshuffle').addEventListener('click', ()=> startWithN(data.length || 25));

// Arrancar por defecto con 25 si existe banco completo
window.addEventListener('load', ()=>{
  const full = getFullBank();
  if(full.length){ startWithN(25); }
});
