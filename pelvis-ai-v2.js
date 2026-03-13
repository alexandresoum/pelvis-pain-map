/*
Pelvis Pain Map
Mini AI Engine V2
Version auto-apprenante à partir des dossiers Firestore

Principe :
- extraction des features patient
- entraînement supervisé sur diagnostic_echo
- calcul de poids automatiques par log-odds lissés
- prédiction probabiliste
- combinaison score expert + score IA

Compatible navigateur pur JS
*/

const PELVIS_AI_DIAGNOSES = [
  "Endométriose",
  "Adénomyose",
  "Congestion pelvienne",
  "Névralgie pudendale",
  "OPK"
];

function pelvisNormalizeDiagnosisLabel(label) {
  const v = String(label || "").trim().toLowerCase();

  if (v === "endométriose" || v === "endometriose") return "Endométriose";
  if (v === "adénomyose" || v === "adenomyose") return "Adénomyose";
  if (v === "congestion pelvienne") return "Congestion pelvienne";
  if (v === "névralgie pudendale" || v === "nevralgie pudendale") return "Névralgie pudendale";
  if (v === "opk") return "OPK";

  return "";
}

function pelvisIncludesText(arr, needle) {
  const list = Array.isArray(arr) ? arr : [];
  const n = String(needle || "").toLowerCase();
  return list.some(x => String(x || "").toLowerCase().includes(n));
}

function pelvisExtractFeatures(data) {
  const topo = Array.isArray(data.topo) ? data.topo : [];
  const time = Array.isArray(data.time) ? data.time : [];
  const digestif = Array.isArray(data.digestif) ? data.digestif : [];
  const type = Array.isArray(data.type) ? data.type : [];

  return {
    topo_bas_ventre_centre: pelvisIncludesText(topo, "bas du ventre (centre)"),
    topo_droite: pelvisIncludesText(topo, "côté droit du bas du ventre"),
    topo_gauche: pelvisIncludesText(topo, "côté gauche du bas du ventre"),
    topo_bassin_profond: pelvisIncludesText(topo, "douleur profonde dans le bassin"),
    topo_vagin: pelvisIncludesText(topo, "vagin"),
    topo_vulve: pelvisIncludesText(topo, "vulve"),
    topo_perinee: pelvisIncludesText(topo, "périnée"),
    topo_sacrum: pelvisIncludesText(topo, "bas du dos") || pelvisIncludesText(topo, "sacrum"),
    topo_cuisse_droite: pelvisIncludesText(topo, "cuisse droite"),
    topo_cuisse_gauche: pelvisIncludesText(topo, "cuisse gauche"),

    time_regles: pelvisIncludesText(time, "pendant les règles"),
    time_rapports: pelvisIncludesText(time, "pendant les rapports sexuels"),
    time_apres_rapports: pelvisIncludesText(time, "après les rapports sexuels"),
    time_ovulation: pelvisIncludesText(time, "ovulation"),
    time_miction: pelvisIncludesText(time, "urinant") || pelvisIncludesText(time, "miction"),
    time_selle: pelvisIncludesText(time, "selle") || pelvisIncludesText(time, "déféc") || pelvisIncludesText(time, "defec"),
    time_assise: pelvisIncludesText(time, "position assise"),
    time_debout: pelvisIncludesText(time, "debout longtemps"),
    time_sans_raison: pelvisIncludesText(time, "sans raison particulière"),

    type_nociceptive: type.includes("nociceptive"),
    type_neuro: type.includes("neuro"),

    digestif_ballonnements: pelvisIncludesText(digestif, "ballonnements"),
    digestif_constipation: pelvisIncludesText(digestif, "constipation"),
    digestif_diarrhee: pelvisIncludesText(digestif, "diarrhée") || pelvisIncludesText(digestif, "diarrhee"),
    digestif_alternance: pelvisIncludesText(digestif, "alternance"),
    digestif_douleur_defecation: pelvisIncludesText(digestif, "défécation") || pelvisIncludesText(digestif, "defecation") || pelvisIncludesText(digestif, "douleur à la défécation"),
    digestif_ballonnements_soir: !!data.bloatingEvening,

    endo1: !!data.endo1,
    endo2: !!data.endo2,
    endo3: !!data.endo3,
    endo4: !!data.endo4,

    aden1: !!data.aden1,
    aden2: !!data.aden2,

    cong1: !!data.cong1,
    cong2: !!data.cong2,

    pud1: !!data.pud1,
    pud2: !!data.pud2,
    pud3: !!data.pud3,

    uri1: !!data.uri1,

    opk1: !!data.opk1,
    opk2: !!data.opk2,
    cycle_irregulier: String(data.cycleRegularity || "") === "Irréguliers",

    consultation_oui: String(data.consultation || "") === "Oui",
    previous_diag_present: !!String(data.previousDiagnosis || "").trim(),
    contraception_present: !!String(data.contraceptionType || "").trim() &&
      !String(data.contraceptionType || "").toLowerCase().includes("pas de contraception"),

    pain_ge_7: Number(data.pain || 0) >= 7,
    pain_ge_5: Number(data.pain || 0) >= 5,
    chronic_6m: String(data.duration || "") === "Plus de 6 mois" || String(data.duration || "") === "Plus de 1 an",
    chronic_1y: String(data.duration || "") === "Plus de 1 an"
  };
}

