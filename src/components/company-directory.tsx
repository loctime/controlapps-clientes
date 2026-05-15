"use client";

import { useMemo, useState } from "react";

type CompanyItem = {
  id: string;
  name: string;
  category:
    | "SIN_CATEGORIA"
    | "AGRO"
    | "INDUSTRIA"
    | "METALURGICA"
    | "LOGISTICA_TRANSPORTE"
    | "SALUD"
    | "COMERCIO"
    | "ALIMENTOS_BEBIDAS"
    | "CONSTRUCCION"
    | "TECNOLOGIA_AUTOMATIZACION"
    | "SERVICIOS_PROFESIONALES"
    | "MARKETING_COMUNICACION"
    | "EDUCACION_RRHH"
    | "FINANZAS_SEGUROS"
    | "ORGANISMOS_INSTITUCIONES";
  keywords: string | null;
  industry: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  notes: string | null;
};

const categoryLabel: Record<CompanyItem["category"], string> = {
  SIN_CATEGORIA: "Sin categoría",
  AGRO: "Agro",
  INDUSTRIA: "Industria",
  METALURGICA: "Metalúrgica",
  LOGISTICA_TRANSPORTE: "Logística y transporte",
  SALUD: "Salud",
  COMERCIO: "Comercio",
  ALIMENTOS_BEBIDAS: "Alimentos y bebidas",
  CONSTRUCCION: "Construcción",
  TECNOLOGIA_AUTOMATIZACION: "Tecnología y automatización",
  SERVICIOS_PROFESIONALES: "Servicios profesionales",
  MARKETING_COMUNICACION: "Marketing y comunicación",
  EDUCACION_RRHH: "Educación y RRHH",
  FINANZAS_SEGUROS: "Finanzas y seguros",
  ORGANISMOS_INSTITUCIONES: "Organismos e instituciones"
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function CompanyDirectory({
  companies,
  saveAction
}: {
  companies: CompanyItem[];
  saveAction: (formData: FormData) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CompanyItem["category"] | "TODAS">("TODAS");

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesCategory = category === "TODAS" || company.category === category;
      const haystack = [
        company.name,
        company.industry ?? "",
        company.description ?? "",
        company.keywords ?? "",
        company.email ?? "",
        company.phone ?? ""
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, companies, query]);

  return (
    <>
      <section className="toolbar">
        <label className="search-field">
          <span>Buscar</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, rubro, mail..."
          />
        </label>

        <div className="filters">
          <button
            type="button"
            className={category === "TODAS" ? "filter active" : "filter"}
            onClick={() => setCategory("TODAS")}
          >
            Todas
          </button>
          {Object.entries(categoryLabel).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={category === value ? "filter active" : "filter"}
              onClick={() => setCategory(value as CompanyItem["category"])}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="company-list">
        {filteredCompanies.map((company, index) => (
          <details key={company.id} className="company-item">
            <summary className="company-summary">
              <div className="summary-left">
                <span className="catalog-index">{String(index + 1).padStart(3, "0")}</span>
                <div className="catalog-logo">{getInitials(company.name)}</div>
                <div>
                  <p className="catalog-sector">{company.industry || "Sin rubro"}</p>
                  <h3>{company.name}</h3>
                </div>
              </div>
              <span className="summary-contact">{categoryLabel[company.category]}</span>
            </summary>

            <div className="company-detail">
              <div className="detail-columns">
                <div className="info-card">
                  <strong>Descripción</strong>
                  <p>{company.description || "Sin descripción cargada."}</p>
                </div>
                <div className="info-card">
                  <strong>Contacto</strong>
                  <p>Email: {company.email || "Sin email"}</p>
                  <p>Teléfono: {company.phone || "Sin teléfono"}</p>
                  <p>Web: {company.website || "Sin web"}</p>
                  <p>Instagram: {company.instagram || "Sin Instagram"}</p>
                </div>
                <div className="info-card">
                  <strong>Palabras clave</strong>
                  <p>{company.keywords || "Sin keywords"}</p>
                </div>
              </div>

              <form action={saveAction} className="comment-form">
                <input type="hidden" name="companyId" value={company.id} />
                <label>
                  Categoría
                  <select name="category" defaultValue={company.category}>
                    {Object.entries(categoryLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Palabras clave
                  <input
                    type="text"
                    name="keywords"
                    defaultValue={company.keywords ?? ""}
                    placeholder="agro, pyme, logistica..."
                  />
                </label>
                <label>
                  Comentario
                  <textarea
                    name="notes"
                    rows={4}
                    defaultValue={company.notes ?? ""}
                    placeholder="Escribí una observación breve..."
                  />
                </label>
                <button type="submit" className="save-button">
                  Guardar
                </button>
              </form>
            </div>
          </details>
        ))}
      </section>
    </>
  );
}
