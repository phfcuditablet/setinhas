(() => {
const $ = s => document.querySelector(s), NS = 'http://www.w3.org/2000/svg';
const D = [[0,-1],[1,0],[0,1],[-1,0]], C = 10, VIDAS = 3;
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const key = (x, y) => x + ',' + y;

// Dificuldade: grade e quantidade de setas crescem a cada nível
const params = l => {
  const n = Math.min(4 + Math.floor((l - 1) / 3), 13);
  const maxLen = Math.min(2 + Math.floor(l / 2), 7);
  const count = Math.min(2 + Math.ceil(l * 1.5), Math.floor(n * n / 2.6));
  return { n, maxLen, count };
};

// Gera setas sempre solucionáveis: nova seta nunca ocupa o caminho de saída de outra
function gerar(level) {
  const { n, maxLen, count } = params(level);
  let best = [];
  for (let at = 0; at < 30; at++) {
    const r = rng(level * 7919 + at), rays = new Set(), used = new Set(), arrows = [];
    for (let k = 0; k < count; k++) {
      for (let t = 0; t < 150; t++) {
        const sx = Math.floor(r() * n), sy = Math.floor(r() * n);
        if (used.has(key(sx, sy)) || rays.has(key(sx, sy))) continue;
        const len = 2 + Math.floor(r() * (maxLen - 1)), cells = [[sx, sy]], own = new Set([key(sx, sy)]);
        let dir = 0, ok = true;
        for (let i = 1; i < len; i++) {
          const opts = [0, 1, 2, 3].sort(() => r() - .5).filter(d => {
            const x = cells.at(-1)[0] + D[d][0], y = cells.at(-1)[1] + D[d][1];
            return x >= 0 && y >= 0 && x < n && y < n && !used.has(key(x, y)) && !rays.has(key(x, y)) && !own.has(key(x, y));
          });
          if (!opts.length) { ok = i > 1 ? true : false; break; }
          dir = opts[0]; const p = cells.at(-1);
          cells.push([p[0] + D[dir][0], p[1] + D[dir][1]]); own.add(key(...cells.at(-1)));
        }
        if (!ok || cells.length < 2) continue;
        const [hx, hy] = cells.at(-1), ray = [];
        let x = hx + D[dir][0], y = hy + D[dir][1];
        while (x >= 0 && y >= 0 && x < n && y < n) { ray.push(key(x, y)); x += D[dir][0]; y += D[dir][1]; }
        if (ray.some(c => own.has(c))) continue;
        cells.forEach(c => used.add(key(...c))); ray.forEach(c => rays.add(c));
        arrows.push({ cells, dir, ray }); break;
      }
    }
    if (arrows.length > best.length) best = arrows;
    if (best.length >= count) break;
  }
  return { n, arrows: best };
}

let level = +(localStorage.getItem('setas-nivel') || 1), vidas, arrows, els, busy;
const svg = $('#board');
const diff = l => l <= 5 ? 'Fácil' : l <= 15 ? 'Médio' : 'Difícil';

function mk(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent && parent.appendChild(e); return e;
}

function iniciar() {
  const g = gerar(level); arrows = g.arrows; vidas = VIDAS; busy = false;
  localStorage.setItem('setas-nivel', level);
  $('#lvl').textContent = 'Nível ' + level; $('#diff').textContent = diff(level);
  $('#msg').classList.add('hidden'); vidasUI();
  svg.innerHTML = ''; svg.setAttribute('viewBox', `${-1} ${-1} ${g.n * C + 2} ${g.n * C + 2}`);
  svg.dataset.n = g.n;
  arrows.forEach(a => {
    const grp = mk('g', {}, svg);
    const pts = a.cells.map(([x, y]) => `${x * C + C / 2},${y * C + C / 2}`).join(' ');
    mk('polyline', { points: pts, class: 'hit' }, grp);
    mk('polyline', { points: pts, class: 'a' }, grp);
    const [hx, hy] = a.cells.at(-1), cx = hx * C + C / 2, cy = hy * C + C / 2, [dx, dy] = D[a.dir];
    const tip = [cx + dx * 4.6, cy + dy * 4.6], b = [cx + dx * 1, cy + dy * 1];
    mk('polygon', { class: 'h', points: `${tip} ${b[0] - dy * 2.6},${b[1] + dx * 2.6} ${b[0] + dy * 2.6},${b[1] - dx * 2.6}` }, grp);
    a.el = grp; a.alive = true;
    grp.addEventListener('click', () => tocar(a));
  });
}

const vidasUI = () => { $('#lives').innerHTML = ''; for (let i = 0; i < VIDAS; i++) mk2(i >= vidas); };
const mk2 = off => { const d = document.createElement('div'); d.className = 'drop' + (off ? ' off' : ''); $('#lives').appendChild(d); };

const bloqueador = a => arrows.find(b => b !== a && b.alive && b.cells.some(([x, y]) => a.ray.includes(key(x, y))));

function tocar(a) {
  if (busy || !a.alive) return;
  document.querySelectorAll('.hint').forEach(e => e.classList.remove('hint'));
  const b = bloqueador(a);
  if (!b) {
    a.alive = false; const n = +svg.dataset.n, [dx, dy] = D[a.dir], s = (n + 4) * C;
    a.el.classList.add('go'); a.el.style.transform = `translate(${dx * s}px,${dy * s}px)`;
    if (!arrows.some(x => x.alive)) { busy = true; setTimeout(venceu, 800); }
  } else {
    vidas--; vidasUI();
    a.el.classList.add('shake', 'bad'); b.el.classList.add('bad');
    setTimeout(() => { a.el.classList.remove('shake', 'bad'); b.el.classList.remove('bad'); }, 450);
    if (vidas <= 0) { busy = true; setTimeout(() => msg('Sem vidas 💧', 'Tentar de novo', iniciar), 500); }
  }
}

function venceu() {
  if (level >= 1) localStorage.setItem('setas-max', Math.max(level, +(localStorage.getItem('setas-max') || 1)));
  msg('Nível ' + level + ' concluído! 🎉', 'Próximo nível', () => { level++; iniciar(); });
}
function msg(t, b, fn) { $('#mt').textContent = t; $('#mb').textContent = b; $('#mb').onclick = fn; $('#msg').classList.remove('hidden'); }

$('#hint').onclick = () => {
  if (busy) return; const a = arrows.find(x => x.alive && !bloqueador(x)); a && a.el.classList.add('hint');
};
$('#prev').onclick = () => { if (level > 1) { level--; iniciar(); } };
$('#next').onclick = () => { if (level < +(localStorage.getItem('setas-max') || 1) + 1) { level++; iniciar(); } };
iniciar();
})();
