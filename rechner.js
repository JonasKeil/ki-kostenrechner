/**
 * KI-Kostenrechner – rechner.js
 * Jonas Keil | https://www.youtube.com/@JonasKeil
 *
 * Token-Formel: Woerter x 1,3 = Tokens
 * Kosten/Tag:   (inputTokens x inputPreis + outputTokens x outputPreis) / 1.000.000 x Anfragen
 * Monat = x 30 | Jahr = x 365
 */

// ── Inline-Fallback: wird genutzt wenn fetch() auf file:// scheitert ──────────
const FALLBACK_MODELLE = [
  {
    name: "GPT-5.4",
    anbieter: "OpenAI",
    input_pro_1m_token: 2.50,
    output_pro_1m_token: 20.00,
    kontext_fenster: "1M",
    staerken: "Deep-Horizon Reasoning, Multimodal",
    stand: "2026-03"
  },
  {
    name: "GPT-5",
    anbieter: "OpenAI",
    input_pro_1m_token: 1.25,
    output_pro_1m_token: 10.00,
    kontext_fenster: "400k",
    staerken: "Vielseitig, starke Basisleistung",
    stand: "2026-03"
  },
  {
    name: "Claude Opus 4.6",
    anbieter: "Anthropic",
    input_pro_1m_token: 5.00,
    output_pro_1m_token: 25.00,
    kontext_fenster: "1M",
    staerken: "Agent-Teams, Adaptive Thinking",
    stand: "2026-03"
  },
  {
    name: "Claude Sonnet 4.6",
    anbieter: "Anthropic",
    input_pro_1m_token: 3.00,
    output_pro_1m_token: 15.00,
    kontext_fenster: "1M",
    staerken: "Coding, lange Dokumente",
    stand: "2026-03"
  },
  {
    name: "Gemini 3.1 Pro",
    anbieter: "Google",
    input_pro_1m_token: 2.00,
    output_pro_1m_token: 12.00,
    kontext_fenster: "200k",
    staerken: "Video & Audio nativ, Multimodal",
    stand: "2026-03"
  },
  {
    name: "Gemini 2.5 Flash",
    anbieter: "Google",
    input_pro_1m_token: 0.15,
    output_pro_1m_token: 0.60,
    kontext_fenster: "1M",
    staerken: "Bestes Preis-Leistungs-Verhältnis",
    stand: "2026-03"
  }
];

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

/**
 * Formatiert einen Kostenbetrag im deutschen Format.
 * Unter 0,01 EUR wird "< 0,01 EUR" ausgegeben.
 */
function formatKosten(betrag) {
  if (betrag < 0.01) return "< 0,01\u202f\u20ac";
  return betrag.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + "\u202f\u20ac";
}

/**
 * Berechnet die taeglichen Kosten fuer ein Modell.
 */
function berechneTageskosten(modell, inputTokens, outputTokens, anfragenProTag) {
  const inputKosten = (inputTokens * modell.input_pro_1m_token) / 1_000_000;
  const outputKosten = (outputTokens * modell.output_pro_1m_token) / 1_000_000;
  return (inputKosten + outputKosten) * anfragenProTag;
}

/**
 * Erstellt eine Tabellenzelle mit reinem Textinhalt.
 */
function createTd(text, cssClass) {
  const td = document.createElement("td");
  td.textContent = text;
  if (cssClass) td.className = cssClass;
  return td;
}

// ── Globaler Modell-Datensatz ─────────────────────────────────────────────────
let modelle = [];

// ── DOM-Referenzen ────────────────────────────────────────────────────────────
const sliderAnfragen    = document.getElementById("slider-anfragen");
const numAnfragen       = document.getElementById("num-anfragen");
const sliderWoerterIn   = document.getElementById("slider-woerter-anfrage");
const numWoerterIn      = document.getElementById("num-woerter-anfrage");
const sliderWoerterOut  = document.getElementById("slider-woerter-antwort");
const numWoerterOut     = document.getElementById("num-woerter-antwort");
const tbody             = document.getElementById("ergebnis-tbody");

