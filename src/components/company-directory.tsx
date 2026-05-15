"use client";

import { useMemo, useState } from "react";
import {
  getFilterLabel,
  getOfferingLabel,
  OFFERING_OPTIONS,
  PRIMARY_FILTERS,
  SECONDARY_FILTERS,
  parseStoredFilters
} from "@/lib/taxonomy";

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
  proposedSolutions: string | null;
  opportunitySummary: string | null;
  industry: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  notes: string | null;
};

const categoryLabel: Record<CompanyItem["category"], string> = {
  SIN_CATEGORIA: "Sin categoria",
  AGRO: "Agro",
  INDUSTRIA: "Industria",
  METALURGICA: "Metalurgica",
  LOGISTICA_TRANSPORTE: "Logistica y transporte",
  SALUD: "Salud",
  COMERCIO: "Comercio",
  ALIMENTOS_BEBIDAS: "Alimentos y bebidas",
  CONSTRUCCION: "Construccion",
  TECNOLOGIA_AUTOMATIZACION: "Tecnologia y automatizacion",
  SERVICIOS_PROFESIONALES: "Servicios profesionales",
  MARKETING_COMUNICACION: "Marketing y comunicacion",
  EDUCACION_RRHH: "Educacion y RRHH",
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
  const [primaryFilter, setPrimaryFilter] = useState("TODAS");
  const [secondaryFilter, setSecondaryFilter] = useState("TODAS");

  const companyFilters = useMemo(
    () =>
      new Map(
        companies.map((company) => [
          company.id,
          {
            filters: parseStoredFilters(company.keywords),
            offerings: parseStoredFilters(company.proposedSolutions)
          }
        ])
      ),
    [companies]
  );

  const companyTaxonomy = useMemo(() => Array.from(companyFilters.values()), [companyFilters]);

  const availablePrimaryFilters = useMemo(
    () =>
      PRIMARY_FILTERS.filter((filter) =>
        companyTaxonomy.some((company) => company.filters.includes(filter))
      ),
    [companyTaxonomy]
  );

  const availableSecondaryFilters = useMemo(
    () =>
      SECONDARY_FILTERS.filter((filter) =>
        companyTaxonomy.some((company) => company.filters.includes(filter))
      ),
    [companyTaxonomy]
  );

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return companies.filter((company) => {
      const record = companyFilters.get(company.id);
      const filters = record?.filters ?? [];
      const offerings = record?.offerings ?? [];
      const matchesPrimary = primaryFilter === "TODAS" || filters.includes(primaryFilter);
      const matchesSecondary = secondaryFilter === "TODAS" || filters.includes(secondaryFilter);
      const haystack = [
        company.name,
        company.industry ?? "",
        company.description ?? "",
        company.keywords ?? "",
        company.proposedSolutions ?? "",
        company.opportunitySummary ?? "",
        offerings.join(" "),
        company.email ?? "",
        company.phone ?? ""
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);

      return matchesPrimary && matchesSecondary && matchesQuery;
    });
  }, [companies, companyFilters, primaryFilter, query, secondaryFilter]);

  return (
    <>
      <section className="toolbar">
        <label className="search-field">
          <span>Buscar</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, rubro, sistema, mail..."
          />
        </label>

        <div className="filter-groups">
          <div className="filter-group">
            <span className="filter-title">Categoria</span>
            <div className="filters">
              <button
                type="button"
                className={primaryFilter === "TODAS" ? "filter active" : "filter"}
                onClick={() => setPrimaryFilter("TODAS")}
              >
                Todas
              </button>
              {availablePrimaryFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={primaryFilter === filter ? "filter active" : "filter"}
                  onClick={() => setPrimaryFilter(filter)}
                >
                  {getFilterLabel(filter)}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-title">Subcategoria</span>
            <div className="filters">
              <button
                type="button"
                className={secondaryFilter === "TODAS" ? "filter active" : "filter"}
                onClick={() => setSecondaryFilter("TODAS")}
              >
                Todas
              </button>
              {availableSecondaryFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={secondaryFilter === filter ? "filter active" : "filter"}
                  onClick={() => setSecondaryFilter(filter)}
                >
                  {getFilterLabel(filter)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="company-list">
        {filteredCompanies.map((company, index) => {
          const record = companyFilters.get(company.id);
          const filters = record?.filters ?? [];
          const offerings = record?.offerings ?? [];

          return (
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
                <span className="summary-contact">
                  {offerings.length > 0
                    ? offerings.map(getOfferingLabel).join(" | ")
                    : filters.map(getFilterLabel).join(" | ") || categoryLabel[company.category]}
                </span>
              </summary>

              <div className="company-detail">
                <div className="detail-columns">
                  <div className="info-card">
                    <strong>Descripcion</strong>
                    <p>{company.description || "Sin descripcion cargada."}</p>
                  </div>
                  <div className="info-card">
                    <strong>Contacto</strong>
                    <p>Email: {company.email || "Sin email"}</p>
                    <p>Telefono: {company.phone || "Sin telefono"}</p>
                    <p>Web: {company.website || "Sin web"}</p>
                    <p>Instagram: {company.instagram || "Sin Instagram"}</p>
                  </div>
                  <div className="info-card">
                    <strong>Filtros asignados</strong>
                    <p>{filters.map(getFilterLabel).join(", ") || "Sin filtros cargados"}</p>
                  </div>
                  <div className="info-card">
                    <strong>Posible negocio</strong>
                    <p>{company.opportunitySummary || "Sin oportunidad definida todavia."}</p>
                  </div>
                  <div className="info-card">
                    <strong>Soluciones posibles</strong>
                    <p>
                      {offerings.map(getOfferingLabel).join(", ") ||
                        "Sin soluciones seleccionadas"}
                    </p>
                  </div>
                </div>

                <form action={saveAction} className="comment-form">
                  <input type="hidden" name="companyId" value={company.id} />
                  <input type="hidden" name="category" value={company.category} />

                  <fieldset className="filter-editor">
                    <legend>Categorias principales</legend>
                    <div className="option-grid">
                      {PRIMARY_FILTERS.map((filter) => (
                        <label key={filter} className="option-pill">
                          <input
                            type="checkbox"
                            name="keywords"
                            value={filter}
                            defaultChecked={filters.includes(filter)}
                          />
                          <span>{getFilterLabel(filter)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="filter-editor">
                    <legend>Subcategorias</legend>
                    <div className="option-grid">
                      {SECONDARY_FILTERS.map((filter) => (
                        <label key={filter} className="option-pill">
                          <input
                            type="checkbox"
                            name="keywords"
                            value={filter}
                            defaultChecked={filters.includes(filter)}
                          />
                          <span>{getFilterLabel(filter)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="filter-editor">
                    <legend>Soluciones que podemos ofrecer</legend>
                    <div className="option-grid">
                      {OFFERING_OPTIONS.map((offering) => (
                        <label key={offering} className="option-pill">
                          <input
                            type="checkbox"
                            name="offerings"
                            value={offering}
                            defaultChecked={offerings.includes(offering)}
                          />
                          <span>{getOfferingLabel(offering)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label>
                    Posible negocio
                    <textarea
                      name="opportunitySummary"
                      rows={4}
                      defaultValue={company.opportunitySummary ?? ""}
                      placeholder="Ej: necesita landing con formulario, luego tablero interno y automatizacion de seguimiento."
                    />
                  </label>

                  <label>
                    Comentario
                    <textarea
                      name="notes"
                      rows={4}
                      defaultValue={company.notes ?? ""}
                      placeholder="Escribi una observacion breve..."
                    />
                  </label>
                  <button type="submit" className="save-button">
                    Guardar
                  </button>
                </form>
              </div>
            </details>
          );
        })}
      </section>
    </>
  );
}
