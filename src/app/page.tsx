import { updateCompanyComment } from "@/app/actions";
import { CompanyDirectory } from "@/components/company-directory";
import { getCompanies } from "@/lib/crm";

export default async function HomePage() {
  const companies = await getCompanies();

  return (
    <div className="simple-page">
      <section className="simple-hero">
        <p className="simple-kicker">Ronda Ramallo 2026</p>
        <h2>Empresas con detalle expandible y comentario.</h2>
        <p className="simple-copy">
          Abrís una empresa, ves su descripción y contacto, y dejás una nota breve en el mismo lugar.
        </p>
      </section>

      <CompanyDirectory companies={companies} saveAction={updateCompanyComment} />
    </div>
  );
}
