/*
 * GeoCalculator — Telegram Web App
 * ══════════════════════════════════════════════════════════
 *
 * КАК ПОДКЛЮЧИТЬ TELEGRAM БОТА:
 *
 * 1. Создайте бота через @BotFather и получите токен.
 * 2. Укажите Web App URL командой /setmenubutton или через инлайн-кнопку:
 *
 *    // Python (python-telegram-bot):
 *    await bot.send_message(
 *      chat_id=chat_id,
 *      text="Открыть калькулятор:",
 *      reply_markup=InlineKeyboardMarkup([[
 *        InlineKeyboardButton("🧮 GeoCalculator",
 *          web_app=WebAppInfo(url="https://YOUR-LOGIN.github.io/REPO/"))
 *      ]])
 *    )
 *
 *    // Node.js (telegraf):
 *    ctx.reply("Открыть:", {
 *      reply_markup: { inline_keyboard: [[
 *        { text: "🧮 GeoCalculator", web_app: { url: "https://YOUR-LOGIN.github.io/REPO/" } }
 *      ]]}
 *    });
 *
 * 3. Когда пользователь нажимает "Отправить результат" (MainButton),
 *    бот получает данные через webhook:
 *    update.web_app_data.data  — JSON строка с результатом
 *
 * ══════════════════════════════════════════════════════════
 */

// ── TELEGRAM WEB APP INIT ─────────────────────────────────
const tg = window.Telegram && window.Telegram.WebApp;

(function initTWA() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  applyTelegramTheme();
  const user = tg.initDataUnsafe && tg.initDataUnsafe.user;
  if (user) {
    const name = user.first_name + (user.last_name ? ' ' + user.last_name : '');
    const el = document.getElementById('tg-username');
    if (el) el.textContent = name;
  }
  tg.onEvent('themeChanged', applyTelegramTheme);
})();

function applyTelegramTheme() {
  if (!tg || !tg.themeParams) return;
  const p = tg.themeParams;
  const r = document.documentElement.style;
  if (p.bg_color)           r.setProperty('--background', p.bg_color);
  if (p.secondary_bg_color) r.setProperty('--card',       p.secondary_bg_color);
  if (p.secondary_bg_color) r.setProperty('--muted',      hexAlpha(p.secondary_bg_color, 0.7));
  if (p.text_color)         r.setProperty('--foreground', p.text_color);
  if (p.hint_color)         r.setProperty('--muted-fg',   p.hint_color);
  if (p.button_color)       r.setProperty('--primary',    p.button_color);
  if (p.button_color)       r.setProperty('--accent',     p.button_color);
  if (p.bg_color)           r.setProperty('--input-bg',   hexAlpha(p.bg_color, 0.8));
}

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function haptic(style) {
  if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style || 'light');
}

function showMainButton(text, data) {
  if (!tg || !tg.MainButton) return;
  tg.MainButton.setText(text);
  tg.MainButton.show();
  tg.MainButton.onClick(function handler() {
    tg.MainButton.offClick(handler);
    tg.sendData(JSON.stringify(data));
  });
}

function hideMainButton() {
  if (tg && tg.MainButton) tg.MainButton.hide();
}

// ── NAVIGATION ────────────────────────────────────────────
function goPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  btn.classList.add('active');
  document.querySelector('.app').scrollTop = 0;
  hideMainButton();
  haptic('light');
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
const ri = (l, v, c='') => `<div class="result-item"><div class="ri-label">${l}</div><div class="ri-val ${c}">${v}</div></div>`;

// ── УГЛОВЫЕ НЕВЯЗКИ ───────────────────────────────────────
let arMode = 'dms'; // 'dms' | 'm'

