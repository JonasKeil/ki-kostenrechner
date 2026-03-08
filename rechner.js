/**
 * KI-Kostenrechner – rechner.js
 * Jonas Keil | https://www.youtube.com/@JonasKeil
 *
 * Token-Formel:   Wörter × 1,3 = Tokens
 * Use Case Fragen:         Output ≈ Input × 2  (konversationell)
 * Use Case Programmieren:  Input += 800 Tokens  (Kontext/System)
 *                          Output ≈ Input × 4   (Code-Output länger)
 */

// ── Inline-Fallback ────────────────────────────────────────────────────────────
const FALLBACK_MODELLE = [
  { name: "GPT-5.4",         anbieter: "OpenAI",     input_pro_1m_token: 2.50,  output_pro_1m_token: 20.00, kontext_fenster: "1M",    intelligence_score: 57,   stand: "2026-03" },
  { name: "GPT-5",           anbieter: "OpenAI",     input_pro_1m_token: 1.25,  output_pro_1m_token: 10.00, kontext_fenster: "400k",  intelligence_score: null, stand: "2026-03" },
  { name: "Claude Opus 4.6", anbieter: "Anthropic",  input_pro_1m_token: 5.00,  output_pro_1m_token: 25.00, kontext_fenster: "1M",    intelligence_score: 53,   stand: "2026-03" },
  { name: "Claude Sonnet 4.6", anbieter: "Anthropic",input_pro_1m_token: 3.00,  output_pro_1m_token: 15.00, kontext_fenster: "1M",    intelligence_score: 52,   stand: "2026-03" },
  { name: "Gemini 3.1 Pro",  anbieter: "Google",     input_pro_1m_token: 2.00,  output_pro_1m_token: 12.00, kontext_fenster: "200k",  intelligence_score: 57,   stand: "2026-03" },
  { name: "Gemini 2.5 Flash",anbieter: "Google",     input_pro_1m_token: 0.15,  output_pro_1m_token: 0.60,  kontext_fenster: "1M",    intelligence_score: null, stand: "2026-03" }
];

// ── State ──────────────────────────────────────────────────────────────────────
let modelle        = [];
let anfragenProTag = 35;
let woerterAnfrage = 300;
let useCase        = 'fragen'; // 'fragen' | 'programmieren'

// ── DOM refs ───────────────────────────────────────────────────────────────────
const tbody       = document.getElementById('ergebnis-tbody');
const useCaseHint = document.getElementById('use-case-hint');

// ── Token-Berechnung (use-case-aware) ─────────────────────────────────────────
function berechneTokens(woerter, uc) {
  const inputBase = woerter * 1.3;
  if (uc === 'programmieren') {
    return {
      inputTokens:  inputBase + 800, // Systemanweisung + Code-Kontext
      outputTokens: inputBase * 4    // Code-Antworten deutlich länger
    };
  }
  // Fragen & Antworten: Antwort ~2× so lang wie Frage
  return {
    inputTokens:  inputBase,
    outputTokens: inputBase * 2
  };
}

// ── Kosten pro Tag ─────────────────────────────────────────────────────────────
function berechneTageskosten(modell, inputTokens, outputTokens, anfragen) {
  const inputKosten  = (inputTokens  * modell.input_pro_1m_token)  / 1_000_000;
  const outputKosten = (outputTokens * modell.output_pro_1m_token) / 1_000_000;
  return (inputKosten + outputKosten) * anfragen;
}

// ── Formatierung ───────────────────────────────────────────────────────────────
function formatKosten(betrag) {
  if (betrag < 0.01) return '< 0,01\u202f\u20ac';
  return betrag.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + '\u202f\u20ac';
}

// ── Tabellenzelle erstellen ────────────────────────────────────────────────────
function createTd(text, cssClass) {
  const td = document.createElement('td');
  td.textContent = text;
  if (cssClass) td.className = cssClass;
  return td;
}

// ── Intelligence-Score-Zelle ───────────────────────────────────────────────────
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
  const { inputTokens, outputTokens } = berechneTokens(woerterAnfrage, useCase);

  const ergebnisse = modelle.map(function(modell) {
    const taeglich = berechneTageskosten(modell, inputTokens, outputTokens, anfragenProTag);
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

// ── Button-Gruppe initialisieren ───────────────────────────────────────────────
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

// ── Use-Case-Toggle initialisieren ────────────────────────────────────────────
function initUseCaseToggle() {
  const container = document.querySelector('.use-case-toggle');
  if (!container) return;
  container.addEventListener('click', function(e) {
    const btn = e.target.closest('.use-case-btn');
    if (!btn) return;
    container.querySelectorAll('.use-case-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    useCase = btn.dataset.case;
    useCaseHint.textContent = useCase === 'programmieren'
      ? 'Code-fokussiert \u2014 +800 Basis-Tokens Kontext, Antwort ca. 4\u00D7 so lang'
      : 'Konversationell \u2014 Antwort ca. 2\u00D7 so lang wie Anfrage';
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

  initOptionGroup('group-anfragen', function(val) { anfragenProTag = val; });
  initOptionGroup('group-laenge',   function(val) { woerterAnfrage = val; });
  initUseCaseToggle();
  aktualisiereTabelle();
}

document.addEventListener('DOMContentLoaded', init);
