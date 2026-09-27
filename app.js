/*
 * GeoCalculator — Telegram Web App · v5.0 (дизайн в стиле iOS)
 * Статическое приложение (GitHub Pages). Открывается кнопкой меню бота,
 * настроенной в @BotFather: Bot Settings → Menu Button → ссылка на Pages.
 * В браузере работает как обычная веб-страница.
 */

// ── TELEGRAM WEB APP INIT ─────────────────────────────────
const tg = window.Telegram && window.Telegram.WebApp;

(function initTWA() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.onEvent('themeChanged', applyTheme);
})();

// ── ТЕМА ──────────────────────────────────────────────────
// Режим: auto (как в Telegram / системе), light, dark. Палитра — всегда iOS,
// цвета Telegram не подмешиваются, чтобы дизайн оставался каноном.
const THEME_KEY = 'geocalc.theme';
let themeMode = 'auto';
try { themeMode = localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { /* хранилище недоступно */ }

const THEME_ICONS = {
  light: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>',
  dark: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.3 14.6A8.5 8.5 0 0 1 9.4 3.7a8.5 8.5 0 1 0 10.9 10.9Z"/></svg>'
};

function effectiveTheme() {
  if (themeMode === 'light' || themeMode === 'dark') return themeMode;
  if (tg && (tg.colorScheme === 'dark' || tg.colorScheme === 'light') && tg.platform !== 'unknown') return tg.colorScheme;
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
  const eff = effectiveTheme();
  document.documentElement.setAttribute('data-theme', eff);
  const bg = eff === 'dark' ? '#000000' : '#F2F2F7';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', bg);
  const btn = document.getElementById('theme-btn');
  if (btn) {
    btn.innerHTML = THEME_ICONS[eff];
    btn.setAttribute('aria-label', eff === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
  }
  document.querySelectorAll('#theme-seg .seg-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.themeMode === themeMode));
  if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
    try { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); } catch (e) { /* старый клиент */ }
  }
}

function setTheme(mode) {
  themeMode = mode;
  try { localStorage.setItem(THEME_KEY, mode); } catch (e) { /* хранилище недоступно */ }
  applyTheme();
  haptic('light');
}

// Кнопка в верхней панели: быстрый переход светлая ↔ тёмная
function toggleTheme() {
  setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
}

if (window.matchMedia) {
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => { if (themeMode === 'auto') applyTheme(); };
  if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
}

function haptic(style) {
  if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style || 'light');
}

// Сообщение пользователю: внутри Telegram — нативный диалог, в браузере — alert
function notify(msg) {
  if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast('6.2')) {
    try { tg.showAlert(msg); return; } catch (e) { /* fallback ниже */ }
  }
  alert(msg);
}

// ── NAVIGATION ────────────────────────────────────────────
function goPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  btn.classList.add('active');
  document.querySelector('.app').scrollTop = 0;
  updateTopbar();
  haptic('light');
}

// Верхняя панель становится «стеклянной», когда контент уходит под неё
function updateTopbar() {
  const app = document.getElementById('app');
  document.getElementById('topbar').classList.toggle('scrolled', app.scrollTop > 36);
}

let travMode = 'theo'; // 'theo' | 'ved'

function switchTrav(mode, btn) {
  travMode = mode === 'ved' ? 'ved' : 'theo';
  document.querySelectorAll('#trav-seg .seg-btn').forEach(b => b.classList.remove('active'));
  (btn || document.getElementById('trav-tab-' + travMode)).classList.add('active');
  document.getElementById('page-theodolite').classList.toggle('active', travMode === 'theo');
  document.getElementById('page-vedmost').classList.toggle('active', travMode === 'ved');
}

function switchTab(g, idx, btn) {
  const allBtns = btn.parentElement.querySelectorAll('.tab-btn');
  const allPanes = document.querySelectorAll('[id^="' + g + '-t"]');
  allBtns.forEach(b => b.classList.remove('active'));
  allPanes.forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(g + '-t' + idx).classList.add('active');
}

// ── HELPERS ───────────────────────────────────────────────
// Парсинг: разделители между значениями — пробел или запятая; дробная часть — точка. Unicode минус (−) → ASCII.
const pn = t => {
  const norm = String(t).replace(/\u2212/g, '-');
  return norm.replace(/[,;\n\r\t]+/g,' ').trim().split(/\s+/).map(s => {
    const x = s.trim();
    if (x === '') return NaN;
    const num = parseFloat(x);
    return isNaN(num) ? NaN : num;
  }).filter(v => !isNaN(v));
};
const fn = (v, d=4) => typeof v==='number' ? v.toFixed(d) : String(v);
const fs = (v, d=4) => typeof v==='number' ? (v>=0?'+':'')+v.toFixed(d) : String(v);
// Умное форматирование: целые без дробной части, дробные — без лишних нулей
const fnSmart = (v, d=4) => {
  if (typeof v !== 'number' || isNaN(v)) return String(v);
  const r = Math.round(v*1e12)/1e12;
  if (Math.abs(r-Math.round(r))<1e-9) return String(Math.round(r));
  return r.toFixed(d).replace(/\.?0+$/,'');
};
const fsSmart = (v, d=4) => typeof v==='number' ? (v>=0?'+':'')+fnSmart(v,d) : String(v);
// «f_h», «H_B−H_A» → нижние индексы
const subs = l => String(l).replace(/_([^\s()=,+−·/:]+)/g, '<sub>$1</sub>');
const ri = (l, v, c='') => `<div class="result-item"><div class="ri-label">${subs(l)}</div><div class="ri-val ${c}">${v}</div></div>`;

// Значки статуса (аналоги SF Symbols: checkmark.circle.fill, xmark.circle.fill, info.circle.fill)
const ICON = {
  ok:   '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" style="fill:var(--green)"/><path d="m7.5 12.3 3 3 6-6.3" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  fail: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" style="fill:var(--red)"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
  info: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" style="fill:var(--tint)"/><circle cx="12" cy="7.6" r="1.4" fill="#fff"/><path d="M12 11v6.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>'
};

// Итоговая карточка: статус, крупное число и шкала «сколько допуска израсходовано»
function heroHtml({ state, status, side = '', num, unit = '', caption = '', ratio = null, scaleRight = '' }) {
  const icon = state === 'ok' ? ICON.ok : state === 'bad' ? ICON.fail : ICON.info;
  const bar = ratio === null ? '' : `
    <div class="hero-bar ${state === 'bad' ? 'bad' : ''}"><div style="width:${Math.max(2, Math.min(100, ratio * 100)).toFixed(1)}%"></div></div>
    <div class="hero-scale"><span>0</span><span>${scaleRight}</span></div>`;
  return `<section class="hero" aria-label="Итог">
    <div class="hero-status ${state}">${icon}<span>${status}</span><span class="hero-side">${side}</span></div>
    <div class="hero-big"><span class="hero-num">${num}</span><span class="hero-unit">${unit}</span></div>
    <div class="hero-cap">${caption}</div>${bar}
  </section>`;
}

// Построчный разбор: одно значение на строку. Пустые строки пропускаются,
// нераспознанные — возвращаются в bad (номера строк), чтобы не терять их молча.
function parseLines(text, parser) {
  const vals = [], bad = [];
  String(text).split(/\r\n?|\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    const v = parser(t);
    if (isFinite(v)) vals.push(v); else bad.push(i + 1);
  });
  return { vals, bad };
}
const parseNum = t => {
  const x = String(t).trim().replace(/\u2212/g, '-').replace(',', '.');
  return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(x) ? parseFloat(x) : NaN;
};
// Проверка результата parseLines; при ошибке — сообщение и null
function takeLines(text, parser, what) {
  const r = parseLines(text, parser);
  if (r.bad.length) { notify(what + ': не распознаны строки № ' + r.bad.join(', ')); return null; }
  return r.vals;
}
// Числовое поле: пустое/некорректное → NaN
const numField = id => parseNum(document.getElementById(id).value);
// Относительная невязка f_s/Σd → «1:N»; практически нулевая → «1:∞»
const relDen  = T => (isFinite(T) && T > 1e-7) ? Math.round(1/T) : null;
const relText = T => { const d = relDen(T); return d === null ? '1:∞' : '1:' + d; };

// ── УГЛОВЫЕ НЕВЯЗКИ ───────────────────────────────────────
let arMode = 'dms'; // 'dms' | 'm'