function switchArMode(mode, btn) {
  arMode = mode;
  document.querySelectorAll('#page-residuals .card .seg-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#page-residuals .card .tab-pane').forEach(p => p.classList.remove('active'));
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
  if (totalSec < 60) return totalSec + '″';
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
  if (v.length < 2) { alert('Введите хотя бы 2 значения'); return; }
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
      <span class="check-icon">${c1?'✅':'❌'}</span>
      <div><strong>Симметрия (М[Δ]≈0)</strong>Среднее = ${arFmt(avg,1)} — ${c1?'ВЫПОЛНЯЕТСЯ':'НЕ ВЫПОЛНЯЕТСЯ'}</div>
    </div>
    <div class="check-item ${c2?'check-pass':'check-fail'}">
      <span class="check-icon">${c2?'✅':'❌'}</span>
      <div><strong>Ограниченность</strong>Δ_пред=${formatSKP(dp,isM)}; выбросов: ${out} — ${c2?'ВЫПОЛНЯЕТСЯ':'НЕ ВЫПОЛНЯЕТСЯ'}</div>
    </div>
    <div class="check-item ${c3?'check-pass':'check-fail'}">
      <span class="check-icon">${c3?'✅':'❌'}</span>
      <div><strong>Взаимное уничтожение</strong>+:${posN} / −:${negN} — ${c3?'ВЫПОЛНЯЕТСЯ':'НЕ ВЫПОЛНЯЕТСЯ'}</div>
    </div>
    <div class="check-item check-neutral">
      <span class="check-icon">ℹ️</span>
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
    <div class="step"><strong>4. Контроль</strong> Σv_i должно быть 0 (следствие определения v_i).<div class="step-f">Σv_i = ${fnSmart(sumV,10)} ${sumV===0?'✓':' (проверьте ввод)'}</div></div>
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

  showMainButton('📤 Отправить результат боту', {
    type: 'angular_residuals',
    n, m: fnSmart(m,4), mm: fnSmart(mm,4), dp: fnSmart(dp,4), unit: uShort
  });
}

// ── НИВЕЛИРНЫЙ ХОД ───────────────────────────────────────
function calcLev() {
  haptic('medium');
  const HA = +document.getElementById('lev-ha').value;
  const HB = +document.getElementById('lev-hb').value;
  const hv = pn(document.getElementById('lev-h').value);
  let dv   = pn(document.getElementById('lev-d').value);
  const cls = document.getElementById('lev-cls').value;
  if (!hv.length) { alert('Введите превышения'); return; }
  if (dv.length !== hv.length) dv = new Array(hv.length).fill(1);
  const sumH = hv.reduce((a,b) => a+b, 0);
  const sumD = dv.reduce((a,b) => a+b, 0);
  if (!sumD || !isFinite(sumD)) { alert('Сумма длин секций должна быть положительной'); return; }
  const fh   = sumH - (HB - HA);
  const k    = cls==='3' ? 5 : cls==='4' ? 10 : 50;
  const fdop = k * Math.sqrt(sumD);
  const ok   = Math.abs(fh*1000) <= fdop;
  const corr = dv.map(d => -fh*d/sumD);
  const adjH = hv.map((h,i) => h + corr[i]);

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
    rows += `<tr><td>${i+1}</td><td>${fsSmart(hv[i],4)}</td><td>${fnSmart(corr[i]*1000,1)} мм</td><td>${fsSmart(h,4)}</td><td class="td-hi">${fnSmart(H,4)}</td></tr>`;
  });
  document.getElementById('lev-tbl').innerHTML =
    `<table class="dt"><thead><tr><th>Тч</th><th>h_i</th><th>Попр.</th><th>h_исп</th><th>H (м)</th></tr></thead><tbody>${rows}</tbody></table>`;
  document.getElementById('lev-result').classList.remove('hidden');

  showMainButton('📤 Отправить результат боту', {
    type: 'leveling', fh_mm: fnSmart(fh*1000,1), fdop_mm: fnSmart(fdop,1), ok
  });
}

