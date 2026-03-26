// ===============================
// PELVIS AI V3 — CORE ENGINE
// ===============================

const PELVIS_V31_STATS_KEY = "pelvis_v31_learning_stats";

const PROFILE_KEYS = [
  "endometriose",
  "adenomyose",
  "congestion",
  "pudendal",
  "opk",
  "fibrome"
];

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

// -------- FEATURE VECTOR IA --------
function hasValue(arr, value) {
  return Array.isArray(arr) && arr.includes(value);
}

function buildFeatureVector(d) {
  return {
    // Topographie
    topo_bas_ventre_centre: hasValue(d.topo, "Bas du ventre (centre)") ? 1 : 0,
    topo_droite: hasValue(d.topo, "Côté droit du bas du ventre") ? 1 : 0,
    topo_gauche: hasValue(d.topo, "Côté gauche du bas du ventre") ? 1 : 0,
    topo_bassin_profond: hasValue(d.topo, "Douleur profonde dans le bassin") ? 1 : 0,
    topo_vagin: hasValue(d.topo, "Vagin") ? 1 : 0,
    topo_vulve: hasValue(d.topo, "Vulve") ? 1 : 0,
    topo_perinee: hasValue(d.topo, "Périnée") ? 1 : 0,
    topo_sacrum: hasValue(d.topo, "Bas du dos / sacrum") ? 1 : 0,
    topo_cuisse_droite: hasValue(d.topo, "Cuisse droite") ? 1 : 0,
    topo_cuisse_gauche: hasValue(d.topo, "Cuisse gauche") ? 1 : 0,

    // Temporalité
    time_regles: hasValue(d.time, "Pendant les règles") ? 1 : 0,
    time_rapports: hasValue(d.time, "Pendant les rapports sexuels") ? 1 : 0,
    time_post_rapports: hasValue(d.time, "Après les rapports sexuels") ? 1 : 0,
    time_ovulation: hasValue(d.time, "Douleur à l'ovulation") ? 1 : 0,
    time_uriner: hasValue(d.time, "En urinant") ? 1 : 0,
    time_selle: hasValue(d.time, "En allant à la selle") ? 1 : 0,
    time_assise: hasValue(d.time, "En position assise") ? 1 : 0,
    time_debout: hasValue(d.time, "En restant debout longtemps") ? 1 : 0,
    time_sans_raison: hasValue(d.time, "Sans raison particulière") ? 1 : 0,

    // Digestif
    digestif_ballonnements: hasValue(d.digestif, "Ballonnements") ? 1 : 0,
    digestif_ballonnements_soir: hasValue(d.digestif, "Ballonnements surtout le soir") ? 1 : 0,
    digestif_diarrhee: hasValue(d.digestif, "Diarrhée") ? 1 : 0,
    digestif_constipation: hasValue(d.digestif, "Constipation") ? 1 : 0,
    digestif_alternance: hasValue(d.digestif, "Alternance diarrhée / constipation") ? 1 : 0,
    digestif_defecation: hasValue(d.digestif, "Douleur à la défécation") ? 1 : 0,

    // Items cliniques directs
    endo1: d.endo1 ? 1 : 0,
    endo2: d.endo2 ? 1 : 0,
    endo3: d.endo3 ? 1 : 0,
    endo4: d.endo4 ? 1 : 0,
    aden1: d.aden1 ? 1 : 0,
    aden2: d.aden2 ? 1 : 0,
    cong1: d.cong1 ? 1 : 0,
    cong2: d.cong2 ? 1 : 0,
    pud1: d.pud1 ? 1 : 0,
    pud2: d.pud2 ? 1 : 0,
    pud3: d.pud3 ? 1 : 0,
    opk1: d.opk1 ? 1 : 0,
    opk2: d.opk2 ? 1 : 0,
    fib1: d.fib1 ? 1 : 0,
    fib2: d.fib2 ? 1 : 0,
    bloatingEvening: d.bloatingEvening ? 1 : 0,

    // Intensité
    pain: Number(d.pain || 0)
  };
}

function buildLabelVector(d) {
  const echo = Array.isArray(d.diagnostic_echo) ? d.diagnostic_echo : [];

  return {
    endometriose: echo.includes("Endométriose") ? 1 : 0,
    adenomyose: echo.includes("Adénomyose") ? 1 : 0,
    congestion: echo.includes("Congestion pelvienne") ? 1 : 0,
    pudendal: echo.includes("Névralgie pudendale") ? 1 : 0,
    opk: echo.includes("OPK") ? 1 : 0,
    fibrome: echo.includes("Fibrome") ? 1 : 0
  };
}

function buildLearningMatrix(docs) {
  return (docs || []).map(raw => {
    const d = normalizePatientData(raw);
    return {
      features: buildFeatureVector(d),
      labels: buildLabelVector(d),
      raw
    };
  });
}

function emptyFeatureWeights() {
  return {
    endometriose: {},
    adenomyose: {},
    congestion: {},
    pudendal: {},
    opk: {},
    fibrome: {}
  };
}

