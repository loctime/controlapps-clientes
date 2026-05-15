const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const keywordRules = [
  { tag: "agro", patterns: ["agro", "semilla", "fertiliz", "fitosanit", "grano"] },
  { tag: "industria", patterns: ["industria", "industrial", "fabrica", "produccion"] },
  { tag: "metalurgica", patterns: ["metalurg", "acero", "soldadura", "hierro", "chapa"] },
  { tag: "logistica", patterns: ["logistica", "cadena de suministro", "supply chain"] },
  { tag: "transporte", patterns: ["transporte", "flete", "carga", "camion"] },
  { tag: "salud", patterns: ["salud", "clinica", "medic", "hospital", "farmac"] },
  { tag: "comercio", patterns: ["comercio", "retail", "venta", "supermercado"] },
  { tag: "alimentos", patterns: ["alimento", "bebida", "embotell", "gastronom", "vianda"] },
  { tag: "construccion", patterns: ["construccion", "obra", "steel framing", "arquitect", "pintura"] },
  { tag: "software", patterns: ["software", "desarrollador", "web", "hosting", "app", "sistema"] },
  { tag: "automatizacion", patterns: ["automatiz", "iot", "telemed", "sensor", "industria 4.0"] },
  { tag: "consultoria", patterns: ["consultor", "asesoria", "asesor", "mentoria", "estudio"] },
  { tag: "marketing", patterns: ["marketing", "merch", "publicidad", "comunicacion"] },
  { tag: "educacion", patterns: ["educacion", "capacit", "academia", "entrenamiento"] },
  { tag: "finanzas", patterns: ["financ", "banco", "credito", "inversion", "seguro"] },
  { tag: "rrhh", patterns: ["rrhh", "recursos humanos", "talento"] },
  { tag: "organismo", patterns: ["organismo", "municip", "fundacion", "asociacion civil", "camara"] },
  { tag: "cooperativa", patterns: ["cooperativa", "coop"] }
];

function normalize(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, " ");
}

function detectKeywords(company) {
  const text = normalize(
    [
      company.name,
      company.industry,
      company.businessType,
      company.description,
      company.productsOffered,
      company.productsDemanded
    ]
      .filter(Boolean)
      .join(" | ")
  );

  const tags = new Set();

  for (const rule of keywordRules) {
    if (rule.patterns.some((pattern) => text.includes(pattern))) {
      tags.add(rule.tag);
    }
  }

  const businessType = normalize(company.businessType);
  if (businessType.includes("pyme")) tags.add("pyme");
  if (businessType.includes("microempresa")) tags.add("microempresa");
  if (businessType.includes("empresa grande")) tags.add("empresa-grande");
  if (businessType.includes("emprendedor")) tags.add("emprendedor");
  if (businessType.includes("consultora")) tags.add("consultora");

  return [...tags];
}

function detectCategory(company, tags) {
  if (tags.includes("metalurgica")) return "METALURGICA";
  if (tags.includes("agro")) return "AGRO";
  if (tags.includes("software") || tags.includes("automatizacion")) return "TECNOLOGIA_AUTOMATIZACION";
  if (tags.includes("logistica") || tags.includes("transporte")) return "LOGISTICA_TRANSPORTE";
  if (tags.includes("salud")) return "SALUD";
  if (tags.includes("alimentos")) return "ALIMENTOS_BEBIDAS";
  if (tags.includes("construccion")) return "CONSTRUCCION";
  if (tags.includes("finanzas")) return "FINANZAS_SEGUROS";
  if (tags.includes("marketing")) return "MARKETING_COMUNICACION";
  if (tags.includes("educacion") || tags.includes("rrhh")) return "EDUCACION_RRHH";
  if (tags.includes("consultoria")) return "SERVICIOS_PROFESIONALES";
  if (tags.includes("organismo") || tags.includes("cooperativa")) return "ORGANISMOS_INSTITUCIONES";
  if (tags.includes("industria")) return "INDUSTRIA";
  if (tags.includes("comercio")) return "COMERCIO";

  return "SIN_CATEGORIA";
}

async function main() {
  const companies = await prisma.company.findMany();
  const summary = {};

  for (const company of companies) {
    const tags = detectKeywords(company);
    const category = detectCategory(company, tags);
    summary[category] = (summary[category] || 0) + 1;

    await prisma.company.update({
      where: { id: company.id },
      data: {
        category,
        keywords: tags.join(", ")
      }
    });
  }

  console.log(
    JSON.stringify(
      {
        total: companies.length,
        byCategory: summary
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