// ── ТЕОДОЛИТНЫЙ ХОД ──────────────────────────────────────
function calcTh() {
  haptic('medium');
  const a0 = +document.getElementById('th-a0').value;
  const an = +document.getElementById('th-an').value;
  const x0 = +document.getElementById('th-x0').value, y0 = +document.getElementById('th-y0').value;
  const xn = +document.getElementById('th-xn').value, yn = +document.getElementById('th-yn').value;
  const ang = pn(document.getElementById('th-ang').value);
  const sid = pn(document.getElementById('th-sides').value);
  if (!ang.length || !sid.length) { alert('Введите углы и стороны'); return; }
  const n = ang.length;
  const sumB = ang.reduce((a,b) => a+b, 0);
  const thSum = a0 - an + n*180;
  const fbDeg = sumB - thSum;
  const fdop  = Math.sqrt(n);
  const fb    = fbDeg * 60;
  const dBDeg = -fbDeg / n;
  const adjA  = ang.map(a => a + dBDeg);
  const alphas = [a0];
  adjA.forEach(b => {
    let a = alphas[alphas.length-1] - b + 180;
    while (a < 0)   a += 360;
    while (a >= 360) a -= 360;
    alphas.push(a);
  });
  const R  = Math.PI / 180;
  const dX = sid.map((d,i) => d * Math.cos(alphas[i]*R));
  const dY = sid.map((d,i) => d * Math.sin(alphas[i]*R));
  const sumD = sid.reduce((a,b) => a+b, 0);
  const fx = dX.reduce((a,b) => a+b, 0) - (xn-x0);
  const fy = dY.reduce((a,b) => a+b, 0) - (yn-y0);
  if (!sumD || !isFinite(sumD)) { alert('Сумма сторон должна быть положительной'); return; }
  const fss = Math.sqrt(fx*fx + fy*fy);
  const T   = fss / sumD;
  const cx  = sid.map(d => -fx*d/sumD);
  const cy  = sid.map(d => -fy*d/sumD);

  const fbStr = formatDMS(fb * 60);
  document.getElementById('th-main').innerHTML =
    ri('f_β', fbStr, Math.abs(fb)>fdop?'r':'') +
    ri('Допуск ±1′√n', '±'+fnSmart(fdop,2)+'′') +
    ri('Угл. невязка', Math.abs(fb)<=fdop?'✓ НОРМА':'✗ ПРЕВЫШЕН', Math.abs(fb)<=fdop?'g':'r') +
    ri('f_s (м)', fnSmart(fss,4), 'o') +
    ri('1/T', Math.round(1/T), 'g') +
    ri('Σ длин', fnSmart(sumD,3)+' м');

  let rows = '', cx2 = x0, cy2 = y0;
  rows += `<tr><td class="td-hi">Н</td><td>—</td><td>—</td><td>—</td><td class="td-hi">${fnSmart(x0,3)}</td><td class="td-hi">${fnSmart(y0,3)}</td></tr>`;
  sid.forEach((_,i) => {
    cx2 += dX[i]+cx[i]; cy2 += dY[i]+cy[i];
    rows += `<tr><td>${i+1}</td><td>${fnSmart(alphas[i],2)}°</td><td>${fnSmart(sid[i],2)}</td><td>${fsSmart(dX[i]+cx[i],3)}</td><td class="td-hi">${fnSmart(cx2,3)}</td><td class="td-hi">${fnSmart(cy2,3)}</td></tr>`;
  });
  document.getElementById('th-tbl').innerHTML =
    `<table class="dt"><thead><tr><th>Тч</th><th>α(°)</th><th>d(м)</th><th>ΔX</th><th>X</th><th>Y</th></tr></thead><tbody>${rows}</tbody></table>`;
  document.getElementById('th-result').classList.remove('hidden');

  showMainButton('📤 Отправить результат боту', {
    type: 'theodolite', fb_min: fnSmart(fb,2), fs_m: fnSmart(fss,4), rel: Math.round(1/T)
  });
}

// ── ПРЯМАЯ / ОБРАТНАЯ ─────────────────────────────────────
function calcFwd() {
  const x1 = +document.getElementById('fx1').value || 0;
  const y1 = +document.getElementById('fy1').value || 0;
  const a  = +document.getElementById('fa').value  || 0;
  const d  = +document.getElementById('fd').value  || 0;
  const r  = a * Math.PI / 180;
  document.getElementById('fwd-x2').textContent = fn(x1 + d*Math.cos(r), 4) + ' м';
  document.getElementById('fwd-y2').textContent = fn(y1 + d*Math.sin(r), 4) + ' м';
}

function calcInv() {
  const x1 = +document.getElementById('ix1').value || 0;
  const y1 = +document.getElementById('iy1').value || 0;
  const x2 = +document.getElementById('ix2').value || 0;
  const y2 = +document.getElementById('iy2').value || 0;
  const dx = x2-x1, dy = y2-y1;
  const dist = Math.sqrt(dx*dx + dy*dy);
  let al = Math.atan2(dy, dx) * 180 / Math.PI;
  if (al < 0) al += 360;
  let totalSec = Math.round(al * 3600);
  if (totalSec >= 360*3600) totalSec = 0;
  document.getElementById('inv-a').textContent = formatDMS(totalSec);
  document.getElementById('inv-d').textContent = fn(dist, 4) + ' м';
}