function pelvisFeatureKeysFromRecords(records) {
  const keys = new Set();

  records.forEach(r => {
    const f = pelvisExtractFeatures(r);
    Object.keys(f).forEach(k => keys.add(k));
  });

  return Array.from(keys);
}

function pelvisGetUsableTrainingLabel(record) {
  const echos = Array.isArray(record.diagnostic_echo) ? record.diagnostic_echo : [];
  const normalized = echos
    .map(pelvisNormalizeDiagnosisLabel)
    .filter(x => PELVIS_AI_DIAGNOSES.includes(x));

  if (!normalized.length) return "";
  return normalized[0];
}

function pelvisTrainModel(records) {
  const usable = records
    .map(r => ({ raw: r, label: pelvisGetUsableTrainingLabel(r) }))
    .filter(x => !!x.label);

  const totalN = usable.length;
  const featureKeys = pelvisFeatureKeysFromRecords(usable.map(x => x.raw));

  const counts = {};
  const classCounts = {};
  const featureTotals = {};

  PELVIS_AI_DIAGNOSES.forEach(diag => {
    counts[diag] = {};
    classCounts[diag] = 0;
    featureKeys.forEach(k => {
      counts[diag][k] = 0;
    });
  });

  featureKeys.forEach(k => {
    featureTotals[k] = 0;
  });

  usable.forEach(({ raw, label }) => {
    classCounts[label] += 1;
    const f = pelvisExtractFeatures(raw);

    featureKeys.forEach(k => {
      if (f[k]) {
        counts[label][k] += 1;
        featureTotals[k] += 1;
      }
    });
  });

  const priors = {};
  const weights = {};

  PELVIS_AI_DIAGNOSES.forEach(diag => {
    const classN = classCounts[diag];
    priors[diag] = Math.log((classN + 1) / (totalN + PELVIS_AI_DIAGNOSES.length));
    weights[diag] = {};
  });

  featureKeys.forEach(k => {
    const globalYes = featureTotals[k];
    const globalNo = totalN - globalYes;

    PELVIS_AI_DIAGNOSES.forEach(diag => {
      const classN = classCounts[diag];
      const classYes = counts[diag][k];
      const classNo = classN - classYes;

      const otherN = totalN - classN;
      const otherYes = globalYes - classYes;
      const otherNo = otherN - otherYes;

      const a = classYes + 1;
      const b = classNo + 1;
      const c = otherYes + 1;
      const d = otherNo + 1;

      const pInClass = a / (a + b);
      const pOutClass = c / (c + d);

      const logOdds = Math.log(pInClass / pOutClass);

      weights[diag][k] = Number(logOdds.toFixed(4));
    });
  });

  return {
    version: "V2",
    trainedAt: new Date().toISOString(),
    totalN,
    classCounts,
    featureKeys,
    priors,
    weights
  };
}

