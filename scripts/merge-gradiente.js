const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const COMPANY_ID = "cmp5nipds008ovzf48fa4soug";
const NEW_PHONE = "(5411) 3114-0702";
const CONTACT_NAME = "Matías Zavala";
const CONTACT_ROLE = "Socio";
const NEW_NOTE_LINE = "Matias Zavala (socio) - tarjeta personal, sitio: matiaszgradiente.com.ar";

async function main() {
  const company = await prisma.company.findUnique({
    where: { id: COMPANY_ID },
    include: { contacts: true }
  });

  if (!company) {
    throw new Error("GRADIENTE RH no encontrada");
  }

  const updatedNotes = company.notes
    ? company.notes.includes(NEW_NOTE_LINE)
      ? company.notes
      : `${company.notes}\n${NEW_NOTE_LINE}`
    : NEW_NOTE_LINE;

  const updatedCompany = await prisma.company.update({
    where: { id: COMPANY_ID },
    data: {
      phone: company.phone ? company.phone : NEW_PHONE,
      notes: updatedNotes
    },
    select: { id: true, name: true, phone: true, notes: true }
  });

  const existingContact = company.contacts.find(
    (contact) =>
      (contact.name || "").toLowerCase().includes("matias zavala") ||
      (contact.name || "").toLowerCase().includes("matías zavala")
  );

  let contact;
  if (existingContact) {
    contact = await prisma.contact.update({
      where: { id: existingContact.id },
      data: {
        role: existingContact.role || CONTACT_ROLE,
        phone: existingContact.phone || NEW_PHONE
      }
    });
  } else {
    contact = await prisma.contact.create({
      data: {
        companyId: COMPANY_ID,
        name: CONTACT_NAME,
        role: CONTACT_ROLE,
        phone: NEW_PHONE,
        isPrimary: company.contacts.length === 0
      }
    });
  }

  console.log(
    JSON.stringify(
      {
        company: updatedCompany,
        contact: {
          id: contact.id,
          name: contact.name,
          role: contact.role,
          phone: contact.phone,
          isPrimary: contact.isPrimary
        }
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