// ── Slider <-> Zahlenfeld synchronisieren ────────────────────────────────────
function syncInputs(slider, num) {
  slider.addEventListener("input", () => {
    num.value = slider.value;
    aktualisiereTabelle();
  });
  num.addEventListener("input", () => {
    // Wert auf gueltige Range begrenzen
    let val = parseInt(num.value, 10);
    if (isNaN(val)) return;
    val = Math.max(Number(slider.min), Math.min(Number(slider.max), val));
    slider.value = val;
    num.value = val;
    aktualisiereTabelle();
  });
}

// ── Tabelle rendern ───────────────────────────────────────────────────────────
function aktualisiereTabelle() {
  const anfragenProTag  = parseInt(sliderAnfragen.value, 10);
  const woerterAnfrage  = parseInt(sliderWoerterIn.value, 10);
  const woerterAntwort  = parseInt(sliderWoerterOut.value, 10);

  // Token-Berechnung: 1 Wort ca. 1,3 Token
  const inputTokens  = woerterAnfrage * 1.3;
  const outputTokens = woerterAntwort * 1.3;

  // Kosten pro Modell berechnen
  const ergebnisse = modelle.map(modell => {
    const taeglich  = berechneTageskosten(modell, inputTokens, outputTokens, anfragenProTag);
    const monatlich = taeglich * 30;
    const jaehrlich = taeglich * 365;
    return { modell, taeglich, monatlich, jaehrlich };
  });

  // Aufsteigend nach Tageskosten sortieren
  ergebnisse.sort((a, b) => a.taeglich - b.taeglich);

  // Alte Tabellenzeilen entfernen
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }

  // Neue Tabellenzeilen einfuegen
  ergebnisse.forEach((eintrag, index) => {
    const { modell, taeglich, monatlich, jaehrlich } = eintrag;
    const tr = document.createElement("tr");
    if (index === 0) tr.classList.add("cheapest");

    tr.appendChild(createTd(modell.name,           "col-modell"));
    tr.appendChild(createTd(modell.anbieter,        "col-anbieter"));
    tr.appendChild(createTd(formatKosten(taeglich), "col-kosten"));
    tr.appendChild(createTd(formatKosten(monatlich),"col-kosten"));
    tr.appendChild(createTd(formatKosten(jaehrlich),"col-kosten"));
    tr.appendChild(createTd(modell.kontext_fenster, "col-kontext"));
    tr.appendChild(createTd(modell.staerken,        "col-staerken"));

    tbody.appendChild(tr);
  });
}

// ── Initialisierung ───────────────────────────────────────────────────────────
async function init() {
  // Modelle laden (mit Fallback fuer file://)
  try {
    const response = await fetch("data/modelle.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const parsed = await response.json();
    if (!Array.isArray(parsed)) throw new Error("Unerwartetes JSON-Format");
    modelle = parsed.filter(m =>
      typeof m.name === 'string' &&
      typeof m.anbieter === 'string' &&
      typeof m.input_pro_1m_token === 'number' && isFinite(m.input_pro_1m_token) &&
      typeof m.output_pro_1m_token === 'number' && isFinite(m.output_pro_1m_token)
    );
  } catch (err) {
    console.warn("fetch() fehlgeschlagen, nutze Fallback-Daten:", err.message);
    modelle = FALLBACK_MODELLE;
  }

  // Slider <-> Zahlenfeld verbinden
  syncInputs(sliderAnfragen,   numAnfragen);
  syncInputs(sliderWoerterIn,  numWoerterIn);
  syncInputs(sliderWoerterOut, numWoerterOut);

  // Erste Berechnung
  aktualisiereTabelle();
}

document.addEventListener("DOMContentLoaded", init);