function trainFeatureWeights(docs) {
  const matrix = buildLearningMatrix(docs);
  const model = emptyFeatureWeights();

  if (!matrix.length) {
    return {
      totalCases: 0,
      featureWeights: model
    };
  }

  const diagnoses = ["endometriose", "adenomyose", "congestion", "pudendal", "opk", "fibrome"];
  const featureNames = Object.keys(matrix[0].features);

  diagnoses.forEach(diag => {
    const positiveRows = matrix.filter(row => row.labels[diag] === 1);
    const negativeRows = matrix.filter(row => row.labels[diag] === 0);

    featureNames.forEach(feature => {
      const posRate = positiveRows.length
        ? positiveRows.reduce((s, row) => s + Number(row.features[feature] || 0), 0) / positiveRows.length
        : 0;

      const negRate = negativeRows.length
        ? negativeRows.reduce((s, row) => s + Number(row.features[feature] || 0), 0) / negativeRows.length
        : 0;

      model[diag][feature] = Number((posRate - negRate).toFixed(4));
    });
  });

  return {
    totalCases: matrix.length,
    featureWeights: model
  };
}

const PELVIS_V3_WEIGHTS_KEY = "pelvis_v3_feature_weights";

function saveFeatureWeightsModel(model) {
  try {
    localStorage.setItem(PELVIS_V3_WEIGHTS_KEY, JSON.stringify(model));
  } catch (e) {
    console.warn("Impossible d’enregistrer les poids V3 :", e);
  }
}