function switchArMode(mode, btn) {
  arMode = mode;
  document.querySelectorAll('#ar-seg .seg-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#page-residuals .ar-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(mode==='dms' ? 'ar-pane-dms' : 'ar-pane-m').classList.add('active');
}

// Секунды → нормализованные °′″ (минуты и секунды строго 0–59; при |totalSec|<60 — 0°0′X″). Сохраняет знак.
function secToDMS(totalSec) {
  if (Math.abs(totalSec) < 60) return { d: 0, m: 0, s: totalSec };
  if (totalSec < 0) {
    const absS = Math.floor(-totalSec);
    const d = -Math.ceil(absS / 3600);
    const rem = 3600 * Math.ceil(absS / 3600) - absS;
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    return { d, m, s };
  }
  let s = Math.floor(totalSec);
  const d = Math.floor(s / 3600);
  s = s % 3600;
  const m = Math.floor(s / 60);
  s = s % 60;
  return { d, m, s };
}

// Форматирование секунд дуги в строку: при |totalSec|<60 — только секунды; иначе °′″ (минуты и секунды строго 0–59)
function formatDMS(totalSec) {
  if (typeof totalSec !== 'number' || !isFinite(totalSec)) return '—″';
  if (totalSec < 0) return '−' + formatDMS(-totalSec);
  if (totalSec < 60) return fnSmart(Math.round(totalSec * 10) / 10, 1) + '″';
  const n = secToDMS(totalSec);
  let d = n.d, m = n.m, s = Math.round(n.s);
  if (s >= 60) { s = 0; m++; }
  if (s < 0)   { s += 60; m--; }
  if (m >= 60) { m = 0; d++; }
  if (m < 0)   { m += 60; d--; }
  m = Math.max(0, Math.min(59, m));
  s = Math.max(0, Math.min(59, s));
  if (d >= 360) d = d % 360;
  return d + '°' + String(m).padStart(2,'0') + '′' + String(s).padStart(2,'0') + '″';
}

// СКП и производные — ТОЛЬКО секунды (никогда в градусах/DMS). Для метров — в м.
function formatSKP(value, isM) {
  if (typeof value !== 'number' || !isFinite(value)) return '—';
  if (isM) return '±' + fnSmart(value, 5) + ' м';
  return '±' + fnSmart(value, 4) + '″';
}

// Парсинг угловых невязок: запятая (или перевод строки) — разделитель измерений.
// Одно измерение = один фрагмент между запятыми. Внутри фрагмента пробелы допустимы (°′″: 1 30 45).
function pnDms(t) {
  const out = [];
  const norm = String(t)
    .replace(/\u2212/g, '-')                       // Unicode minus → ASCII minus
    .replace(/[\uFF0C\u060C\u3001]/g, ',');          // полная ширина и др. запятые → ASCII запятая
  const tokens = norm.replace(/\r\n?|\n/g, ',').split(',').map(s => s.trim()).filter(Boolean);
  for (const token of tokens) {
    const parts = token.split(/\s+/).map(s => parseFloat(s)).filter(v => !isNaN(v));
    if (parts.length === 0) continue;
    if (parts.length === 1) out.push(parts[0]);
    else if (parts.length === 2) out.push(parts[0] * 60 + parts[1]);
    else out.push(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }
  return out;
}

function arExample() {
  if (arMode === 'dms') {
    document.getElementById('ar-input-dms').value =
      '1.02, 0.41, 0.02, -1.88, -1.44, -0.25, 0.12, 0.22, -1.05, 0.56, ' +
      '-1.72, 1.29, -1.81, -0.08, -0.50, 1 30 0, 0 0 1.5, 0 1 0';
  } else {
    document.getElementById('ar-input-m').value =
      '0.002 -0.001 0.003 0.001 -0.002 0.0015 -0.0008 0.0022 -0.0011 0.0009';
  }
  calcAR();
}

function calcAR() {
  haptic('medium');
  const isM = arMode === 'm';
  const raw = isM ? document.getElementById('ar-input-m').value : document.getElementById('ar-input-dms').value;
  const v = (isM ? pn(raw) : pnDms(raw)).filter(x => isFinite(x));
  if (v.length < 2) { notify('Введите хотя бы 2 значения'); return; }
  const n = v.length;

  // 1. Среднее
  const sum = v.reduce((a,b) => a+b, 0), avg = sum / n;
  // 2. Отклонения от среднего v_i = value - avg
  const deviations = v.map(x => x - avg);
  // 3. СКП по отклонениям: m = √(Σ(v_i²) / (n − 1))
  const sumSqDeviations = deviations.reduce((a, vi) => a + vi*vi, 0);
  const m = Math.sqrt(sumSqDeviations / (n - 1));
  const mm = m / Math.sqrt(2*n), dp = 3*m;

  // Путь «конспект»: m = √(ΣΔ²/n) по сырым невязкам
  const sumSqRaw = v.reduce((a,x) => a+x*x, 0);
  const mConspect = Math.sqrt(sumSqRaw / n);
  const mmConspect = mConspect / Math.sqrt(2*n);
  const dpConspect = 3 * mConspect;

  const posN = v.filter(x => x > 0).length, negN = v.filter(x => x < 0).length;
  const maxA = Math.max(...v.map(Math.abs));
  const out  = v.filter(x => Math.abs(x - avg) > dp).length;
  const uShort = isM ? 'м' : 'сек';

  // arFmt — локальная функция внутри calcAR (как в оригинале)
  const arFmt = (val, sgn) => {
    if (isM) return (sgn && val >= 0 ? '+' : '') + fnSmart(val, 5) + ' м';
    if (Math.abs(val) < 60) return (sgn && val >= 0 ? '+' : '') + fnSmart(val, 3) + '″';
    return (sgn && val >= 0 ? '+' : '') + formatDMS(val);
  };

  document.getElementById('ar-main').innerHTML =
    ri('n измерений', n) +
    ri('СКП m ('+uShort+')', formatSKP(m, isM)) +
    ri('Точность m_m', formatSKP(mm, isM), 'p') +
    ri('m ± m_m', formatSKP(m,isM).replace('±','') + ' ± ' + formatSKP(mm,isM).replace('±',''), 'g') +
    ri('Δ_пред = 3m', formatSKP(dp, isM), 'o') +
    ri('Σf ('+uShort+')', arFmt(sum, 1)) +
    ri('Среднее', arFmt(avg, 1), 'p') +
    ri('Макс |f|', arFmt(maxA, 0));

  const annotItems = [
    { name: 'n измерений', val: n, formula: 'n — число введённых невязок', why: 'Подсчитано количество значений в вашем вводе.' },
    { name: 'СКП m', val: formatSKP(m,isM), formula: 'm = √(Σ(v_i²)/(n−1)), v_i = f_i − f̄', why: 'По геодезической методике: сначала среднее f̄=[f]/n, затем отклонения v_i=f_i−f̄, затем СКП по отклонениям m=√([v²]/(n−1)). СКП выводится только в секундах (или м), никогда в градусах.' },
    { name: 'Точность m_m', val: formatSKP(mm,isM), formula: 'm_m = m/√(2n)', why: 'Оценка средней квадратической погрешности самой СКП; тем точнее, чем больше n. Только секунды (или м).' },
    { name: 'm ± m_m', val: formatSKP(m,isM).replace('±','') + ' ± ' + formatSKP(mm,isM).replace('±',''), formula: 'Итоговая запись СКП с её точностью', why: 'Результат представляют как m ± m_m. СКП — только в секундах (или м).' },
    { name: 'Δ_пред = 3m', val: formatSKP(dp,isM), formula: 'Δ_пред = t·m при t=3', why: 'Предельная погрешность (утроенная СКП); при нормальном распределении ≈99.7% ошибок внутри ±3m. Только секунды (или м).' },
    { name: 'Σf', val: arFmt(sum,1), formula: '[f] = Σf_i', why: 'Сумма всех невязок; для случайных погрешностей должна быть близка к нулю.' },
    { name: 'Среднее', val: arFmt(avg,1), formula: 'f̄ = [f]/n', why: 'Среднее арифметическое невязок; от него считаются отклонения v_i. При симметрии близко к нулю.' },
    { name: 'Макс |f|', val: arFmt(maxA,0), formula: 'max|f_i|', why: 'Наибольшая по модулю невязка; не должна превышать Δ_пред.' }
  ];
  document.getElementById('ar-annot-wrap').innerHTML = `
    <details>
      <summary>Как получены результаты (формулы и пояснения)</summary>
      <div class="ar-annot-list">
        ${annotItems.map(a => `<div class="ar-annot-item"><strong>${a.name}</strong> → ${typeof a.val==='number' ? a.val : a.val}<div class="ar-annot-f">${a.formula}</div><div class="ar-annot-why">${a.why}</div></div>`).join('')}
      </div>
    </details>`;

  const c1 = Math.abs(avg) <= 2*m/Math.sqrt(n);
  const c2 = out === 0;
  const c3 = Math.abs(posN-negN) <= 1.5*Math.sqrt(n);
  document.getElementById('ar-checks').innerHTML = `
    <div class="check-item ${c1?'check-pass':'check-fail'}">
      <span class="check-icon">${c1?ICON.ok:ICON.fail}</span>
      <div><strong>Симметрия (М[Δ]≈0)</strong>Среднее = ${arFmt(avg,1)} — ${c1?'ВЫПОЛНЯЕТСЯ':'НЕ ВЫПОЛНЯЕТСЯ'}</div>
    </div>
    <div class="check-item ${c2?'check-pass':'check-fail'}">
      <span class="check-icon">${c2?ICON.ok:ICON.fail}</span>
      <div><strong>Ограниченность</strong>Δ_пред=${formatSKP(dp,isM)}; выбросов: ${out} — ${c2?'ВЫПОЛНЯЕТСЯ':'НЕ ВЫПОЛНЯЕТСЯ'}</div>
    </div>
    <div class="check-item ${c3?'check-pass':'check-fail'}">
      <span class="check-icon">${c3?ICON.ok:ICON.fail}</span>
      <div><strong>Взаимное уничтожение</strong>+:${posN} / −:${negN} — ${c3?'ВЫПОЛНЯЕТСЯ':'НЕ ВЫПОЛНЯЕТСЯ'}</div>
    </div>
    <div class="check-item check-neutral">
      <span class="check-icon">${ICON.info}</span>
      <div><strong>Вывод</strong>${(c1&&c2&&c3) ? 'Погрешности случайные.' : 'Обнаружены отклонения. Требуется анализ.'}</div>
    </div>`;

  const lo = Math.min(...v), hi = Math.max(...v);
  const bc = Math.max(5, Math.ceil(Math.sqrt(n)));
  const bw = (hi-lo)/bc || 1;
  const bins = new Array(bc).fill(0);
  v.forEach(x => bins[Math.min(Math.floor((x-lo)/bw), bc-1)]++);
  const maxB = Math.max(...bins, 1);
  document.getElementById('ar-hist').innerHTML = `
    <div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);margin-bottom:8px">${bc} интервалов, n=${n}</div>
    <div class="hist-bars">${bins.map(b => `<div class="hb" style="height:${Math.max(4,Math.round(b/maxB*80))}px"></div>`).join('')}</div>
    <div class="hist-labels">${bins.map((_,i) => `<div class="hl">${isM ? fnSmart(lo+i*bw,1) : arFmt(lo+i*bw,0)}</div>`).join('')}</div>
    <div style="margin-top:10px;font-family:var(--mono);font-size:11px;color:var(--text-dim)">
      <span style="color:var(--accent)">±m</span>=${formatSKP(m,isM)} &nbsp;<span style="color:var(--accent2)">3m</span>=${formatSKP(dp,isM)}</div>`;

  const sqUnit = isM ? 'м²' : 'кв.сек';
  const sumV = deviations.reduce((a,b) => a+b, 0);
  const fList = v.length <= 12
    ? v.map(x => fnSmart(x,2)).join(', ')
    : v.slice(0,5).map(x => fnSmart(x,2)).join(', ') + ', … ('+n+' всего)';
  document.getElementById('ar-steps').innerHTML = `
    <div class="step"><strong>1. Разбор ввода</strong> — где может «съехать»: каждое число между запятыми = одно измерение; минус «−» должен быть обычный (ASCII).<div class="step-f">Распознано n = <strong>${n}</strong> невязок: ${fList} ${uShort}</div></div>
    <div class="step"><strong>2. Сумма и среднее</strong><div class="step-f">[f] = Σf_i = ${fnSmart(sum,4)} &nbsp;→&nbsp; f̄ = [f]/n = ${fnSmart(sum,4)}/${n} = ${arFmt(avg,1)}</div></div>
    <div class="step"><strong>3. Отклонения</strong> v_i = f_i − f̄ (от каждого значения отнимаем среднее).<div class="step-f">[v²] = Σ(v_i²) = ${fnSmart(sumSqDeviations,4)} ${sqUnit}</div></div>
    <div class="step"><strong>4. Контроль</strong> Σv_i должно быть 0 (следствие определения v_i).<div class="step-f">Σv_i = ${fnSmart(sumV,10)} ${Math.abs(sumV) <= 1e-9*Math.max(1, Math.abs(sum)) ? '✓' : ' (проверьте ввод)'}</div></div>
    <div class="step"><strong>5. СКП по Бесселю</strong> m = √([v²]/(n−1)) — только по отклонениям, знаменатель (n−1).<div class="step-f">m = √(${fnSmart(sumSqDeviations,4)}/${n-1}) = √(${fnSmart(sumSqDeviations/(n-1),6)}) = ${formatSKP(m,isM)}</div></div>
    <div class="step"><strong>6. Точность СКП и предел</strong><div class="step-f">m_m = m/√(2n) = ${formatSKP(mm,isM)} &nbsp;|&nbsp; Δ_пред = 3m = ${formatSKP(dp,isM)}</div></div>
    <div class="step">Проверка свойств<div class="step-f">Симметрия ${c1?'✓':'✗'} | Ограниченность ${c2?'✓':'✗'} | Уничтожение ${c3?'✓':'✗'}</div></div>`;

  // Вкладка «СКП Серии» — результат по формулам конспекта (m = √(ΣΔ²/n))
  document.getElementById('ar-conspect-main').innerHTML =
    ri('n измерений', n) +
    ri('СКП m ('+uShort+')', formatSKP(mConspect, isM)) +
    ri('Точность m_m', formatSKP(mmConspect, isM), 'p') +
    ri('m ± m_m', formatSKP(mConspect,isM).replace('±','') + ' ± ' + formatSKP(mmConspect,isM).replace('±',''), 'g') +
    ri('Δ_пред = 3m', formatSKP(dpConspect, isM), 'o') +
    ri('ΣΔ² ('+sqUnit+')', fnSmart(sumSqRaw, 4)) +
    ri('Σf ('+uShort+')', arFmt(sum, 1)) +
    ri('Макс |f|', arFmt(maxA, 0));

  const annotSeries = [
    { name: 'n измерений', formula: 'n — число невязок (одни и те же данные, что во вкладке «Формула Бесселя»).', why: 'Используются те же введённые значения.' },
    { name: 'СКП m', formula: 'm = √(ΣΔ² / n), где ΣΔ² = Σ(f_i²) — сумма квадратов невязок без вычитания среднего.', why: 'По конспекту: СКП правки одного измерения. Результат только в секундах (или м).' },
    { name: 'Точность m_m', formula: 'm_m = m / √(2n)', why: 'СКП самой СКП (оценки).' },
    { name: 'Δ_пред = 3m', formula: 'Предельная погрешность; допускается невязка до этого значения.', why: 'Утроенная СКП.' },
    { name: 'ΣΔ²', formula: 'Σ(f_i²) — сумма квадратов введённых невязок.', why: 'Используется в знаменателе под корнем для m.' }
  ];
  document.getElementById('ar-conspect-annot').innerHTML = `
    <details>
      <summary>Как получены результаты (СКП серии)</summary>
      <div class="ar-annot-list">
        ${annotSeries.map(a => `<div class="ar-annot-item"><strong>${a.name}</strong><div class="ar-annot-f">${a.formula}</div><div class="ar-annot-why">${a.why}</div></div>`).join('')}
      </div>
    </details>`;

  // Шаги решения по формулам конспекта
  const fListConc = v.length <= 10
    ? v.map(x => arFmt(x,1)).join(', ')
    : v.slice(0,4).map(x => arFmt(x,1)).join(', ') + ', … ('+n+' всего)';
  document.getElementById('ar-conspect').innerHTML = `
    <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:10px">Шаги по формулам конспекта (СКП серии)</div>
    <div class="conc-block">
      <div class="conc-title">1. Данные (ваши невязки)</div>
      <div class="conc-formula">n = ${n} &nbsp;|&nbsp; f_i: ${fListConc}</div>
    </div>
    <div class="conc-block">
      <div class="conc-title">2. СКП правки (одного измерения)</div>
      <div class="conc-formula">m = √(ΣΔ² / n)</div>
      <div class="conc-example">ΣΔ² = Σ(f_i²) = ${fnSmart(sumSqRaw,4)} ${sqUnit} &nbsp;→&nbsp; m = √(${fnSmart(sumSqRaw,4)} / ${n}) = √(${fnSmart(sumSqRaw/n,6)}) = ${formatSKP(mConspect,isM)}</div>
    </div>
    <div class="conc-block">
      <div class="conc-title">3. СКП самой СКП (СКП оценки)</div>
      <div class="conc-formula">m_m = m / √(2n)</div>
      <div class="conc-example">m_m = ${formatSKP(mConspect,isM).replace('±','')} / √(${2*n}) = ${formatSKP(mmConspect,isM)}</div>
    </div>
    <div class="conc-block">
      <div class="conc-title">4. Предельная погрешность</div>
      <div class="conc-formula">Δ_пред = 3 · m</div>
      <div class="conc-example">Δ_пред = 3 × ${formatSKP(mConspect,isM).replace('±','')} = ${formatSKP(dpConspect,isM)} — допускается невязка до этого значения.</div>
    </div>
    <div class="conc-note">
      <strong>Два пути:</strong> здесь — СКП серии (m = √(ΣΔ²/n)). Во вкладке <strong>Формула Бесселя</strong> — m = √([v²]/(n−1)) по отклонениям от среднего. Оба используют одни и те же введённые значения.
    </div>`;

  document.getElementById('ar-result').classList.remove('hidden');
}

// ── НИВЕЛИРНЫЙ ХОД ───────────────────────────────────────
function calcLev() {
  haptic('medium');
  const HA = numField('lev-ha');
  const HB = numField('lev-hb');
  if (!isFinite(HA) || !isFinite(HB)) { notify('Введите отметки H_A и H_B'); return; }
  const hv = takeLines(document.getElementById('lev-h').value, parseNum, 'Превышения');
  if (!hv) return;
  const dv = takeLines(document.getElementById('lev-d').value, parseNum, 'Длины секций');
  if (!dv) return;
  const cls = document.getElementById('lev-cls').value;
  if (!hv.length) { notify('Введите превышения'); return; }
  if (!dv.length) { notify('Введите длины секций (км) — без них нельзя вычислить допуск и поправки'); return; }
  if (dv.length !== hv.length) { notify('Количество превышений (' + hv.length + ') ≠ количество длин секций (' + dv.length + ')'); return; }
  if (dv.some(d => d <= 0)) { notify('Длины секций должны быть положительными'); return; }
  const sumH = hv.reduce((a,b) => a+b, 0);
  const sumD = dv.reduce((a,b) => a+b, 0);
  const fh   = sumH - (HB - HA);
  // Допуски по Инструкции по нивелированию I–IV классов: II — 5, III — 10, IV — 20, техническое — 50 мм√L
  const k    = ({ '2': 5, '3': 10, '4': 20, 't': 50 })[cls] || 50;
  const fdop = k * Math.sqrt(sumD);
  const ok   = Math.abs(fh*1000) <= fdop;
  const corr = dv.map(d => -fh*d/sumD);
  const adjH = hv.map((h,i) => h + corr[i]);

  const clsName = ({ '2': 'II класс', '3': 'III класс', '4': 'IV класс', 't': 'Техническое' })[cls] || '';
  document.getElementById('lev-hero').innerHTML = heroHtml({
    state: ok ? 'ok' : 'bad', status: ok ? 'В допуске' : 'Допуск превышен', side: clsName,
    num: fsSmart(Math.round(fh * 10000) / 10, 1), unit: 'мм',
    caption: 'Невязка f<sub>h</sub> = Σh − (H<sub>B</sub> − H<sub>A</sub>)',
    ratio: Math.abs(fh * 1000) / fdop, scaleRight: 'допуск ±' + fnSmart(fdop, 1) + ' мм'
  });
  document.getElementById('lev-main').innerHTML =
    ri('Σh', fnSmart(sumH,4)+' м') +
    ri('H_B−H_A', fnSmart(HB-HA,4)+' м') +
    ri('Невязка f_h', fnSmart(fh*1000,1)+' мм', Math.abs(fh*1000)>fdop?'r':'') +
    ri('Допуск ±'+k+'√L', '±'+fnSmart(fdop,1)+' мм', 'o') +
    ri('Оценка', ok?'✓ НОРМА':'✗ ПРЕВЫШЕН', ok?'g':'r') +
    ri('Σ длин', fnSmart(sumD,3)+' км');

  let rows = '', H = HA;
  rows += `<tr><td class="td-hi">A</td><td>—</td><td>—</td><td>—</td><td class="td-hi">${fnSmart(HA,4)}</td></tr>`;
  adjH.forEach((h,i) => {
    H += h;
    rows += `<tr><td>${i+1}</td><td>${fsSmart(hv[i],4)}</td><td>${fnSmart(corr[i]*1000,1)}</td><td>${fsSmart(h,4)}</td><td class="td-hi">${fnSmart(H,4)}</td></tr>`;
  });
  document.getElementById('lev-tbl').innerHTML =
    `<table class="dt"><thead><tr><th>Тч</th><th>h, м</th><th>v, мм</th><th>h испр</th><th>H, м</th></tr></thead><tbody>${rows}</tbody></table>`;
  document.getElementById('lev-result').classList.remove('hidden');
}

// ── ТЕОДОЛИТНЫЙ ХОД ──────────────────────────────────────
function calcTh() {
  haptic('medium');
  const a0 = parseDeg(document.getElementById('th-a0').value);
  const an = parseDeg(document.getElementById('th-an').value);
  if (!isFinite(a0) || !isFinite(an)) { notify('Некорректный начальный или конечный дирекционный угол'); return; }
  const x0 = numField('th-x0'), y0 = numField('th-y0');
  const xn = numField('th-xn'), yn = numField('th-yn');
  if (![x0, y0, xn, yn].every(isFinite)) { notify('Введите координаты начальной и конечной точек'); return; }
  const ang = takeLines(document.getElementById('th-ang').value, parseDeg, 'Углы');
  if (!ang) return;
  const sid = takeLines(document.getElementById('th-sides').value, parseNum, 'Стороны');
  if (!sid) return;
  if (!ang.length || !sid.length) { notify('Введите углы и стороны'); return; }
  const n = ang.length;
  // Сторон n: α нач — дирекционный угол первой стороны.
  // Сторон n−1: α нач — исходное направление, углы измерены и на начальной, и на конечной точке.
  let dirOff;
  if (sid.length === n) dirOff = 0;
  else if (sid.length === n - 1) dirOff = 1;
  else { notify('Количество сторон (' + sid.length + ') должно быть равно количеству углов (' + n + ') или на 1 меньше'); return; }
  if (sid.some(d => d <= 0)) { notify('Длины сторон должны быть положительными'); return; }
  const relLim = +document.getElementById('th-rel').value || 2000;

  const sumB = ang.reduce((a,b) => a+b, 0);
  const base = a0 - an + n*180;
  const thSum = base + Math.round((sumB - base) / 360) * 360;  // ближайшее к Σβ_изм
  const fbDeg = sumB - thSum;
  const fdop  = Math.sqrt(n);           // ′
  const fb    = fbDeg * 60;             // ′
  const dBDeg = -fbDeg / n;
  const adjA  = ang.map(a => a + dBDeg);
  const alphas = [norm360(a0)];
  adjA.forEach(b => alphas.push(norm360(alphas[alphas.length-1] - b + 180)));
  const R  = Math.PI / 180;
  const dX = sid.map((d,i) => d * Math.cos(alphas[i+dirOff]*R));
  const dY = sid.map((d,i) => d * Math.sin(alphas[i+dirOff]*R));
  const sumD = sid.reduce((a,b) => a+b, 0);
  const fx = dX.reduce((a,b) => a+b, 0) - (xn-x0);
  const fy = dY.reduce((a,b) => a+b, 0) - (yn-y0);
  const fss = Math.sqrt(fx*fx + fy*fy);
  const T   = fss / sumD;
  const relStr = relText(T);
  const angOk = Math.abs(fb) <= fdop;
  const linOk = T <= 1/relLim;
  const cx  = sid.map(d => -fx*d/sumD);
  const cy  = sid.map(d => -fy*d/sumD);

  document.getElementById('th-hero').innerHTML = heroHtml({
    state: angOk && linOk ? 'ok' : 'bad',
    status: angOk && linOk ? 'В допуске' : !angOk && !linOk ? 'Обе невязки превышены' : !angOk ? 'Угловая невязка превышена' : 'Линейная невязка превышена',
    side: 'f<sub>β</sub> ' + formatDMS(fb * 60),
    num: relStr, caption: 'Относительная линейная невязка f<sub>s</sub> / Σd',
    ratio: T * relLim, scaleRight: 'допуск 1:' + relLim
  });
  document.getElementById('th-main').innerHTML =
    ri('f_β', formatDMS(fb * 60), angOk?'':'r') +
    ri('Допуск ±1′√n', '±'+fnSmart(fdop,2)+'′') +
    ri('Угл. невязка', angOk?'✓ НОРМА':'✗ ПРЕВЫШЕН', angOk?'g':'r') +
    ri('f_s (м)', fnSmart(fss,4), 'o') +
    ri('1/T (допуск 1:'+relLim+')', relStr, linOk?'g':'r') +
    ri('Лин. невязка', linOk?'✓ НОРМА':'✗ ПРЕВЫШЕН', linOk?'g':'r') +
    ri('δβ на угол', fnSmart(dBDeg*3600,1)+'″', 'p') +
    ri('Σ длин', fnSmart(sumD,3)+' м');

  let rows = '', cx2 = x0, cy2 = y0;
  rows += `<tr><td class="td-hi">Н</td><td>—</td><td>—</td><td>—</td><td>—</td><td class="td-hi">${fnSmart(x0,3)}</td><td class="td-hi">${fnSmart(y0,3)}</td></tr>`;
  sid.forEach((_,i) => {
    cx2 += dX[i]+cx[i]; cy2 += dY[i]+cy[i];
    rows += `<tr><td>${i+1}</td><td>${fmtDeg(alphas[i+dirOff])}</td><td>${fnSmart(sid[i],2)}</td><td>${fsSmart(dX[i]+cx[i],3)}</td><td>${fsSmart(dY[i]+cy[i],3)}</td><td class="td-hi">${fn(cx2,3)}</td><td class="td-hi">${fn(cy2,3)}</td></tr>`;
  });
  document.getElementById('th-tbl').innerHTML =
    `<table class="dt"><thead><tr><th>Тч</th><th>α</th><th>d(м)</th><th>ΔX′</th><th>ΔY′</th><th>X</th><th>Y</th></tr></thead><tbody>${rows}</tbody></table>`;
  document.getElementById('th-result').classList.remove('hidden');
}

// ── ПРЯМАЯ / ОБРАТНАЯ ─────────────────────────────────────
function calcFwd() {
  const x1 = numField('fx1'), y1 = numField('fy1'), d = numField('fd');
  const a  = parseDeg(document.getElementById('fa').value);
  if (![x1, y1, a, d].every(isFinite)) {
    document.getElementById('fwd-x2').textContent = '—';
    document.getElementById('fwd-y2').textContent = '—';
    return;
  }
  const r  = a * Math.PI / 180;
  document.getElementById('fwd-x2').textContent = fn(x1 + d*Math.cos(r), 4) + ' м';
  document.getElementById('fwd-y2').textContent = fn(y1 + d*Math.sin(r), 4) + ' м';
}

function calcInv() {
  const x1 = numField('ix1'), y1 = numField('iy1');
  const x2 = numField('ix2'), y2 = numField('iy2');
  const dx = x2-x1, dy = y2-y1;
  if (!isFinite(dx) || !isFinite(dy) || (dx === 0 && dy === 0)) {
    document.getElementById('inv-a').textContent = '—';
    document.getElementById('inv-d').textContent = isFinite(dx) && isFinite(dy) ? '0.0000 м' : '—';
    return;
  }
  const dist = Math.sqrt(dx*dx + dy*dy);
  let al = Math.atan2(dy, dx) * 180 / Math.PI;
  if (al < 0) al += 360;
  let totalSec = Math.round(al * 3600);
  if (totalSec >= 360*3600) totalSec = 0;
  document.getElementById('inv-a').textContent = formatDMS(totalSec);
  document.getElementById('inv-d').textContent = fn(dist, 4) + ' м';
}

// ── ВЕРОЯТНОСТИ ───────────────────────────────────────────
// Функция Лапласа Φ(x) = 1/√(2π)·∫₀ˣ e^(−t²/2) dt = erf(x/√2)/2
function phi(x) {
  if (x < 0) return -phi(-x);
  if (x > 8) return 0.5;
  const t = x / Math.sqrt(2);
  let s = 0, tm = t, sg = 1;
  for (let k = 0; k < 80; k++) {
    s += sg * tm / (2*k+1);
    tm *= t*t / (k+1);
    sg *= -1;
  }
  return s / Math.sqrt(Math.PI);  // Σ = (√π/2)·erf(t)
}

function calcProb() {
  const k = parseFloat(document.getElementById('pb-k').value) || 2;
  document.getElementById('pb-kv').textContent = fn(k, 2);
  const p = 2 * phi(k);
  document.getElementById('pb-pct').textContent = fn(p*100, 2) + '%';
  document.getElementById('pb-phi').textContent = fn(p/2, 4);
}

function calcLim() {
  const s = parseFloat(document.getElementById('lm-s').value) || 1;
  const t = parseFloat(document.getElementById('lm-t').value) || 3;
  document.getElementById('lm-res').textContent = '±' + fnSmart(t*s, 3) + '″';
}

// ── ВЗВЕШЕННЫЕ ────────────────────────────────────────────
function calcWt() {
  haptic('medium');
  const data = [], bad = [];
  document.getElementById('wt-in').value.split(/\r\n?|\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    // «значение; вес», «значение вес»; запятая допустима как разделитель, если есть «;» — то и как десятичная
    const parts = (t.includes(';') ? t.split(';') : t.split(/[\s,]+/)).map(x => x.trim()).filter(Boolean);
    const l = parseNum(parts[0]);
    const p = parts.length > 1 ? parseNum(parts[1]) : 1;
    if (parts.length > 2 || !isFinite(l) || !isFinite(p) || p <= 0) bad.push(i + 1);
    else data.push({ l, p });
  });
  if (bad.length) { notify('Не распознаны строки № ' + bad.join(', ') + ' (формат: значение; вес, вес > 0)'); return; }
  if (data.length < 2) { notify('Введите хотя бы 2 строки'); return; }
  const n   = data.length;
  const sp  = data.reduce((a,d) => a+d.p, 0);
  const spl = data.reduce((a,d) => a+d.p*d.l, 0);
  const mean = spl / sp;
  const v    = data.map(d => d.l - mean);
  const spv2 = data.reduce((a,d,i) => a+d.p*v[i]*v[i], 0);
  const mu   = Math.sqrt(spv2 / (n-1));
  const mx   = mu / Math.sqrt(sp);

  document.getElementById('wt-main').innerHTML =
    ri('Взвеш. средняя', fnSmart(mean,5)) +
    ri('[p]', fnSmart(sp,2)) +
    ri('μ (ед. веса)', '±'+fnSmart(mu,5), 'p') +
    ri('m_x̄', '±'+fnSmart(mx,5), 'g') +
    ri('Δ_пред', '±'+fnSmart(3*mx,5), 'o');

  let rows = '';
  data.forEach((d,i) =>
    rows += `<tr><td>${fnSmart(d.l,5)}</td><td>${fnSmart(d.p,2)}</td><td>${fsSmart(v[i],5)}</td><td>${fnSmart(d.p*v[i]*v[i],6)}</td></tr>`
  );
  rows += `<tr><td>Σ</td><td class="td-hi">${fnSmart(sp,2)}</td><td>—</td><td class="td-hi">${fnSmart(spv2,6)}</td></tr>`;
  document.getElementById('wt-tbl').innerHTML =
    `<table class="dt"><thead><tr><th>l_i</th><th>p_i</th><th>v_i</th><th>p·v²</th></tr></thead><tbody>${rows}</tbody></table>`;
  document.getElementById('wt-f').innerHTML =
    `<span class="hi">x̄</span>=${fnSmart(spl,4)}/${fnSmart(sp,2)}=${fnSmart(mean,5)}<br>` +
    `<span class="hi2">μ</span>=√([pv²]/(n−1))=√(${fnSmart(spv2,4)}/${n-1})=±${fnSmart(mu,5)}<br>` +
    `<span class="hi">m_x̄</span>=μ/√[p]=±${fnSmart(mu,5)}/√${fnSmart(sp,2)}=±${fnSmart(mx,5)}`;
  document.getElementById('wt-result').classList.remove('hidden');
}

// ── ТАБЛИЦА ЛАПЛАСА ───────────────────────────────────────
function buildLaplace() {
  let h = '<thead><tr><th>x</th>';
  for (let d = 0; d <= 9; d++) h += `<th>.0${d}</th>`;
  h += '</tr></thead><tbody>';
  for (let xi = 0; xi <= 30; xi++) {
    const x0 = xi / 10;
    h += `<tr><td class="td-hi">${fn(x0,1)}</td>`;
    for (let d = 0; d <= 9; d++) h += `<td>${fn(phi(x0+d/100), 4)}</td>`;
    h += '</tr>';
  }
  document.getElementById('laplace-table').innerHTML = h + '</tbody>';
}

// ── ВЕДОМОСТЬ КООРДИНАТ ───────────────────────────────────
let vedAngDir = 'right'; // 'right' | 'left'

function vedSetAngDir(dir, btn) {
  vedAngDir = dir;
  document.querySelectorAll('#ved-dir-right, #ved-dir-left').forEach(b => b.classList.remove('active'));
  (btn || document.getElementById(dir === 'left' ? 'ved-dir-left' : 'ved-dir-right')).classList.add('active');
  const lbl = document.getElementById('ved-ang-label');
  if (lbl) lbl.textContent = dir === 'left'
    ? 'Левые углы и стороны'
    : 'Правые углы и стороны';
}

function vedCalcAlpha() {
  const x1 = +document.getElementById('ved-ax1').value;
  const y1 = +document.getElementById('ved-ay1').value;
  const x2 = +document.getElementById('ved-ax2').value;
  const y2 = +document.getElementById('ved-ay2').value;
  const dx = x2 - x1, dy = y2 - y1;
  if (!isFinite(dx) || !isFinite(dy) || (dx === 0 && dy === 0)) {
    notify('Введите координаты двух различных точек'); return;
  }
  let al = Math.atan2(dy, dx) * 180 / Math.PI;
  if (al < 0) al += 360;
  let tot = Math.round(al * 3600);
  if (tot >= 360 * 3600) tot = 0;
  const d = Math.floor(tot / 3600), rem = tot % 3600;
  const m = Math.floor(rem / 60), s = rem % 60;
  document.getElementById('ved-a0').value = `${d} ${String(m).padStart(2,'0')} ${String(s).padStart(2,'0')}`;
  refreshInputs();
  saveStore();
  haptic('light');
}

function vedToggleEndFields() {
  const hasAn  = document.getElementById('ved-has-an').checked;
  const hasXY  = document.getElementById('ved-has-end-xy').checked;
  document.getElementById('ved-an-wrap').classList.toggle('ved-disabled', !hasAn);
  document.getElementById('ved-end-xy-wrap').classList.toggle('ved-disabled', !hasXY);
}

function vedToggleType() {
  const t = document.getElementById('ved-type').value;
  document.getElementById('ved-open-fields').style.display = t==='open' ? 'block' : 'none';
  const lbl = document.getElementById('ved-a0-label');
  if (lbl) lbl.textContent = t === 'open'
    ? 'α нач — дирекционный угол исходного направления (засечки)'
    : 'α нач — дирекционный угол первой стороны';
}

// Угол: «ГГ ММ СС.с», «ГГ°ММ′СС″» или десятичные градусы. Некорректный ввод → NaN.
function parseDeg(s) {
  s = String(s).trim().replace(/\u2212/g,'-').replace(/,/g,'.')
    .replace(/[°'′″"]/g,' ').replace(/\s+/g,' ').trim();
  if (!s) return NaN;
  const parts = s.split(' ').map(parseNum);
  if (parts.length > 3 || parts.some(v => !isFinite(v))) return NaN;
  if (parts.length === 1) return parts[0];
  if (parts.slice(1).some(v => v < 0 || v >= 60)) return NaN;
  const val = Math.abs(parts[0]) + parts[1]/60 + (parts[2] || 0)/3600;
  return /^-/.test(s) ? -val : val;
}

function fmtDeg(deg) {
  while (deg < 0)   deg += 360;
  while (deg >= 360) deg -= 360;
  let tot = Math.round(deg*36000) % (360*36000);
  const d = Math.floor(tot/36000), rem = tot%36000;
  const m = Math.floor(rem/600), s = (rem%600)/10;
  return d+'°'+String(m).padStart(2,'0')+'\''+String(s<10?'0'+s.toFixed(1):s.toFixed(1))+'"';
}

function fmtDegR(deg) {
  const sg = deg<0; deg = Math.abs(deg);
  let tot = Math.round(deg*36000);
  const d = Math.floor(tot/36000), rem = tot%36000;
  const m = Math.floor(rem/600), s = (rem%600)/10;
  return (sg?'-':'')+d+'°'+String(m).padStart(2,'0')+'\''+String(s<10?'0'+s.toFixed(1):s.toFixed(1))+'"';
}

function norm360(a) { while (a<0) a+=360; while (a>=360) a-=360; return a; }

function vedExample() {
  document.getElementById('ved-type').value = 'closed';
  vedToggleType();
  vedSetAngDir('right');
  document.getElementById('ved-x0').value = '1000.00';
  document.getElementById('ved-y0').value = '1000.00';
  document.getElementById('ved-a0').value = '0 00 00';
  document.getElementById('ved-ang').value   = '89 59 10\n90 00 40\n89 58 50\n90 01 40';
  document.getElementById('ved-sides').value = '200.00\n150.00\n200.00\n150.00';
  refreshInputs();
  saveStore();
  calcVed();
}

function calcVed() {
  haptic('medium');
  const type = document.getElementById('ved-type').value;
  const x0 = numField('ved-x0');
  const y0 = numField('ved-y0');
  if (!isFinite(x0) || !isFinite(y0)) { notify('Введите начальные координаты X, Y'); return; }
  const a0 = parseDeg(document.getElementById('ved-a0').value);
  if (isNaN(a0)) { notify('Некорректный начальный дирекционный угол'); return; }

  const ang = takeLines(document.getElementById('ved-ang').value, parseDeg, 'Углы');
  if (!ang) return;
  const sid = takeLines(document.getElementById('ved-sides').value, parseNum, 'Стороны');
  if (!sid) return;
  if (!ang.length || !sid.length) { notify('Введите углы и стороны'); return; }
  // Замкнутый: сторон = углов. Разомкнутый: сторон = углов (αₙ — направление последней стороны)
  // или на 1 меньше (угол измерен и на конечной точке, αₙ — исходное конечное направление).
  if (type === 'closed' && ang.length !== sid.length) {
    notify('Замкнутый ход: количество углов ('+ang.length+') ≠ количество сторон ('+sid.length+')'); return;
  }
  if (type === 'open' && sid.length !== ang.length && sid.length !== ang.length - 1) {
    notify('Разомкнутый ход: сторон ('+sid.length+') должно быть столько же, сколько углов ('+ang.length+'), или на 1 меньше'); return;
  }
  if (sid.some(d => d <= 0)) { notify('Длины сторон должны быть положительными'); return; }
  const relLim = +document.getElementById('ved-rel').value || 2000;

  const n = ang.length, m = sid.length, R = Math.PI/180;
  const bSum = ang.reduce((a,b) => a+b, 0);

  const angDir = vedAngDir;
  const angWord = angDir === 'right' ? 'правые' : 'левые';

  // Флаги наличия опорных конечных данных (только для разомкнутого хода)
  const hasAngle  = type === 'closed' || document.getElementById('ved-has-an').checked;
  const hasEndXY  = type === 'closed' || document.getElementById('ved-has-end-xy').checked;

  // Теоретическая сумма — ближайшее к измеренной
  let bTheor = NaN, anDeg = NaN;
  let fBetaDeg = 0, fBetaSec = 0, fBetaMin = 0;
  let angOk = null, dBetaDeg = 0, dBetaSec = 0;

  if (type === 'closed') {
    const k = Math.round((bSum - n*180) / 360);
    bTheor = n*180 + k*360;
    fBetaDeg = bSum - bTheor;
    fBetaSec = fBetaDeg * 3600;
    fBetaMin = fBetaDeg * 60;
    angOk = Math.abs(fBetaMin) <= Math.sqrt(n);
    dBetaDeg = -fBetaDeg / n;
    dBetaSec = dBetaDeg * 3600;
  } else if (hasAngle) {
    anDeg = parseDeg(document.getElementById('ved-an').value);
    if (isNaN(anDeg)) { notify('Некорректный конечный дирекционный угол'); return; }
    // Правые: Σβ = α₀ − αₙ + n·180°; Левые: Σβ = αₙ − α₀ + n·180°
    const base = angDir === 'right' ? (a0 - anDeg + n*180) : (anDeg - a0 + n*180);
    const k = Math.round((bSum - base) / 360);
    bTheor = base + k*360;
    fBetaDeg = bSum - bTheor;
    fBetaSec = fBetaDeg * 3600;
    fBetaMin = fBetaDeg * 60;
    angOk = Math.abs(fBetaMin) <= Math.sqrt(n);
    dBetaDeg = -fBetaDeg / n;
    dBetaSec = dBetaDeg * 3600;
  }
  // Если hasAngle=false — поправки нулевые, угловая увязка не выполняется

  const fdopMin  = Math.sqrt(n);
  const adjAng   = ang.map(b => b + dBetaDeg);
  // dirOff=1 для разомкнутого: α₀ — исходное направление (засечка), первая сторона — alphas[1]
  const dirOff   = type === 'open' ? 1 : 0;

  // Рекуррентная формула: правые α_{i+1} = α_i − β + 180°; левые α_{i+1} = α_i + β − 180°
  const alphas = [a0];
  for (let i = 0; i < n; i++) {
    const prev = alphas[alphas.length - 1];
    alphas.push(angDir === 'right'
      ? norm360(prev - adjAng[i] + 180)
      : norm360(prev + adjAng[i] - 180));
  }

  const dX = sid.map((d,i) => d * Math.cos(alphas[i+dirOff]*R));
  const dY = sid.map((d,i) => d * Math.sin(alphas[i+dirOff]*R));
  const sumD = sid.reduce((a,b) => a+b, 0);

  if (!sumD || !isFinite(sumD)) { notify('Сумма сторон должна быть положительной'); return; }

  let fx = 0, fy = 0;
  if (type === 'closed') {
    fx = dX.reduce((a,b) => a+b, 0);
    fy = dY.reduce((a,b) => a+b, 0);
  } else if (hasEndXY) {
    const xn = numField('ved-xn');
    const yn = numField('ved-yn');
    if (!isFinite(xn) || !isFinite(yn)) { notify('Введите конечные координаты X, Y (или снимите галочку)'); return; }
    fx = dX.reduce((a,b) => a+b, 0) - (xn - x0);
    fy = dY.reduce((a,b) => a+b, 0) - (yn - y0);
  }
  // hasEndXY=false → fx=fy=0, координаты без поправки

  const fs = Math.sqrt(fx*fx + fy*fy);
  const T = fs / sumD;
  const linOk = hasEndXY || type === 'closed' ? T <= 1/relLim : null;

  const vx = sid.map(d => -fx*d/sumD);
  const vy = sid.map(d => -fy*d/sumD);

  const coords = [[x0,y0]];
  for (let i = 0; i < m; i++) coords.push([coords[i][0]+dX[i]+vx[i], coords[i][1]+dY[i]+vy[i]]);

  const angKnown = angOk !== null;
  const linKnown = linOk !== null;

  const allOk = (!angKnown || angOk) && (!linKnown || linOk);
  document.getElementById('ved-hero').innerHTML = linKnown ? heroHtml({
    state: allOk ? 'ok' : 'bad',
    status: allOk ? 'В допуске' : (angKnown && !angOk && !linOk) ? 'Обе невязки превышены' : (angKnown && !angOk) ? 'Угловая невязка превышена' : 'Линейная невязка превышена',
    side: angKnown ? 'f<sub>β</sub> ' + fnSmart(fBetaSec, 1) + '″' : 'без угловой увязки',
    num: relText(T), caption: 'Относительная линейная невязка f<sub>s</sub> / Σd',
    ratio: T * relLim, scaleRight: 'допуск 1:' + relLim
  }) : angKnown ? heroHtml({
    state: angOk ? 'ok' : 'bad', status: angOk ? 'Угловая невязка в допуске' : 'Угловая невязка превышена',
    side: 'без линейной увязки', num: fsSmart(Math.round(fBetaSec * 10) / 10, 1), unit: '″',
    caption: 'Угловая невязка f<sub>β</sub>',
    ratio: Math.abs(fBetaSec) / (fdopMin * 60), scaleRight: 'допуск ±' + fnSmart(fdopMin * 60, 1) + '″'
  }) : heroHtml({
    state: 'info', status: 'Висячий ход', num: 'Без контроля',
    caption: 'Конечные α и X, Y не заданы — невязки не вычисляются, координаты без поправок'
  });
  document.getElementById('ved-main').innerHTML =
    ri('f_β (″)', angKnown ? fnSmart(fBetaSec,1) : '—', angKnown&&!angOk?'r':'') +
    ri('Допуск ±1′√n', '±'+fnSmart(fdopMin,2)+'′', 'o') +
    ri('Угл. невязка', angKnown ? (angOk?'✓ НОРМА':'✗ ПРЕВЫШЕН') : 'α_кон не задан', angKnown?(angOk?'g':'r'):'') +
    ri('f_s (м)', linKnown ? fnSmart(fs,4) : '—', 'o') +
    ri('1/T (допуск 1:'+relLim+')', linKnown ? relText(T) : 'XY_кон не заданы', linKnown&&linOk?'g':linKnown?'r':'') +
    ri('Σ длин', fnSmart(sumD,3)+' м') +
    ri('δβ на угол', angKnown ? fnSmart(dBetaSec,1)+'″' : '0″ (нет увязки)', 'p') +
    ri('Углов / сторон', n + ' / ' + m);

  document.getElementById('ved-checks').innerHTML = `
    <div class="check-item ${angKnown?(angOk?'check-pass':'check-fail'):'check-neutral'}">
      <span class="check-icon">${angKnown?(angOk?ICON.ok:ICON.fail):ICON.info}</span>
      <div><strong>Угловая невязка</strong>${angKnown
        ? `f_β = ${fnSmart(fBetaSec,1)}″ | Допуск ±${fnSmart(fdopMin,2)}′ — ${angOk?'НОРМА':'ПРЕВЫШЕНА'}`
        : 'α_кон не задан — угловая увязка не выполняется (висячий ход)'}</div>
    </div>
    <div class="check-item ${linKnown?(linOk?'check-pass':'check-fail'):'check-neutral'}">
      <span class="check-icon">${linKnown?(linOk?ICON.ok:ICON.fail):ICON.info}</span>
      <div><strong>Линейная невязка</strong>${linKnown
        ? `f_s = ${fnSmart(fs,4)} м | ${relText(T)} (допуск 1:${relLim}) — ${linOk?'НОРМА':'ПРЕВЫШЕНА'}`
        : 'X_кон/Y_кон не заданы — линейная увязка не выполняется (координаты без поправки)'}</div>
    </div>`;

  const sdX = dX.reduce((a,b) => a+b, 0);
  const sdY = dY.reduce((a,b) => a+b, 0);
  const closedLabel = (type === 'closed');
  const recurrSign = angDir === 'right' ? '−' : '+';
  const recurrTail = angDir === 'right' ? '+ 180°' : '− 180°';
  const thFormula = closedLabel
    ? `Σβ_теор = (n±k)·180°, ближайшее к Σβ_изм = <strong>${fnSmart(n)}·180 + (${Math.round((bSum-n*180)/360)})·360 = ${fnSmart(bTheor,4)}°</strong>`
    : !hasAngle
      ? `α_кон не задан — <strong>теоретическая сумма не вычисляется</strong>. Дирекционные углы пропагируются от α₀ без коррекции.`
      : angDir === 'right'
        ? `Σβ_теор = α₀ − αₙ + n·180° = ${fn(a0,4)} − ${fn(anDeg,4)} + ${n}·180 ≈ <strong>${fnSmart(bTheor,4)}°</strong>`
        : `Σβ_теор = αₙ − α₀ + n·180° = ${fn(anDeg,4)} − ${fn(a0,4)} + ${n}·180 ≈ <strong>${fnSmart(bTheor,4)}°</strong>`;

  let dirRows = '';
  dirRows += `<div class="step"><strong>α₀ = ${fmtDeg(a0)}</strong> — ${type === 'open' ? 'дирекционный угол <u>исходного направления</u> (засечки, не стороны хода)' : 'дирекционный угол <u>первой стороны</u> (задан)'}</div>`;
  for (let i = 0; i < n; i++) {
    dirRows += `<div class="step"><strong>α${i+1} = α${i} ${recurrSign} β${i+1}(испр.) ${recurrTail}</strong>
      <div class="step-f">${fmtDeg(alphas[i])} ${recurrSign} ${fmtDegR(adjAng[i])} ${recurrTail} = <strong>${fmtDeg(alphas[i+1])}</strong>${i===n-1?(closedLabel?' ← должно = α₀':''):''}</div></div>`;
  }

  let bowRows = '';
  for (let i = 0; i < m; i++) {
    bowRows += `<div style="padding:4px 0;border-bottom:1px solid var(--border);font-size:12px">
      <span style="color:var(--accent)">Ст.${i+1}:</span>
      vΔX = −${fnSmart(fx,4)}·${fnSmart(sid[i],2)}/${fnSmart(sumD,2)} = <strong>${fsSmart(vx[i],4)} м</strong> &nbsp;|&nbsp;
      vΔY = −${fnSmart(fy,4)}·${fnSmart(sid[i],2)}/${fnSmart(sumD,2)} = <strong>${fsSmart(vy[i],4)} м</strong>
    </div>`;
  }

  document.getElementById('ved-explain').innerHTML = `
  <div style="margin-bottom:14px">
    <div class="ar-annot-wrap"><details open>
      <summary>① Угловая увязка</summary>
      <div class="ar-annot-list">
        <div class="ar-annot-item">
          <strong>Сумма измеренных углов</strong>
          <div class="ar-annot-f">Σβ_изм = ${ang.map(fmtDegR).join(' + ')} = <strong>${fmtDegR(bSum)}</strong></div>
          <div class="ar-annot-why">Складываем все введённые ${angWord} углы.</div>
        </div>
        <div class="ar-annot-item">
          <strong>Теоретическая сумма</strong>
          <div class="ar-annot-f">${thFormula}</div>
          <div class="ar-annot-why">${closedLabel
            ? 'Для замкнутого хода выбираем n·180°±k·360°, ближайшее к Σβ_изм. Для внутренних углов это (n−2)·180°, для внешних — (n+2)·180°.'
            : angDir === 'right'
              ? 'Правые углы (разомкнутый): Σβ_пр = α₀ − αₙ + n·180°. Формула выводится из рекуррентного соотношения α_{i+1} = α_i − β + 180°.'
              : 'Левые углы (разомкнутый): Σβ_лев = αₙ − α₀ + n·180°. Формула выводится из рекуррентного соотношения α_{i+1} = α_i + β − 180°.'}</div>
        </div>
        <div class="ar-annot-item">
          <strong>Угловая невязка</strong>
          <div class="ar-annot-f">f_β = Σβ_изм − Σβ_теор = ${fmtDegR(bSum)} − ${fnSmart(bTheor,6)}° = <strong>${fnSmart(fBetaSec,1)}″</strong></div>
          <div class="ar-annot-why">Разница между реальной суммой и теоретической — это ошибка угловых измерений.</div>
        </div>
        <div class="ar-annot-item">
          <strong>Допустимая невязка</strong>
          <div class="ar-annot-f">f_доп = ±1′·√n = ±1·√${n} = <strong>±${fnSmart(fdopMin,3)}′</strong> = ±${fnSmart(fdopMin*60,1)}″</div>
          <div class="ar-annot-why">Чем больше точек, тем больше допуск — ошибки накапливаются. Если |f_β| > f_доп — данные нужно перепроверить.</div>
        </div>
        <div class="ar-annot-item">
          <strong>Поправка в каждый угол</strong>
          <div class="ar-annot-f">δβ = −f_β / n = −${fnSmart(fBetaSec,1)}″ / ${n} = <strong>${fnSmart(dBetaSec,2)}″</strong></div>
          <div class="ar-annot-why">Раскладываем погрешность поровну на все углы. Знак противоположный невязке.</div>
        </div>
      </div>
    </details></div>

    <div class="ar-annot-wrap" style="margin-top:10px"><details>
      <summary>② Дирекционные углы α</summary>
      <div class="ar-annot-list">
        <div class="ar-annot-item">
          <strong>Формула пересчёта</strong>
          <div class="ar-annot-f">${angDir === 'right'
            ? 'α_{i+1} = α_i − β_{испр} + 180° (правые углы)'
            : 'α_{i+1} = α_i + β_{испр} − 180° (левые углы)'}</div>
          <div class="ar-annot-why">${angDir === 'right'
            ? 'Правые углы: от предыдущего дирекционного угла вычитаем исправленный угол и добавляем 180°. Результат нормализуем в [0°, 360°).'
            : 'Левые углы: к предыдущему дирекционному углу прибавляем исправленный угол и вычитаем 180°. Результат нормализуем в [0°, 360°).'}</div>
        </div>
        <div class="steps" style="margin-top:8px">${dirRows}</div>
      </div>
    </details></div>

    <div class="ar-annot-wrap" style="margin-top:10px"><details>
      <summary>③ Приращения координат</summary>
      <div class="ar-annot-list">
        <div class="ar-annot-item">
          <strong>Формула (X=Север, Y=Восток)</strong>
          <div class="ar-annot-f">ΔX_i = d_i · cos(α_i) &nbsp;|&nbsp; ΔY_i = d_i · sin(α_i)</div>
          <div class="ar-annot-why">В геодезической системе X — ось Север, Y — ось Восток. cos даёт северное смещение, sin — восточное.</div>
        </div>
        ${sid.map((d,i) => `<div class="ar-annot-item">
          <strong>Сторона ${i+1}: d=${fnSmart(d,2)} м, α=${fmtDeg(alphas[i+dirOff])}</strong>
          <div class="ar-annot-f">ΔX = ${fnSmart(d,2)}·cos(${fmtDeg(alphas[i+dirOff])}) = <strong>${fsSmart(dX[i],4)}</strong> &nbsp;|&nbsp; ΔY = ${fnSmart(d,2)}·sin(${fmtDeg(alphas[i+dirOff])}) = <strong>${fsSmart(dY[i],4)}</strong></div>
        </div>`).join('')}
        <div class="ar-annot-item">
          <strong>Суммы приращений (линейная невязка)</strong>
          <div class="ar-annot-f">ΣΔX = ${fsSmart(sdX,4)} &nbsp;|&nbsp; ΣΔY = ${fsSmart(sdY,4)}</div>
          <div class="ar-annot-f">${closedLabel
            ? `f_X = ΣΔX = <strong>${fsSmart(fx,4)} м</strong> &nbsp;|&nbsp; f_Y = ΣΔY = <strong>${fsSmart(fy,4)} м</strong>`
            : `f_X = ΣΔX−(Xₙ−X₀) = <strong>${fsSmart(fx,4)} м</strong> &nbsp;|&nbsp; f_Y = ΣΔY−(Yₙ−Y₀) = <strong>${fsSmart(fy,4)} м</strong>`}</div>
          <div class="ar-annot-f">f_s = √(f_X²+f_Y²) = √(${fnSmart(fx*fx,6)}+${fnSmart(fy*fy,6)}) = <strong>${fnSmart(fs,4)} м</strong></div>
          <div class="ar-annot-f">Относительная точность: 1/T = Σd/f_s = ${fnSmart(sumD,2)}/${fnSmart(fs,4)} = <strong>${relText(T)}</strong></div>
          <div class="ar-annot-why">${closedLabel
            ? 'Для замкнутого хода ΣΔX и ΣΔY должны быть нулём. Реальный остаток — линейная невязка.'
            : 'Сравниваем сумму приращений с фактической разностью координат конечных точек.'}</div>
        </div>
      </div>
    </details></div>

    <div class="ar-annot-wrap" style="margin-top:10px"><details>
      <summary>④ Поправки Боудича (пропорционально длинам)</summary>
      <div class="ar-annot-list">
        <div class="ar-annot-item">
          <strong>Формула Боудича</strong>
          <div class="ar-annot-f">vΔX_i = −f_X · d_i / Σd &nbsp;|&nbsp; vΔY_i = −f_Y · d_i / Σd</div>
          <div class="ar-annot-why">Невязку распределяем пропорционально длине стороны: длинная сторона несёт бо́льшую поправку. Знак противоположный невязке.</div>
        </div>
        ${bowRows}
      </div>
    </details></div>

    <div class="ar-annot-wrap" style="margin-top:10px"><details>
      <summary>⑤ Уравненные координаты</summary>
      <div class="ar-annot-list">
        <div class="ar-annot-item">
          <strong>Формула</strong>
          <div class="ar-annot-f">X_{i+1} = X_i + ΔX_i + vΔX_i &nbsp;|&nbsp; Y_{i+1} = Y_i + ΔY_i + vΔY_i</div>
          <div class="ar-annot-why">Прибавляем исправленное приращение к предыдущим координатам. Начало — заданная точка (X₀, Y₀).</div>
        </div>
        ${coords.map((c,i) => `<div class="ar-annot-item">
          <strong>${i===0?'Начало (Н)':'Точка '+i}</strong>
          <div class="ar-annot-f">X = <strong>${fn(c[0],3)}</strong> м &nbsp;|&nbsp; Y = <strong>${fn(c[1],3)}</strong> м</div>
          ${i>0 ? `<div class="ar-annot-why">ΔX=${fsSmart(dX[i-1],4)} + vΔX=${fsSmart(vx[i-1],4)} = ${fsSmart(dX[i-1]+vx[i-1],4)} → X: ${fn(coords[i-1][0],3)} + ${fsSmart(dX[i-1]+vx[i-1],4)} = ${fn(c[0],3)}</div>` : ''}
        </div>`).join('')}
      </div>
    </details></div>
  </div>`;

  // Таблица углов
  let ar = '';
  ang.forEach((b,i) => {
    ar += `<tr><td class="td-hi">${i+1}</td><td>${fmtDegR(b)}</td><td>${dBetaSec>=0?'+':''}${fnSmart(dBetaSec,1)}″</td><td>${fmtDegR(adjAng[i])}</td><td>${fmtDeg(alphas[i+1])}</td></tr>`;
  });
  ar += `<tr style="color:var(--accent);font-weight:600"><td>Σ</td><td>${fmtDegR(bSum)}</td><td>${fnSmart(fBetaSec,1)}″</td><td>${fmtDegR(adjAng.reduce((a,b)=>a+b,0))}</td><td>—</td></tr>`;
  document.getElementById('ved-ang-tbl').innerHTML =
    `<table class="dt"><thead><tr><th>№</th><th>β изм.</th><th>δβ″</th><th>β испр.</th><th>α дир.</th></tr></thead><tbody>${ar}</tbody></table>`;

  // Таблица координат
  let cr = `<tr><td class="td-hi">Н</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td class="td-hi">${fn(x0,3)}</td><td class="td-hi">${fn(y0,3)}</td></tr>`;
  for (let i = 0; i < m; i++) {
    cr += `<tr><td class="td-hi">${i+1}</td><td>${fnSmart(sid[i],2)}</td><td>${fsSmart(dX[i],3)}</td><td>${vx[i]>=0?'+':''}${fnSmart(vx[i]*1000,1)}мм</td><td>${fsSmart(dX[i]+vx[i],3)}</td><td>${fsSmart(dY[i],3)}</td><td>${vy[i]>=0?'+':''}${fnSmart(vy[i]*1000,1)}мм</td><td class="td-hi">${fn(coords[i+1][0],3)}</td><td class="td-hi">${fn(coords[i+1][1],3)}</td></tr>`;
  }
  cr += `<tr style="color:var(--accent);font-weight:600"><td>Σ</td><td>${fnSmart(sumD,2)}</td><td>${fsSmart(sdX,3)}</td><td>${(-fx*1000>=0?'+':'')}${fnSmart(-fx*1000,1)}мм</td><td>${fsSmart(sdX-fx,3)}</td><td>${fsSmart(sdY,3)}</td><td>${(-fy*1000>=0?'+':'')}${fnSmart(-fy*1000,1)}мм</td><td>—</td><td>—</td></tr>`;
  document.getElementById('ved-coord-tbl').innerHTML =
    `<table class="dt"><thead><tr><th>№</th><th>d(м)</th><th>ΔX</th><th>vΔX</th><th>ΔX′</th><th>ΔY</th><th>vΔY</th><th>X</th><th>Y</th></tr></thead><tbody>${cr}</tbody></table>`;

  document.getElementById('ved-result').classList.remove('hidden');
}

// ── ПОЛЯ ВВОДА В СТИЛЕ iOS ────────────────────────────────
// Источник истины — исходные поля (input[data-dms], textarea): их читают расчёты
// и сохраняет saveStore. Виджеты ниже только редактируют эти поля.

// «ГГ ММ СС» ↔ три поля ° ′ ″ (на цифровой клавиатуре iOS нет пробела)
function dmsParts(v) {
  const t = String(v || '').trim().replace(/[°'′″"]/g, ' ').trim();
  if (!t) return ['', '', ''];
  const p = t.split(/\s+/);
  return [p[0] || '', p[1] || '', p.slice(2).join(' ') || ''];
}
function dmsJoin(d, m, sec) {
  d = d.trim(); m = m.trim(); sec = sec.trim();
  if (!d && !m && !sec) return '';
  if (!m && !sec) return d;
  return [d || '0', m || '0', sec || '0'].join(' ');
}

function buildDms(value, onChange) {
  const wrap = document.createElement('span');
  wrap.className = 'dms';
  const specs = [['dms-d', '0', '°', 'градусы', 3], ['dms-m', '00', '′', 'минуты', 2], ['dms-s', '00', '″', 'секунды', 0]];
  const inputs = specs.map(([cls, ph, sym, label, maxDigits], i) => {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'decimal';
    inp.className = cls;
    inp.placeholder = ph;
    inp.setAttribute('aria-label', label);
    inp.autocomplete = 'off';
    const mark = document.createElement('span');
    mark.textContent = sym;
    wrap.append(inp, mark);
    inp.addEventListener('input', () => {
      // Вставка целого угла «178 19 12» в любое из полей раскладывается по трём полям
      if (/[\s°'′″"]/.test(inp.value.trim())) {
        const parts = dmsParts(inp.value);
        inputs.forEach((x, k) => { x.value = parts[k]; });
      } else if (maxDigits && /^\d+$/.test(inp.value) && inp.value.length >= maxDigits && inputs[i + 1]) {
        inputs[i + 1].focus();
        inputs[i + 1].select();
      }
      onChange(dmsJoin(inputs[0].value, inputs[1].value, inputs[2].value));
    });
    return inp;
  });
  wrap.setValue = v => { const parts = dmsParts(v); inputs.forEach((x, k) => { x.value = parts[k]; }); };
  wrap.focusFirst = () => inputs[0].focus();
  wrap.setValue(value);
  return wrap;
}

function initDmsFields() {
  document.querySelectorAll('input[data-dms]').forEach(src => {
    const w = buildDms(src.value, v => {
      src.value = v;
      src.dispatchEvent(new Event('input', { bubbles: true }));
    });
    src._dms = w;
    src.after(w);
  });
}

// Редактор строк: каждая колонка — своя textarea (по значению на строку)
const ICON_MINUS = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" style="fill:var(--red)"/><path d="M7 12h10" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>';
const ICON_PLUS = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" style="fill:var(--tint)"/><path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>';

function edCols(ed) { return JSON.parse(ed.dataset.cols); }

function colLines(id) {
  const a = document.getElementById(id).value.replace(/\r\n?/g, '\n').split('\n');
  while (a.length && !a[a.length - 1].trim()) a.pop();
  return a;
}

function edMatrix(ed) {
  return [...ed.querySelectorAll('.rows-item')].map(row =>
    [...row.querySelectorAll('.rows-cell')].map(c => c.dataset.value || ''));
}

// Матрица → textarea. Пустая ячейка в середине столбца записывается как «?»,
// чтобы расчёт сообщил номер строки, а не сдвинул данные молча.
function edWrite(ed, matrix) {
  edCols(ed).forEach((c, ci) => {
    const vals = matrix.map(r => (r[ci] || '').trim());
    let last = vals.length - 1;
    while (last >= 0 && !vals[last]) last--;
    document.getElementById(c.id).value = vals.slice(0, last + 1).map(v => v || '?').join('\n');
  });
}

function edCell(ed, c, value) {
  let cell;
  if (c.type === 'dms') {
    cell = buildDms(value, v => { cell.dataset.value = v; edWrite(ed, edMatrix(ed)); });
    cell.classList.add('rows-cell');
  } else {
    cell = document.createElement('span');
    cell.className = 'rows-cell';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'decimal';
    inp.autocomplete = 'off';
    inp.placeholder = c.ph || '';
    inp.value = value;
    inp.setAttribute('aria-label', c.label);
    inp.addEventListener('input', () => { cell.dataset.value = inp.value; edWrite(ed, edMatrix(ed)); });
    if (c.signed) {
      // На цифровой клавиатуре iOS нет минуса — знак переключается кнопкой
      const sign = document.createElement('button');
      sign.type = 'button';
      sign.className = 'cell-sign';
      sign.textContent = '±';
      sign.setAttribute('aria-label', 'Сменить знак');
      sign.addEventListener('click', () => {
        const v = inp.value.trim().replace(/^−/, '-');
        inp.value = v.startsWith('-') ? v.slice(1) : '-' + v.replace(/^\+/, '');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
      cell.append(sign);
    }
    cell.append(inp);
  }
  cell.dataset.value = value;
  return cell;
}

function renderRows(ed, focus) {
  const cols = edCols(ed);
  const lines = cols.map(c => colLines(c.id));
  const n = Math.max(1, ed._rows || 0, ...lines.map(l => l.length));
  ed._rows = n;
  ed.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'row rows-item';
    const num = document.createElement('span');
    num.className = 'row-num';
    num.textContent = i + 1;
    row.append(num);
    cols.forEach((c, ci) => row.append(edCell(ed, c, (lines[ci][i] || '').replace(/^\?$/, ''))));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'row-del';
    del.innerHTML = ICON_MINUS;
    del.setAttribute('aria-label', 'Удалить строку ' + (i + 1));
    del.addEventListener('click', () => {
      const m = edMatrix(ed);
      m.splice(i, 1);
      ed._rows = Math.max(1, n - 1);
      edWrite(ed, m);
      renderRows(ed);
      saveStore();
      haptic('light');
    });
    row.append(del);
    ed.append(row);
  }
  const addRow = document.createElement('div');
  addRow.className = 'row';
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'row-add';
  add.innerHTML = ICON_PLUS + '<span>Добавить строку</span>';
  add.addEventListener('click', () => { ed._rows = n + 1; renderRows(ed, n); });
  addRow.append(add);
  ed.append(addRow);
  if (focus !== undefined) {
    const target = ed.querySelectorAll('.rows-item')[focus];
    const first = target && target.querySelector('.rows-cell');
    if (first) (first.focusFirst ? first.focusFirst() : first.querySelector('input').focus());
  }
}

function initRowsEditor(ed) {
  // Enter — к той же колонке следующей строки (новая строка создаётся при необходимости)
  ed.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    const rows = [...ed.querySelectorAll('.rows-item')];
    const ri = rows.indexOf(e.target.closest('.rows-item'));
    const cells = [...rows[ri].querySelectorAll('.rows-cell')];
    const ci = cells.indexOf(e.target.closest('.rows-cell'));
    if (ri === rows.length - 1) { ed._rows = rows.length + 1; renderRows(ed); }
    const next = ed.querySelectorAll('.rows-item')[ri + 1].querySelectorAll('.rows-cell')[ci];
    (next.focusFirst ? next.focusFirst() : next.querySelector('input').focus());
  });
  // Вставка нескольких строк / столбцов (из Excel — табуляция, либо «;»)
  ed.addEventListener('paste', e => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (!/[\n\t;]/.test(text.trim())) return;
    e.preventDefault();
    const rows = [...ed.querySelectorAll('.rows-item')];
    const ri = rows.indexOf(e.target.closest('.rows-item'));
    const ci = [...rows[ri].querySelectorAll('.rows-cell')].indexOf(e.target.closest('.rows-cell'));
    const ncol = edCols(ed).length;
    const m = edMatrix(ed);
    text.trim().split(/\r\n?|\n/).forEach((line, r) => {
      const parts = line.split(/\t|;/);
      m[ri + r] = m[ri + r] || new Array(ncol).fill('');
      parts.forEach((v, c) => { if (ci + c < ncol) m[ri + r][ci + c] = v.trim(); });
    });
    for (let r = 0; r < m.length; r++) m[r] = m[r] || new Array(ncol).fill('');
    ed._rows = m.length;
    edWrite(ed, m);
    renderRows(ed);
    saveStore();
  });
}

// «Текстом» ↔ «Строками»: текстовый режим удобен для больших списков
function toggleRowsMode(edId, btn) {
  const ed = document.getElementById(edId);
  const txt = document.getElementById(edId + '-text');
  if (!ed.hidden) {
    ed.hidden = true; txt.hidden = false; btn.textContent = 'Строками';
  } else {
    ed._rows = 0; renderRows(ed);
    ed.hidden = false; txt.hidden = true; btn.textContent = 'Текстом';
  }
}

// После программного изменения полей (пример, восстановление) — перерисовать виджеты
function refreshInputs() {
  document.querySelectorAll('input[data-dms]').forEach(src => { if (src._dms) src._dms.setValue(src.value); });
  document.querySelectorAll('.rows-editor').forEach(ed => {
    if (!ed._init) { initRowsEditor(ed); ed._init = true; }
    ed._rows = 0;
    renderRows(ed);
  });
}

// ── СОХРАНЕНИЕ ВВОДА ──────────────────────────────────────
// Введённые данные хранятся локально, чтобы не терялись при закрытии Web App.
const STORE_KEY = 'geocalc.inputs.v1';

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
}

function saveStore() {
  const data = { _arMode: arMode, _vedAngDir: vedAngDir, _trav: travMode };
  document.querySelectorAll('.app input[id], .app textarea[id], .app select[id]').forEach(el => {
    data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
  });
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* хранилище недоступно */ }
}

function restoreStore() {
  const data = loadStore();
  document.querySelectorAll('.app input[id], .app textarea[id], .app select[id]').forEach(el => {
    if (!(el.id in data)) return;
    if (el.type === 'checkbox') el.checked = !!data[el.id];
    else if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === data[el.id])) return;
    else el.value = data[el.id];
  });
  if (data._arMode === 'm') switchArMode('m', document.getElementById('ar-tab-m'));
  if (data._vedAngDir === 'left') vedSetAngDir('left');
  if (data._trav === 'ved') switchTrav('ved');
  document.getElementById('pb-kr').value = document.getElementById('pb-k').value;
  vedToggleType();
  vedToggleEndFields();
}

// ── INIT ──────────────────────────────────────────────────
window.onload = () => {
  applyTheme();
  initDmsFields();
  restoreStore();
  refreshInputs();
  const app = document.querySelector('.app');
  app.addEventListener('scroll', updateTopbar, { passive: true });
  app.addEventListener('input', saveStore);
  app.addEventListener('change', saveStore);
  app.addEventListener('click', e => { if (e.target.closest('.seg-btn')) saveStore(); });
  buildLaplace(); calcProb(); calcLim(); calcFwd(); calcInv();
};
