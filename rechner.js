/**
 * KI-Kostenrechner – rechner.js
 * Jonas Keil | https://www.youtube.com/@JonasKeil
 *
 * Use Case "Fragen & Antworten":
 *   Input  = fragenWoerter × 1,3 Tokens
 *   Output = Input × 2
 *
 * Use Case "Programmieren":
 *   Input  = 10.000 (Basis) + codebaseTokens
 *   Output = 2.000 + codebaseTokens × 0,5
 */

// ── Inline-Fallback ────────────────────────────────────────────────────────────
const FALLBACK_MODELLE = [
  { name: "GPT-5.4 Pro",         anbieter: "OpenAI",    input_pro_1m_token: 30.00, output_pro_1m_token: 180.00, kontext_fenster: "1M",    intelligence_score: 57,   stand: "2026-03" },
  { name: "GPT-5.4",             anbieter: "OpenAI",    input_pro_1m_token:  2.50, output_pro_1m_token:  20.00, kontext_fenster: "1M",    intelligence_score: 57,   stand: "2026-03" },
  { name: "GPT-5",               anbieter: "OpenAI",    input_pro_1m_token:  1.25, output_pro_1m_token:  10.00, kontext_fenster: "400k",  intelligence_score: null, stand: "2026-03" },
  { name: "Claude Opus 4.6",     anbieter: "Anthropic", input_pro_1m_token:  5.00, output_pro_1m_token:  25.00, kontext_fenster: "1M",    intelligence_score: 53,   stand: "2026-03" },
  { name: "Claude Sonnet 4.6",   anbieter: "Anthropic", input_pro_1m_token:  3.00, output_pro_1m_token:  15.00, kontext_fenster: "1M",    intelligence_score: 52,   stand: "2026-03" },
  { name: "Claude Haiku 4.5",    anbieter: "Anthropic", input_pro_1m_token:  1.00, output_pro_1m_token:   5.00, kontext_fenster: "200k",  intelligence_score: null, stand: "2026-03" },
  { name: "Gemini 3.1 Pro",      anbieter: "Google",    input_pro_1m_token:  2.00, output_pro_1m_token:  12.00, kontext_fenster: "200k",  intelligence_score: 57,   stand: "2026-03" },
  { name: "Gemini 3.1 Flash-Lite",anbieter: "Google",   input_pro_1m_token:  0.25, output_pro_1m_token:   1.50, kontext_fenster: "1M",    intelligence_score: null, stand: "2026-03" }
];

// ── State ──────────────────────────────────────────────────────────────────────
let modelle        = [];
let useCase        = 'fragen';

// Fragen-Parameter
let anfragenProTag = 35;
let woerterAnfrage = 300;

// Programmieren-Parameter
let codebaseTokens = 25000;
let intensitaet    = 30;

// ── DOM refs ───────────────────────────────────────────────────────────────────
const tbody             = document.getElementById('ergebnis-tbody');
const inputsFragen      = document.getElementById('inputs-fragen');
const inputsProgrammieren = document.getElementById('inputs-programmieren');

// ── Token-Berechnung ───────────────────────────────────────────────────────────
function berechneTokens() {
  if (useCase === 'programmieren') {
    const BASE = 10000;
    return {
      inputTokens:  BASE + codebaseTokens,
      outputTokens: 2000 + codebaseTokens * 0.5
    };
  }
  // Fragen & Antworten
  const inputTokens = woerterAnfrage * 1.3;
  return {
    inputTokens,
    outputTokens: inputTokens * 2
  };
}

function getAnfragenProTag() {
  return useCase === 'programmieren' ? intensitaet : anfragenProTag;
}

// ── Kosten/Tag ─────────────────────────────────────────────────────────────────
function berechneTageskosten(modell, inputTokens, outputTokens, anfragen) {
  const kosten = (inputTokens  * modell.input_pro_1m_token +
                  outputTokens * modell.output_pro_1m_token) / 1_000_000;
  return kosten * anfragen;
}

// ── Formatierung ───────────────────────────────────────────────────────────────
function formatKosten(betrag) {
  if (betrag < 0.01) return '< 0,01\u202f\u20ac';
  return betrag.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + '\u202f\u20ac';
}

// ── DOM-Helfer ─────────────────────────────────────────────────────────────────
function createTd(text, cssClass) {
  const td = document.createElement('td');
  td.textContent = text;
  if (cssClass) td.className = cssClass;
  return td;
}