// ── ВЕРОЯТНОСТИ ───────────────────────────────────────────
function phi(x) {
  const t = x / Math.sqrt(2);
  let s = 0, tm = t, sg = 1;
  for (let k = 0; k < 80; k++) {
    s += sg * tm / (2*k+1);
    tm *= t*t / (k+1);
    sg *= -1;
  }
  return s / Math.sqrt(Math.PI/2) * 0.5;
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
  const lines = document.getElementById('wt-in').value.trim().split('\n');
  const data  = lines.map(l => {
    const p = l.replace(/[;,\s]+/g,' ').trim().split(/\s+/);
    return { l: parseFloat(p[0]), p: parseFloat(p[1]) || 1 };
  }).filter(d => !isNaN(d.l));
  if (data.length < 2) { alert('Введите хотя бы 2 строки'); return; }
  const sp  = data.reduce((a,d) => a+d.p, 0);
  const spl = data.reduce((a,d) => a+d.p*d.l, 0);
  if (!sp || !isFinite(sp) || sp <= 1) { alert('Сумма весов должна быть больше 1 (для оценки СКП)'); return; }
  const mean = spl / sp;
  const v    = data.map(d => d.l - mean);
  const spv2 = data.reduce((a,d,i) => a+d.p*v[i]*v[i], 0);
  const mu   = Math.sqrt(spv2 / (sp-1));
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
    `<span class="hi2">μ</span>=√(${fnSmart(spv2,4)}/${fnSmart(sp-1,2)})=±${fnSmart(mu,5)}<br>` +
    `<span class="hi">m_x̄</span>=±${fnSmart(mx,5)}`;
  document.getElementById('wt-result').classList.remove('hidden');

  showMainButton('📤 Отправить результат боту', {
    type: 'weighted', mean: fnSmart(mean,5), mu: fnSmart(mu,5), mx: fnSmart(mx,5)
  });
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
function vedToggleType() {
  const t = document.getElementById('ved-type').value;
  document.getElementById('ved-open-fields').style.display = t==='open' ? 'block' : 'none';
  const lbl = document.getElementById('ved-a0-label');
  if (lbl) lbl.textContent = t === 'open'
    ? 'α нач — дирекц. угол исходного направления (ГГ ММ СС)'
    : 'α нач — дирекц. угол первой стороны (ГГ ММ СС)';
}

function parseDeg(s) {
  s = String(s).trim().replace(/[°°'′″"]/g,' ').replace(/\s+/g,' ').trim();
  const parts = s.split(' ').map(Number).filter(v => !isNaN(v));
  if (!parts.length) return NaN;
  const sign = parts[0]<0 ? -1 : 1, a = Math.abs(parts[0]);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return sign*(a + parts[1]/60);
  return sign*(a + parts[1]/60 + parts[2]/3600);
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
  document.getElementById('ved-x0').value = '1000.00';
  document.getElementById('ved-y0').value = '1000.00';
  document.getElementById('ved-a0').value = '0 00 00';
  document.getElementById('ved-ang').value   = '89 59 10\n90 00 40\n89 58 50\n90 01 40';
  document.getElementById('ved-sides').value = '200.00\n150.00\n200.00\n150.00';
  calcVed();
}

function calcVed() {
  haptic('medium');
  const type = document.getElementById('ved-type').value;
  const x0 = +document.getElementById('ved-x0').value;
  const y0 = +document.getElementById('ved-y0').value;
  const a0 = parseDeg(document.getElementById('ved-a0').value);
  if (isNaN(a0)) { alert('Некорректный начальный дирекционный угол'); return; }

  const ang = document.getElementById('ved-ang').value.trim().split('\n')
    .map(l => parseDeg(l.trim())).filter(v => !isNaN(v));
  const sid = document.getElementById('ved-sides').value.trim().split('\n')
    .map(l => parseFloat(l.trim())).filter(v => !isNaN(v));
  if (!ang.length || !sid.length) { alert('Введите углы и стороны'); return; }
  if (ang.length !== sid.length) { alert('Количество углов ('+ang.length+') ≠ количество сторон ('+sid.length+')'); return; }

  const n = ang.length, R = Math.PI/180;
  const bSum = ang.reduce((a,b) => a+b, 0);

  // Теоретическая сумма — ближайшее к измеренной
  let bTheor;
  if (type === 'closed') {
    const k = Math.round((bSum - n*180) / 360);
    bTheor = n*180 + k*360;
  } else {
    const an = parseDeg(document.getElementById('ved-an').value);
    if (isNaN(an)) { alert('Некорректный конечный дирекционный угол'); return; }
    const base = a0 - an + n*180;
    const k = Math.round((bSum - base) / 360);
    bTheor = base + k*360;
  }

  const fBetaDeg = bSum - bTheor;
  const fBetaSec = fBetaDeg * 3600;
  const fBetaMin = fBetaDeg * 60;
  const fdopMin  = Math.sqrt(n);
  const angOk    = Math.abs(fBetaMin) <= fdopMin;

  const dBetaDeg = -fBetaDeg / n;
  const dBetaSec = dBetaDeg * 3600;
  const adjAng   = ang.map(b => b + dBetaDeg);
  // dirOff=1 для разомкнутого: α₀ — исходное направление (засечка), первая сторона использует alphas[1]
  const dirOff   = type === 'open' ? 1 : 0;

  const alphas = [a0];
  for (let i = 0; i < n; i++) alphas.push(norm360(alphas[alphas.length-1] - adjAng[i] + 180));

  const dX = sid.map((d,i) => d * Math.cos(alphas[i+dirOff]*R));
  const dY = sid.map((d,i) => d * Math.sin(alphas[i+dirOff]*R));
  const sumD = sid.reduce((a,b) => a+b, 0);

  let fx, fy;
  if (type === 'closed') {
    fx = dX.reduce((a,b) => a+b, 0);
    fy = dY.reduce((a,b) => a+b, 0);
  } else {
    const xn = +document.getElementById('ved-xn').value;
    const yn = +document.getElementById('ved-yn').value;
    fx = dX.reduce((a,b) => a+b, 0) - (xn-x0);
    fy = dY.reduce((a,b) => a+b, 0) - (yn-y0);
  }
  const fs = Math.sqrt(fx*fx + fy*fy);
  if (!sumD || !isFinite(sumD)) { alert('Сумма сторон должна быть положительной'); return; }
  const T = fs / sumD;
  const linOk = T < 1/1000;

  const vx = sid.map(d => -fx*d/sumD);
  const vy = sid.map(d => -fy*d/sumD);

  const coords = [[x0,y0]];
  for (let i = 0; i < n; i++) coords.push([coords[i][0]+dX[i]+vx[i], coords[i][1]+dY[i]+vy[i]]);

  document.getElementById('ved-main').innerHTML =
    ri('f_β (″)', fnSmart(fBetaSec,1), angOk?'':'r') +
    ri('Допуск ±1′√n', '±'+fnSmart(fdopMin,2)+'′', 'o') +
    ri('Угл. невязка', angOk?'✓ НОРМА':'✗ ПРЕВЫШЕН', angOk?'g':'r') +
    ri('f_s (м)', fnSmart(fs,4), 'o') +
    ri('1/T', isFinite(T)&&T>0 ? '1:'+Math.round(1/T) : '—', linOk?'g':'r') +
    ri('Σ длин', fnSmart(sumD,3)+' м') +
    ri('δβ на угол', fnSmart(dBetaSec,1)+'″', 'p') +
    ri('n точек', n);

  document.getElementById('ved-checks').innerHTML = `
    <div class="check-item ${angOk?'check-pass':'check-fail'}">
      <span class="check-icon">${angOk?'✅':'❌'}</span>
      <div><strong>Угловая невязка</strong>f_β = ${fnSmart(fBetaSec,1)}″ | Допуск ±${fnSmart(fdopMin,2)}′ — ${angOk?'НОРМА':'ПРЕВЫШЕНА'}</div>
    </div>
    <div class="check-item ${linOk?'check-pass':'check-fail'}">
      <span class="check-icon">${linOk?'✅':'❌'}</span>
      <div><strong>Линейная невязка</strong>f_s = ${fnSmart(fs,4)} м | 1:${isFinite(T)&&T>0?Math.round(1/T):'∞'} — ${linOk?'НОРМА':'ПРЕВЫШЕНА'}</div>
    </div>`;

  const sdX = dX.reduce((a,b) => a+b, 0);
  const sdY = dY.reduce((a,b) => a+b, 0);
  const closedLabel = (type === 'closed');
  const thFormula = closedLabel
    ? `Σβ_теор = (n±k)·180°, ближайшее к Σβ_изм = <strong>${fnSmart(n)}·180 + (${Math.round((bSum-n*180)/360)})·360 = ${fnSmart(bTheor,4)}°</strong>`
    : `Σβ_теор = α₀ − αₙ + n·180° = ${fn(parseDeg(document.getElementById('ved-a0').value),4)} − ${fn(parseDeg(document.getElementById('ved-an').value),4)} + ${n}·180 ≈ <strong>${fnSmart(bTheor,4)}°</strong>`;

  let dirRows = '';
  dirRows += `<div class="step"><strong>α₀ = ${fmtDeg(a0)}</strong> — ${type === 'open' ? 'дирекционный угол <u>исходного направления</u> (засечки, не стороны хода)' : 'дирекционный угол <u>первой стороны</u> (задан)'}</div>`;
  for (let i = 0; i < n; i++) {
    dirRows += `<div class="step"><strong>α${i+1} = α${i} − β${i+1}(испр.) + 180°</strong>
      <div class="step-f">${fmtDeg(alphas[i])} − ${fmtDegR(adjAng[i])} + 180° = <strong>${fmtDeg(alphas[i+1])}</strong>${i===n-1?(closedLabel?' ← должно = α₀':''):''}</div></div>`;
  }

  let bowRows = '';
  for (let i = 0; i < n; i++) {
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
          <div class="ar-annot-why">Складываем все введённые правые углы.</div>
        </div>
        <div class="ar-annot-item">
          <strong>Теоретическая сумма</strong>
          <div class="ar-annot-f">${thFormula}</div>
          <div class="ar-annot-why">${closedLabel?'Для замкнутого хода выбираем значение n·180°±k·360°, ближайшее к Σβ_изм. Для стандартных правых углов (~90°–180°) обычно k = −1 при n·180° > Σβ_изм.':'Для разомкнутого: формула через начальный и конечный дирекционные углы.'}</div>
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
          <div class="ar-annot-f">α_{i+1} = α_i − β_{испр} + 180°</div>
          <div class="ar-annot-why">Каждый дирекционный угол следующей стороны = предыдущий минус исправленный угол плюс 180°. Результат нормализуем в [0°, 360°). Для замкнутого хода α_n должно совпасть с α₀.</div>
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
          <div class="ar-annot-f">Относительная точность: 1/T = Σd/f_s = ${fnSmart(sumD,2)}/${fnSmart(fs,4)} = <strong>1:${isFinite(T)&&T>0?Math.round(1/T):'∞'}</strong></div>
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
  for (let i = 0; i < n; i++) {
    cr += `<tr><td class="td-hi">${i+1}</td><td>${fnSmart(sid[i],2)}</td><td>${fsSmart(dX[i],3)}</td><td>${vx[i]>=0?'+':''}${fnSmart(vx[i]*1000,1)}мм</td><td>${fsSmart(dX[i]+vx[i],3)}</td><td>${fsSmart(dY[i],3)}</td><td>${vy[i]>=0?'+':''}${fnSmart(vy[i]*1000,1)}мм</td><td class="td-hi">${fn(coords[i+1][0],3)}</td><td class="td-hi">${fn(coords[i+1][1],3)}</td></tr>`;
  }
  cr += `<tr style="color:var(--accent);font-weight:600"><td>Σ</td><td>${fnSmart(sumD,2)}</td><td>${fsSmart(sdX,3)}</td><td>${(-fx*1000>=0?'+':'')}${fnSmart(-fx*1000,1)}мм</td><td>${fsSmart(sdX-fx,3)}</td><td>${fsSmart(sdY,3)}</td><td>${(-fy*1000>=0?'+':'')}${fnSmart(-fy*1000,1)}мм</td><td>—</td><td>—</td></tr>`;
  document.getElementById('ved-coord-tbl').innerHTML =
    `<table class="dt"><thead><tr><th>№</th><th>d(м)</th><th>ΔX</th><th>vΔX</th><th>ΔX′</th><th>ΔY</th><th>vΔY</th><th>X</th><th>Y</th></tr></thead><tbody>${cr}</tbody></table>`;

  document.getElementById('ved-result').classList.remove('hidden');

  showMainButton('📤 Отправить результат боту', {
    type: 'coordinate_schedule',
    fb_sec: fnSmart(fBetaSec,1), fs_m: fnSmart(fs,4),
    rel: isFinite(T)&&T>0 ? Math.round(1/T) : null,
    ang_ok: angOk, lin_ok: linOk,
    coords: coords.map(c => ({ x: fn(c[0],3), y: fn(c[1],3) }))
  });
}

// ── INIT ──────────────────────────────────────────────────
window.onload = () => { buildLaplace(); calcProb(); calcLim(); calcFwd(); calcInv(); };
