const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const candidates = [
  {
    name: "EcoLumen",
    industry: "Servicios eléctricos",
    businessType: "PYME",
    description:
      "Servicios eléctricos para pymes. Asesoramiento y presupuestos sin cargo. Inspección, medición y certificación de circuito de puesta a tierra. Matrícula N° TS866 - Colegio de Técnicos Pcia. de Bs. As.",
    email: "ecolumen1@gmail.com",
    phone: "2902 412345 / 3407 439789",
    instagram: "ecolumen1",
    city: "Ramallo",
    notes: "Socios: Guillermo Scott y Ricardo Cirillo. Fuente: tarjeta personal."
  },
  {
    name: "GrAdiente",
    industry: "Servicios profesionales",
    description: "Tarjeta personal recibida. Rubro por confirmar.",
    phone: "(5411) 3114-0702",
    website: "matiaszgradiente.com.ar",
    notes: "Contacto: Matias Zavala (socio). Fuente: tarjeta personal."
  },
  {
    name: "Sotpers - La Reserva Ramallo",
    industry: "Turismo / Hospitalidad",
    businessType: "Empresa de servicios turísticos",
    description:
      "Complejo de casas de alquiler premium ubicadas en 7 hectáreas naturales que brinda un lugar único para dinámicas grupales o de team building & relax.",
    email: "info@sotpers.com.ar",
    phone: "+54 3407 400 627",
    website: "sotpers.com.ar",
    city: "Ramallo",
    notes: "La Reserva Ramallo. Fuente: tarjeta personal."
  }
];

function normalize(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, " ")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function main() {
  const existing = await prisma.company.findMany({ select: { id: true, name: true } });
  const existingNorm = new Map(existing.map((c) => [normalize(c.name), c]));

  const result = { agregadas: [], yaExistian: [] };

  for (const c of candidates) {
    const key = normalize(c.name);
    const possibleKeys = [key];
    const firstWord = normalize(c.name.split(/[\s-]+/)[0]);
    if (firstWord && firstWord !== key && firstWord.length >= 5) possibleKeys.push(firstWord);

    let hit = null;
    for (const k of possibleKeys) {
      for (const [existingKey, value] of existingNorm) {
        if (existingKey === k || existingKey.includes(k) || k.includes(existingKey)) {
          if (Math.min(existingKey.length, k.length) >= 4) {
            hit = value;
            break;
          }
        }
      }
      if (hit) break;
    }

    if (hit) {
      result.yaExistian.push({ nuevo: c.name, existente: hit.name, id: hit.id });
      continue;
    }

    const created = await prisma.company.create({
      data: {
        name: c.name,
        industry: c.industry ?? null,
        businessType: c.businessType ?? null,
        description: c.description ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        website: c.website ?? null,
        instagram: c.instagram ?? null,
        city: c.city ?? null,
        notes: c.notes ?? null,
        sourceEvent: "Tarjeta personal"
      }
    });

    result.agregadas.push({ name: created.name, id: created.id });
  }

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