function createScoreTd(score) {
  const td = document.createElement('td');
  td.className = 'col-score';
  if (score === null || score === undefined) {
    const dash = document.createElement('span');
    dash.className = 'score-na';
    dash.textContent = '\u2013';
    dash.title = 'Noch nicht von Artificial Analysis indexiert';
    td.appendChild(dash);
    return td;
  }
  const MAX_SCORE = 60;
  const pct = Math.min(100, Math.round((score / MAX_SCORE) * 100));
  const wrapper = document.createElement('div');
  wrapper.className = 'score-wrapper';
  const num = document.createElement('span');
  num.className = 'score-num';
  num.textContent = score;
  wrapper.appendChild(num);
  const barBg = document.createElement('div');
  barBg.className = 'score-bar-bg';
  const fill = document.createElement('div');
  fill.className = 'score-bar-fill';
  fill.style.width = pct + '%';
  barBg.appendChild(fill);
  wrapper.appendChild(barBg);
  td.appendChild(wrapper);
  return td;
}

// ── Tabelle rendern ────────────────────────────────────────────────────────────
function aktualisiereTabelle() {
  const { inputTokens, outputTokens } = berechneTokens();
  const anfragen = getAnfragenProTag();

  const ergebnisse = modelle.map(function(modell) {
    const taeglich = berechneTageskosten(modell, inputTokens, outputTokens, anfragen);
    return { modell, taeglich, monatlich: taeglich * 30, jaehrlich: taeglich * 365 };
  });

  ergebnisse.sort(function(a, b) { return a.taeglich - b.taeglich; });

  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

  ergebnisse.forEach(function(eintrag, index) {
    const { modell, taeglich, monatlich, jaehrlich } = eintrag;
    const tr = document.createElement('tr');
    if (index === 0) tr.classList.add('cheapest');

    tr.appendChild(createTd(modell.name,            'col-modell'));
    tr.appendChild(createTd(modell.anbieter,         'col-anbieter'));
    tr.appendChild(createScoreTd(modell.intelligence_score));
    tr.appendChild(createTd(formatKosten(taeglich),  'col-kosten'));
    tr.appendChild(createTd(formatKosten(monatlich), 'col-kosten'));
    tr.appendChild(createTd(formatKosten(jaehrlich), 'col-kosten'));
    tr.appendChild(createTd(modell.kontext_fenster,  'col-kontext'));

    tbody.appendChild(tr);
  });
}

// ── Use-Case-Anzeige umschalten ────────────────────────────────────────────────
function switchUseCase(uc) {
  useCase = uc;
  if (uc === 'programmieren') {
    inputsFragen.classList.add('hidden');
    inputsProgrammieren.classList.remove('hidden');
  } else {
    inputsProgrammieren.classList.add('hidden');
    inputsFragen.classList.remove('hidden');
  }
  aktualisiereTabelle();
}

// ── Button-Gruppe ──────────────────────────────────────────────────────────────
function initOptionGroup(groupId, onChange) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.addEventListener('click', function(e) {
    const btn = e.target.closest('.option-btn');
    if (!btn) return;
    group.querySelectorAll('.option-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    onChange(Number(btn.dataset.value));
    aktualisiereTabelle();
  });
}

// ── Initialisierung ────────────────────────────────────────────────────────────
async function init() {
  try {
    const response = await fetch('data/modelle.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const parsed = await response.json();
    if (!Array.isArray(parsed)) throw new Error('Unerwartetes JSON-Format');
    modelle = parsed.filter(function(m) {
      return (
        typeof m.name === 'string' &&
        typeof m.anbieter === 'string' &&
        typeof m.input_pro_1m_token  === 'number' && isFinite(m.input_pro_1m_token) &&
        typeof m.output_pro_1m_token === 'number' && isFinite(m.output_pro_1m_token)
      );
    });
  } catch (err) {
    console.warn('fetch() fehlgeschlagen, nutze Fallback-Daten:', err.message);
    modelle = FALLBACK_MODELLE;
  }

  // Use-Case-Toggle
  const useCaseToggle = document.getElementById('use-case-toggle');
  if (useCaseToggle) {
    useCaseToggle.addEventListener('click', function(e) {
      const btn = e.target.closest('.use-case-btn');
      if (!btn) return;
      useCaseToggle.querySelectorAll('.use-case-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      switchUseCase(btn.dataset.case);
    });
  }

  // Fragen-Parameter
  initOptionGroup('group-anfragen', function(val) { anfragenProTag = val; });
  initOptionGroup('group-laenge',   function(val) { woerterAnfrage = val; });

  // Programmieren-Parameter
  initOptionGroup('group-codebase',    function(val) { codebaseTokens = val; });
  initOptionGroup('group-intensitaet', function(val) { intensitaet    = val; });

  aktualisiereTabelle();
}

document.addEventListener('DOMContentLoaded', init);
