// ===============================
// PELVIS AI V3 — CORE ENGINE
// ===============================

// -------- NORMALISATION --------
function normalizePatientData(d) {
  return {
    pain: Number(d.pain || 0),
    topo: Array.isArray(d.topo) ? d.topo : [],
    time: Array.isArray(d.time) ? d.time : [],
    digestif: Array.isArray(d.digestif) ? d.digestif : [],
    diagnostic_echo: Array.isArray(d.diagnostic_echo) ? d.diagnostic_echo : [],

    endo1: !!d.endo1,
    endo2: !!d.endo2,
    endo3: !!d.endo3,
    endo4: !!d.endo4,

    aden1: !!d.aden1,
    aden2: !!d.aden2,

    cong1: !!d.cong1,
    cong2: !!d.cong2,

    pud1: !!d.pud1,
    pud2: !!d.pud2,
    pud3: !!d.pud3,

    opk1: !!d.opk1,
    opk2: !!d.opk2,

    fib1: !!d.fib1,
    fib2: !!d.fib2,

    bloatingEvening: !!d.bloatingEvening || d.ballonnementsSoir === "Oui",

    cycleRegularity: d.cycleRegularity || "",
    painTypePrimary: d.painTypePrimary || "",

    endometriose_pct: Number(d.endometriose_pct || 0),
    adenomyose_pct: Number(d.adenomyose_pct || 0),
    congestion_pct: Number(d.congestion_pct || 0),
    pudendal_pct: Number(d.pudendal_pct || 0),
    opk_pct: Number(d.opk_pct || 0),
    fibrome_pct: Number(d.fibrome_pct || 0),
    hypersensibilisation_pct: Number(d.hypersensibilisation_pct || 0)
  };
}

// -------- FEATURES --------
function computeDerivedFeatures(d) {
  const sum = (...args) => args.filter(Boolean).length;

  return {
    pain_high: d.pain >= 7,
    pain_very_high: d.pain >= 8,

    multi_site_pain: d.topo.length >= 3,
    digestive_present: d.digestif.some(x => x !== "Aucun signe digestif"),

    cyclic_pattern: d.time.includes("Pendant les règles") || d.time.includes("Avant les règles"),

    endo_cluster: sum(d.endo1, d.endo2, d.endo3, d.endo4),
    adeno_cluster: sum(d.aden1, d.aden2),
    congestion_cluster: sum(d.cong1, d.cong2),
    pudendal_cluster: sum(d.pud1, d.pud2, d.pud3),
    opk_cluster: sum(d.opk1, d.opk2),
    fibrome_cluster: sum(d.fib1, d.fib2)
  };
}

// -------- SCORES --------
function computeExpertScores(d, f) {
  return {
    endometriose:
      (d.endo1 ? 3 : 0) +
      (d.endo2 ? 2 : 0) +
      (d.endo3 ? 3 : 0) +
      (d.endo4 ? 1 : 0) +
      (f.digestive_present ? 1 : 0) +
      (f.pain_high ? 1 : 0) +
      (f.cyclic_pattern ? 1 : 0),

    adenomyose:
      (d.aden1 ? 3 : 0) +
      (d.aden2 ? 2 : 0) +
      (f.pain_high ? 1 : 0) +
      (f.cyclic_pattern ? 1 : 0),

    congestion:
      (d.cong1 ? 3 : 0) +
      (d.cong2 ? 2 : 0) +
      (!f.cyclic_pattern ? 1 : 0),

    pudendal:
      (d.pud1 ? 3 : 0) +
      (d.pud2 ? 2 : 0) +
      (d.pud3 ? 2 : 0) +
      (d.painTypePrimary === "neuropathique" ? 1 : 0),

    opk:
      (d.opk1 ? 2 : 0) +
      (d.opk2 ? 2 : 0) +
      (d.cycleRegularity.toLowerCase().includes("irrég") ? 2 : 0),

    fibrome:
      (d.fib1 ? 3 : 0) +
      (d.fib2 ? 2 : 0),

    hypersensibilisation:
      (f.multi_site_pain ? 2 : 0) +
      (f.pain_very_high ? 2 : 0) +
      (f.digestive_present ? 1 : 0)
  };
}

// -------- FUSION --------
function mergeScores(d, s) {
  function combine(score, max, pct) {
    const expert = (score / max) * 100;
    return Math.round(expert * 0.4 + pct * 0.6);
  }

  return {
    endometriose: combine(s.endometriose, 11, d.endometriose_pct),
    adenomyose: combine(s.adenomyose, 7, d.adenomyose_pct),
    congestion: combine(s.congestion, 6, d.congestion_pct),
    pudendal: combine(s.pudendal, 8, d.pudendal_pct),
    opk: combine(s.opk, 6, d.opk_pct),
    fibrome: combine(s.fibrome, 5, d.fibrome_pct),
    hypersensibilisation: combine(s.hypersensibilisation, 5, d.hypersensibilisation_pct)
  };
}

// -------- LEVEL --------
function level(score) {
  if (score >= 70) return "élevé";
  if (score >= 40) return "modéré";
  if (score >= 10) return "faible";
  return "nul";
}

// -------- RANKING --------
function buildRanking(scores) {
  return Object.entries(scores)
    .map(([k, v]) => ({ label: k, pct: v }))
    .sort((a, b) => b.pct - a.pct);
}

// -------- EXPLANATION --------
function buildExplanation(d) {
  const reasons = [];

  if (d.endo1) reasons.push("Règles très douloureuses");
  if (d.endo2) reasons.push("Dyspareunie profonde");
  if (d.endo3) reasons.push("Douleur à la selle pendant les règles");
  if (d.aden1) reasons.push("Règles abondantes");
  if (d.cong1) reasons.push("Lourdeur pelvienne");
  if (d.pud1) reasons.push("Douleur en position assise");

  return reasons.slice(0, 3);
}

// -------- UNCERTAINTY --------
function computeUncertainty(ranking) {
  if (ranking.length < 2) return "faible";

  const diff = ranking[0].pct - ranking[1].pct;

  if (diff <= 8) return "élevée";
  if (diff <= 15) return "modérée";
  return "faible";
}

// -------- TRAINING LABEL --------
function getTrainingLabel(d) {
  const echo = d.diagnostic_echo || [];

  if (!echo.length) return { usable: false, labels: [] };
  if (echo.includes("Non contributif")) return { usable: false, labels: [] };

  return { usable: true, labels: echo };
}

// ===============================
// 🚀 MAIN FUNCTION
// ===============================
function pelvisComputeV3(raw) {
  const d = normalizePatientData(raw);
  const f = computeDerivedFeatures(d);
  const s = computeExpertScores(d, f);
  const scores = mergeScores(d, s);
  const ranking = buildRanking(scores);
  const uncertainty = computeUncertainty(ranking);
  const training = getTrainingLabel(raw);

  return {
    version: "3.0",
    generatedAt: new Date().toISOString(),

    usableForTraining: true,
    label_final: training.labels,
    label_confidence: raw.echoCertainty || "Non renseigné",

    uncertainty,
    confidence: typeof uncertainty === "number" ? 1 - uncertainty : 0,
    

    scores,
    levels: Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, level(v)])
    ),

    ranking,
    top1: ranking[0],
    top2: ranking[1],
    top3: ranking[2],

    explanation: buildExplanation(d),

    flags: {
      multiSitePain: f.multi_site_pain,
      digestivePresent: f.digestive_present,
      cyclicPattern: f.cyclic_pattern,
      mixedProfile: (ranking[1]?.pct || 0) >= 40
    }
  };
}
