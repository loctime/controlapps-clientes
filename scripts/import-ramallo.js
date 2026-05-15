const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");
const { PrismaClient, CompanyStatus } = require("@prisma/client");

const prisma = new PrismaClient();

const desktopDir = path.join(process.env.USERPROFILE || "C:\\Users\\User", "Desktop");
const companiesCsvPath = path.join(desktopDir, "empresas_ramallo2026.csv");
const contactsXlsxPath = fs.existsSync(path.join(desktopDir, "Ronda_Negocios_Ramallo_2026_Contactos.xlsx"))
  ? path.join(desktopDir, "Ronda_Negocios_Ramallo_2026_Contactos.xlsx")
  : path.join(desktopDir, "1Ronda_Negocios_Ramallo_2026_Contactos.xlsx");

function normalizeName(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " Y ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function parseCompanyLine(line) {
  const parts = line.split("|").map((part) => part.trim());
  if (parts.length === 7) {
    const [id, empresa, sector, tipo, descripcion, productosOfrecidos, productosDemandados] = parts;
    return {
      rowId: id,
      name: empresa,
      industry: sector,
      businessType: tipo,
      description: descripcion,
      productsOffered: productosOfrecidos,
      productsDemanded: productosDemandados
    };
  }

  if (parts[0] === "37" || parts[0] === "40") {
    return {
      rowId: parts[0],
      name: `${parts[1]} - ${parts[2]}`.replace(/\s+/g, " ").trim(),
      industry: parts[3],
      businessType: parts[4],
      description: parts[5],
      productsOffered: parts[6],
      productsDemanded: parts[7]
    };
  }

  if (parts[0] === "199") {
    return {
      rowId: parts[0],
      name: parts[1],
      industry: parts[2],
      businessType: parts[3],
      description: `${parts[4]} | ${parts[5]}`,
      productsOffered: parts[6],
      productsDemanded: parts[7]
    };
  }

  throw new Error(`Fila no reconocida en CSV: ${line}`);
}

function readCompaniesCsv() {
  const raw = fs.readFileSync(companiesCsvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  return lines.slice(1).map(parseCompanyLine);
}

function readContactsWorkbook() {
  const workbook = XLSX.readFile(contactsXlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return rows
    .filter(
      (row) =>
        row.Empresa &&
        !String(row.Empresa).toUpperCase().includes("TOTAL INSCRIPTAS")
    )
    .map((row) => ({
      name: clean(row.Empresa),
      industry: clean(row.Sector),
      phone: clean(row["Teléfono"]),
      email: clean(row.Email),
      website: clean(row.Web),
      instagram: clean(row.Instagram),
      addressNotes: clean(row["Dirección / Notas"])
    }));
}

function getBestContactMatch(contactName, companyMap) {
  const exactKey = normalizeName(contactName);
  if (companyMap.has(exactKey)) return exactKey;

  const candidates = [...companyMap.keys()].filter(
    (key) => key.includes(exactKey) || exactKey.includes(key)
  );

  if (candidates.length === 1) return candidates[0];

  const aliases = {
    "BANCO NACION": "BANCO NACION RELACIONAMIENTO DE EMPRESAS",
    "CLUB ATLETICO DEFENSORES DE BELGRANO RAMALLO": "CLUB ATLETICO Y SOCIAL DEFENSORES DE BELGRANO RAMALLO",
    "FUNDACION RUMBOS": "FUNDACION RUMBOS DE INTEGRACION Y DESARROLLO REGIONAL",
    "PORTFOLIO PERSONAL INVERSIONES": "PORTFOLIO PERSONAL INVERSIONES JUAN MEJIA"
  };

  return aliases[exactKey] || null;
}

async function main() {
  const companies = readCompaniesCsv();
  const contacts = readContactsWorkbook();

  const companyMap = new Map();

  for (const company of companies) {
    const key = normalizeName(company.name);
    companyMap.set(key, {
      ...company,
      importKey: `ramallo-2026:${key}`,
      phone: null,
      email: null,
      website: null,
      instagram: null,
      addressNotes: null,
      sourceEvent: "Ronda de Negocios Ramallo 2026"
    });
  }

  let mergedContacts = 0;
  let contactsOnlyCompanies = 0;

  for (const contact of contacts) {
    const matchedKey = getBestContactMatch(contact.name, companyMap);
    if (!matchedKey) {
      const key = normalizeName(contact.name);
      companyMap.set(key, {
        rowId: null,
        name: contact.name,
        industry: contact.industry,
        businessType: null,
        description: null,
        productsOffered: null,
        productsDemanded: null,
        importKey: `ramallo-2026:${key}`,
        phone: contact.phone,
        email: contact.email,
        website: contact.website,
        instagram: contact.instagram,
        addressNotes: contact.addressNotes,
        sourceEvent: "Ronda de Negocios Ramallo 2026"
      });
      contactsOnlyCompanies += 1;
      continue;
    }

    const current = companyMap.get(matchedKey);
    companyMap.set(matchedKey, {
      ...current,
      industry: current.industry || contact.industry,
      phone: current.phone || contact.phone,
      email: current.email || contact.email,
      website: current.website || contact.website,
      instagram: current.instagram || contact.instagram,
      addressNotes: current.addressNotes || contact.addressNotes
    });
    mergedContacts += 1;
  }

  for (const company of companyMap.values()) {
    const existing = await prisma.company.findUnique({
      where: { importKey: company.importKey },
      select: { id: true, status: true }
    });

    const data = {
      name: company.name,
      industry: clean(company.industry),
      businessType: clean(company.businessType),
      description: clean(company.description),
      productsOffered: clean(company.productsOffered),
      productsDemanded: clean(company.productsDemanded),
      website: clean(company.website),
      instagram: clean(company.instagram),
      phone: clean(company.phone),
      email: clean(company.email),
      addressNotes: clean(company.addressNotes),
      sourceEvent: company.sourceEvent
    };

    if (existing) {
      await prisma.company.update({
        where: { importKey: company.importKey },
        data
      });
      continue;
    }

    const created = await prisma.company.create({
      data: {
        ...data,
        importKey: company.importKey,
        status: CompanyStatus.LEAD
      }
    });

    await prisma.interaction.create({
      data: {
        companyId: created.id,
        subject: "Importación inicial",
        detail: "Empresa importada desde la base de Ronda de Negocios Ramallo 2026.",
        happenedAt: new Date("2026-05-14T00:00:00.000Z")
      }
    });
  }

  console.log(
    JSON.stringify(
        {
          importedCompanies: companyMap.size,
          mergedContacts,
          contactsOnlyCompanies
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
