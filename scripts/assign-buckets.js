const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const FORCE_ALL = process.argv.includes("--all");

function normalize(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asWords(text) {
  return new Set(text.split(/\s+/));
}

function any(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

const MAGNATE_NAME_HINTS = [
  "ypf",
  "arcor",
  "techint",
  "ledesma",
  "molinos",
  "aceitera",
  "agd",
  "siderar",
  "tenaris",
  "loma negra",
  "bunge",
  "cargill",
  "vicentin",
  "dreyfus",
  "renova",
  "newsan",
  "mirgor",
  "grupo",
  "holding",
  "corporacion",
  "internacional",
  "multinacional"
];

function scoreMagnate(text, tags, words) {
  let score = 0;
  if (tags.has("magnate")) score += 5;
  if (tags.has("empresa-grande") || tags.has("grande")) score += 4;
  if (tags.has("exportador")) score += 3;
  if (any(text, ["exporta", "exportador", "internacional", "multinacional", "global"])) score += 2;
  if (any(text, ["planta industrial", "complejo industrial", "fabrica propia"])) score += 2;
  if (any(text, ["holding", "grupo empresar", "corporacion"])) score += 2;
  if (MAGNATE_NAME_HINTS.some((hint) => text.includes(hint))) score += 2;
  if (words.has("sa") || words.has("s a")) score += 0.5;
  return score;
}

function scoreProximos(company, text, tags, words) {
  let score = 0;
  if (company.email && company.phone) score += 1;
  if (tags.has("pequeno") || tags.has("microempresa")) score += 3;
  if (tags.has("familiar")) score += 2.5;
  if (tags.has("emprendedor")) score += 2.5;
  if (tags.has("local")) score += 1.5;
  if (any(text, ["familiar", "emprendimient", "artesanal", "pyme", "microempresa", "barrial", "boutique"]))
    score += 2;
  if (any(text, ["necesita", "busca", "quiere"])) score += 1;
  if (
    ["COMERCIO", "ALIMENTOS_BEBIDAS", "SALUD"].includes(company.category)
  ) {
    score += 1;
  }
  if (words.has("estetica") || words.has("inmobiliaria") || words.has("kiosko") || words.has("almacen")) {
    score += 2.5;
  }
  return score;
}

function scoreFuturos(company, text, tags) {
  let score = 0;
  if (tags.has("mediano") || tags.has("regional")) score += 3;
  if (tags.has("consultoria") || tags.has("consultora")) score += 1;
  if (
    [
      "FINANZAS_SEGUROS",
      "EDUCACION_RRHH",
      "MARKETING_COMUNICACION",
      "ORGANISMOS_INSTITUCIONES",
      "TECNOLOGIA_AUTOMATIZACION"
    ].includes(company.category)
  ) {
    score += 1.5;
  }
  if (any(text, ["b2b", "licitacion", "publico", "estado", "gobierno", "camara", "asociacion"])) {
    score += 2;
  }
  if (any(text, ["mediano", "regional", "nacional"])) score += 1;
  return score;
}

function pickBucket(company) {
  const text = normalize(
    [
      company.name,
      company.industry,
      company.businessType,
      company.description,
      company.productsOffered,
      company.productsDemanded,
      company.opportunitySummary,
      company.notes,
      company.keywords
    ]
      .filter(Boolean)
      .join(" | ")
  );
  const words = asWords(text);
  const tags = new Set((company.keywords || "").split(/[,\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean));

  const sM = scoreMagnate(text, tags, words);
  const sP = scoreProximos(company, text, tags, words);
  const sF = scoreFuturos(company, text, tags);

  const candidates = [
    { bucket: "MAGNATES", score: sM },
    { bucket: "PROXIMOS", score: sP },
    { bucket: "FUTUROS", score: sF }
  ].sort((a, b) => b.score - a.score);

  const top = candidates[0];

  if (top.score <= 0.5) {
    return {
      bucket: "FUTUROS",
      reason: `sin señales → fallback futuros (m=${sM.toFixed(1)} p=${sP.toFixed(1)} f=${sF.toFixed(1)})`
    };
  }

  if (top.bucket === "PROXIMOS" && top.score < 3) {
    return {
      bucket: "FUTUROS",
      reason: `prox bajo → futuros (m=${sM.toFixed(1)} p=${sP.toFixed(1)} f=${sF.toFixed(1)})`
    };
  }

  if (top.bucket === "MAGNATES" && top.score < 3) {
    const next = candidates.find((c) => c.bucket !== "MAGNATES" && c.score >= 2);
    if (next) {
      return {
        bucket: next.bucket,
        reason: `magnate débil → ${next.bucket.toLowerCase()} (m=${sM.toFixed(1)} p=${sP.toFixed(1)} f=${sF.toFixed(1)})`
      };
    }
    return {
      bucket: "FUTUROS",
      reason: `magnate débil → futuros (m=${sM.toFixed(1)} p=${sP.toFixed(1)} f=${sF.toFixed(1)})`
    };
  }

  return {
    bucket: top.bucket,
    reason: `magnate=${sM.toFixed(1)} prox=${sP.toFixed(1)} fut=${sF.toFixed(1)}`
  };
}

async function main() {
  const where = FORCE_ALL ? {} : { bucket: "SIN_ASIGNAR" };
  const companies = await prisma.company.findMany({ where });

  const summary = { MAGNATES: 0, PROXIMOS: 0, FUTUROS: 0 };
  const samples = { MAGNATES: [], PROXIMOS: [], FUTUROS: [] };

  for (const company of companies) {
    const { bucket, reason } = pickBucket(company);
    summary[bucket] += 1;
    if (samples[bucket].length < 5) {
      samples[bucket].push({ name: company.name, reason });
    }
    await prisma.company.update({
      where: { id: company.id },
      data: { bucket }
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: FORCE_ALL ? "TODAS" : "solo SIN_ASIGNAR",
        total: companies.length,
        asignadas: summary,
        ejemplos: samples
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