function pelvisSoftmax(scoreMap) {
  const vals = Object.values(scoreMap);
  const maxVal = Math.max(...vals);
  const expMap = {};
  let sum = 0;

  Object.keys(scoreMap).forEach(k => {
    const e = Math.exp(scoreMap[k] - maxVal);
    expMap[k] = e;
    sum += e;
  });

  const out = {};
  Object.keys(expMap).forEach(k => {
    out[k] = expMap[k] / sum;
  });

  return out;
}

function pelvisPredictFromModel(patientData, model) {
  if (!model || !model.weights || !model.priors) {
    return {
      Endométriose: 0.2,
      Adénomyose: 0.2,
      "Congestion pelvienne": 0.2,
      "Névralgie pudendale": 0.2,
      OPK: 0.2
    };
  }

  const f = pelvisExtractFeatures(patientData);
  const scores = {};

  PELVIS_AI_DIAGNOSES.forEach(diag => {
    let s = Number(model.priors[diag] || 0);

    (model.featureKeys || []).forEach(k => {
      if (f[k]) s += Number(model.weights?.[diag]?.[k] || 0);
    });

    scores[diag] = s;
  });

  return pelvisSoftmax(scores);
}

function pelvisExpertPercentsToProbas(expertPercents) {
  const map = {
    Endométriose: Number(expertPercents?.["Endométriose"] || 0),
    Adénomyose: Number(expertPercents?.["Adénomyose"] || 0),
    "Congestion pelvienne": Number(expertPercents?.["Congestion pelvienne"] || 0),
    "Névralgie pudendale": Number(expertPercents?.["Névralgie pudendale"] || 0),
    OPK: Number(expertPercents?.["OPK"] || 0)
  };

  const sum = Object.values(map).reduce((a, b) => a + b, 0);

  if (sum <= 0) {
    return {
      Endométriose: 0.2,
      Adénomyose: 0.2,
      "Congestion pelvienne": 0.2,
      "Névralgie pudendale": 0.2,
      OPK: 0.2
    };
  }

  const out = {};
  Object.keys(map).forEach(k => {
    out[k] = map[k] / sum;
  });
  return out;
}

function pelvisCombineExpertAndAI(expertProbas, aiProbas, alphaExpert = 0.65) {
  const alphaAI = 1 - alphaExpert;
  const out = {};

  PELVIS_AI_DIAGNOSES.forEach(diag => {
    out[diag] =
      (Number(expertProbas?.[diag] || 0) * alphaExpert) +
      (Number(aiProbas?.[diag] || 0) * alphaAI);
  });

  return out;
}

function pelvisSortProbabilities(probMap) {
  return Object.entries(probMap)
    .sort((a, b) => b[1] - a[1])
    .map(([diagnosis, prob]) => ({ diagnosis, prob }));
}

function pelvisFormatPercent(prob) {
  return Math.round(Number(prob || 0) * 100);
}

function pelvisBuildExpertMapFromPatientRecord(data) {
  return {
    "Endométriose": Number(data.endometriose_pct || 0),
    "Adénomyose": Number(data.adenomyose_pct || 0),
    "Congestion pelvienne": Number(data.congestion_pct || 0),
    "Névralgie pudendale": Number(data.pudendal_pct || 0),
    "OPK": Number(data.opk_pct || 0)
  };
}

function pelvisRunV2(patientData, expertPercentMap, model, alphaExpert = 0.65) {
  const expertProbas = pelvisExpertPercentsToProbas(expertPercentMap);
  const aiProbas = pelvisPredictFromModel(patientData, model);
  const finalProbas = pelvisCombineExpertAndAI(expertProbas, aiProbas, alphaExpert);
  const ranking = pelvisSortProbabilities(finalProbas);

  return {
    expertProbas,
    aiProbas,
    finalProbas,
    ranking
  };
}

function pelvisSaveModelToLocalStorage(model, key = "pelvis_ai_v2_model") {
  localStorage.setItem(key, JSON.stringify(model));
}

function pelvisLoadModelFromLocalStorage(key = "pelvis_ai_v2_model") {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Erreur de lecture modèle localStorage", e);
    return null;
  }
}

function pelvisTrainAndSaveModel(records, key = "pelvis_ai_v2_model") {
  const model = pelvisTrainModel(records);
  pelvisSaveModelToLocalStorage(model, key);
  return model;
}