function loadFeatureWeightsModel() {
  try {
    const raw = localStorage.getItem(PELVIS_V3_WEIGHTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Impossible de charger les poids V3 :", e);
    return null;
  }
}

function computeLearnedScores(d) {
  const model = loadFeatureWeightsModel();
  const features = buildFeatureVector(d);

  const base = {
    endometriose: 0,
    adenomyose: 0,
    congestion: 0,
    pudendal: 0,
    opk: 0,
    fibrome: 0
  };

  if (!model || !model.featureWeights) return base;

  Object.keys(base).forEach(diag => {
    const weights = model.featureWeights[diag] || {};

    Object.entries(features).forEach(([feature, value]) => {
      base[diag] += Number(value || 0) * Number(weights[feature] || 0);
    });
  });

  return base;
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
function mergeScoresBase(d, s) {
  return {
    endometriose: Number(s.endometriose || 0),
    adenomyose: Number(s.adenomyose || 0),
    congestion: Number(s.congestion || 0),
    pudendal: Number(s.pudendal || 0),
    opk: Number(s.opk || 0),
    fibrome: Number(s.fibrome || 0)
  };
}

function mergeScores(d, s) {
  const base = mergeScoresBase(d, s);
  const learningStats = loadLearningStats();

  return {
    endometriose: base.endometriose * getLearningFactor("endometriose", learningStats),
    adenomyose: base.adenomyose * getLearningFactor("adenomyose", learningStats),
    congestion: base.congestion * getLearningFactor("congestion", learningStats),
    pudendal: base.pudendal * getLearningFactor("pudendal", learningStats),
    opk: base.opk * getLearningFactor("opk", learningStats),
    fibrome: base.fibrome * getLearningFactor("fibrome", learningStats)
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
function uncertaintyToScore(level) {
  if (level === "faible") return 0.2;
  if (level === "modérée") return 0.5;
  if (level === "élevée") return 0.8;
  return 0.5;
}

// -------- TRAINING LABEL --------
function getTrainingLabel(d) {
  const echo = d.diagnostic_echo || [];

  if (!echo.length) return { usable: false, labels: [] };
  if (echo.includes("Non contributif")) return { usable: false, labels: [] };

  return { usable: true, labels: echo };
}


function emptyLearningStats() {
  return {
    endometriose: { success: 0, total: 0 },
    adenomyose: { success: 0, total: 0 },
    congestion: { success: 0, total: 0 },
    pudendal: { success: 0, total: 0 },
    opk: { success: 0, total: 0 },
    fibrome: { success: 0, total: 0 }
  };
}

function loadLearningStats() {
  try {
    const raw = localStorage.getItem(PELVIS_V31_STATS_KEY);
    if (!raw) return emptyLearningStats();

    const parsed = JSON.parse(raw);
    const base = emptyLearningStats();

    PROFILE_KEYS.forEach(key => {
      if (parsed[key]) {
        base[key].success = Number(parsed[key].success || 0);
        base[key].total = Number(parsed[key].total || 0);
      }
    });

    return base;
  } catch (e) {
    console.warn("Impossible de charger les stats V3.1 :", e);
    return emptyLearningStats();
  }
}

function saveLearningStats(stats) {
  try {
    localStorage.setItem(PELVIS_V31_STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn("Impossible d’enregistrer les stats V3.1 :", e);
  }
}

function getLearningFactor(profileKey, stats) {
  const row = stats?.[profileKey];
  if (!row || row.total < 5) return 1;

  const rate = row.success / row.total;

  // borne volontairement douce pour éviter de déformer brutalement l’IA
  // 0.85 à 1.15
  return Math.max(0.85, Math.min(1.15, 0.85 + rate * 0.30));
}

function mapEchoLabelToProfileKey(label) {
  const map = {
    "Endométriose": "endometriose",
    "Adénomyose": "adenomyose",
    "Congestion pelvienne": "congestion",
    "Névralgie pudendale": "pudendal",
    "OPK": "opk",
    "Fibrome": "fibrome"
  };
  return map[label] || null;
}

function rebuildLearningStatsFromDataset(docs) {
  const stats = emptyLearningStats();

  docs.forEach(raw => {
    const d = normalizePatientData(raw);
    const echo = Array.isArray(d.diagnostic_echo) ? d.diagnostic_echo : [];
    const usableEcho = echo.filter(x =>
      x &&
      x !== "Normal" &&
      x !== "Non contributif" &&
      x !== "Autre"
    );

    if (!usableEcho.length) return;

    const f = computeDerivedFeatures(d);
    const s = computeExpertScores(d, f);
    const merged = mergeScoresBase(d, s); // voir étape 4

    const ranking = buildRanking(merged);
    const top2 = ranking.slice(0, 2).map(x => x.key);

    PROFILE_KEYS.forEach(key => {
      const echoMatch = usableEcho.some(label => mapEchoLabelToProfileKey(label) === key);
      const predicted = top2.includes(key);

      if (predicted || echoMatch) {
        stats[key].total += 1;
        if (predicted && echoMatch) {
          stats[key].success += 1;
        }
      }
    });
  });

  saveLearningStats(stats);
  return stats;
}

// ===============================
// 🚀 MAIN FUNCTION
// ===============================
function pelvisComputeV3(raw) {
  const d = normalizePatientData(raw);
  const f = computeDerivedFeatures(d);
  const s = computeExpertScores(d, f);
 const expertScores = mergeScores(d, s);
const learnedScores = computeLearnedScores(d);

const scores = {
  endometriose: expertScores.endometriose + learnedScores.endometriose,
  adenomyose: expertScores.adenomyose + learnedScores.adenomyose,
  congestion: expertScores.congestion + learnedScores.congestion,
  pudendal: expertScores.pudendal + learnedScores.pudendal,
  opk: expertScores.opk + learnedScores.opk,
  fibrome: expertScores.fibrome + learnedScores.fibrome
};
  const ranking = buildRanking(scores);
 const uncertainty = computeUncertainty(ranking);
const uncertaintyScore = uncertaintyToScore(uncertainty);
  const training = getTrainingLabel(raw);
  const v2Score = typeof pelvisPredictV2 === "function"
  ? pelvisPredictV2(d)
  : null;

const scoreTop1 = ranking && ranking[0] && typeof ranking[0].pct === "number"
  ? ranking[0].pct / 100
  : 0;

const v3Confidence = (scoreTop1 * 0.7) + ((1 - uncertaintyScore) * 0.3);

const v2Confidence = v2Score && typeof v2Score.confidence === "number"
  ? v2Score.confidence
  : null;



const hybridConfidence = v2Confidence !== null
  ? (v3Confidence * 0.7) + (v2Confidence * 0.3)
  : v3Confidence;
  
  
  return {
    version: "3.0",
    generatedAt: new Date().toISOString(),

    usableForTraining: true,
    label_final: training.labels,
    label_confidence: raw.echoCertainty || "Non renseigné",

    uncertainty,
uncertaintyScore,
confidence: hybridConfidence,
confidence_v3: v3Confidence,
confidence_v2: v2Confidence,

    admin_pattern: {
  top1: ranking?.[0] || null,
  top2: ranking?.[1] || null,
  top3: ranking?.[2] || null,
  scores: scores,
  uncertainty: uncertainty,
  uncertaintyScore: uncertaintyScore,
  confidence: hybridConfidence
},
      
    

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
    mixedProfile: (() => {
  const p1 = Number(ranking?.[0]?.pct ?? 0);
  const p2 = Number(ranking?.[1]?.pct ?? 0);

  return (
    p2 >= 2 &&
    Math.abs(p1 - p2) <= 3
  );
})()
 
    }
  };
}
function pelvisRetrainV31(docs) {
  const cleanDocs = docs || [];
  const stats = rebuildLearningStatsFromDataset(cleanDocs);
  const learnedModel = trainFeatureWeights(cleanDocs);
  saveFeatureWeightsModel(learnedModel);

  return {
    stats,
    learnedModel
  };
}

function pelvisGetV31Stats() {
  return loadLearningStats();
}

function pelvisGetLearnedWeights() {
  const model = loadFeatureWeightsModel();
  if (!model || !model.featureWeights) return null;
  return model.featureWeights;
}

window.pelvisGetLearnedWeights = pelvisGetLearnedWeights;

window.pelvisComputeV3 = pelvisComputeV3;
window.pelvisRetrainV31 = pelvisRetrainV31;
window.pelvisGetV31Stats = pelvisGetV31Stats;
