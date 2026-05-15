"use client";

import { useMemo, useState, useTransition } from "react";
import {
  getFilterLabel,
  getOfferingLabel,
  OFFERING_OPTIONS,
  PRIMARY_FILTERS,
  SECONDARY_FILTERS,
  parseStoredFilters
} from "@/lib/taxonomy";

type Bucket = "SIN_ASIGNAR" | "PROXIMOS" | "FUTUROS" | "MAGNATES";
type Priority = "LOW" | "MEDIUM" | "HIGH";

type CompanyItem = {
  id: string;
  name: string;
  bucket: Bucket;
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

const BUCKETS: { value: Bucket; label: string; modifier: string }[] = [
  { value: "SIN_ASIGNAR", label: "Sin asignar", modifier: "unassigned" },
  { value: "PROXIMOS", label: "Proximos", modifier: "proximos" },
  { value: "FUTUROS", label: "Futuros", modifier: "futuros" },
  { value: "MAGNATES", label: "Magnates", modifier: "magnates" }
];

const BUCKET_LABEL: Record<Bucket, string> = {
  SIN_ASIGNAR: "Sin asignar",
  PROXIMOS: "Proximos",
  FUTUROS: "Futuros",
  MAGNATES: "Magnates"
};

const BUCKET_MODIFIER: Record<Bucket, string> = {
  SIN_ASIGNAR: "unassigned",
  PROXIMOS: "proximos",
  FUTUROS: "futuros",
  MAGNATES: "magnates"
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function todayDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function tomorrowDateStr() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CompanyDirectory({
  companies,
  saveAction,
  moveAction,
  agendaAction
}: {
  companies: CompanyItem[];
  saveAction: (formData: FormData) => void;
  moveAction: (formData: FormData) => void;
  agendaAction: (formData: FormData) => void;
}) {
  const [query, setQuery] = useState("");
  const [primaryFilter, setPrimaryFilter] = useState("TODAS");
  const [secondaryFilter, setSecondaryFilter] = useState("TODAS");
  const [activeBucket, setActiveBucket] = useState<Bucket>("SIN_ASIGNAR");
  const [, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [agendaForId, setAgendaForId] = useState<string | null>(null);
  const [miniTitle, setMiniTitle] = useState("");
  const [miniWhen, setMiniWhen] = useState<"today" | "tomorrow" | "custom">("today");
  const [miniDate, setMiniDate] = useState<string>(todayDateStr());
  const [miniTime, setMiniTime] = useState<string>("");
  const [miniPriority, setMiniPriority] = useState<Priority>("MEDIUM");
  const [flashCompanyId, setFlashCompanyId] = useState<string | null>(null);

  const handleMove = (companyId: string, bucket: Bucket) => {
    const fd = new FormData();
    fd.append("companyId", companyId);
    fd.append("bucket", bucket);
    setPendingId(companyId);
    startTransition(() => {
      moveAction(fd);
      setPendingId(null);
    });
  };

  const openAgendaFor = (companyId: string) => {
    setAgendaForId(companyId);
    setMiniTitle("");
    setMiniWhen("today");
    setMiniDate(todayDateStr());
    setMiniTime("");
    setMiniPriority("MEDIUM");
  };

  const handleAgendaSubmit = (companyId: string) => {
    if (!miniTitle.trim()) return;
    const fd = new FormData();
    fd.set("title", miniTitle.trim());
    fd.set("companyId", companyId);
    fd.set("dueDate", miniDate);
    fd.set("dueTime", miniTime);
    fd.set("priority", miniPriority);
    startTransition(() => {
      agendaAction(fd);
      setAgendaForId(null);
      setFlashCompanyId(companyId);
      setTimeout(() => setFlashCompanyId(null), 2200);
    });
  };

  const handleMiniWhen = (value: "today" | "tomorrow" | "custom") => {
    setMiniWhen(value);
    if (value === "today") setMiniDate(todayDateStr());
    if (value === "tomorrow") setMiniDate(tomorrowDateStr());
  };

  const bucketCounts = useMemo(() => {
    const counts: Record<Bucket, number> = {
      SIN_ASIGNAR: 0,
      PROXIMOS: 0,
      FUTUROS: 0,
      MAGNATES: 0
    };
    for (const company of companies) {
      counts[company.bucket] = (counts[company.bucket] ?? 0) + 1;
    }
    return counts;
  }, [companies]);

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
      if (company.bucket !== activeBucket) {
        return false;
      }
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
  }, [companies, companyFilters, primaryFilter, query, secondaryFilter, activeBucket]);

  const stop = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <>
      <nav className="bucket-tabs" aria-label="Listas">
        {BUCKETS.map((bucket) => (
          <button
            key={bucket.value}
            type="button"
            className={`bucket-tab bucket-tab--${bucket.modifier}${
              activeBucket === bucket.value ? " active" : ""
            }`}
            onClick={() => setActiveBucket(bucket.value)}
          >
            <span className="bucket-tab__label">{bucket.label}</span>
            <span className="bucket-count">{bucketCounts[bucket.value]}</span>
          </button>
        ))}
      </nav>

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

      {filteredCompanies.length === 0 ? (
        <p className="empty-state">
          No hay empresas en <strong>{BUCKET_LABEL[activeBucket]}</strong> con los filtros actuales.
        </p>
      ) : null}

      <section className="company-list">
        {filteredCompanies.map((company, index) => {
          const record = companyFilters.get(company.id);
          const filters = record?.filters ?? [];
          const offerings = record?.offerings ?? [];
          const isPending = pendingId === company.id;
          const isAgendaOpen = agendaForId === company.id;
          const wasFlashed = flashCompanyId === company.id;

          const otherBuckets = BUCKETS.filter(
            (bucket) => bucket.value !== company.bucket && bucket.value !== "SIN_ASIGNAR"
          );

          return (
            <article key={company.id} className="company-card">
              <details className="company-item">
                <summary className="company-summary">
                  <div className="company-summary__header">
                    <div className="summary-left">
                      <span className="catalog-index">
                        {String(index + 1).padStart(3, "0")}
                      </span>
                      <div className="catalog-logo">{getInitials(company.name)}</div>
                      <div className="summary-text">
                        <p className="catalog-sector">{company.industry || "Sin rubro"}</p>
                        <h3>{company.name}</h3>
                        {company.bucket !== "SIN_ASIGNAR" ? (
                          <span
                            className={`bucket-badge bucket-badge--${BUCKET_MODIFIER[company.bucket]}`}
                          >
                            {BUCKET_LABEL[company.bucket]}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="summary-contact">
                      {offerings.length > 0
                        ? offerings.map(getOfferingLabel).join(" | ")
                        : filters.map(getFilterLabel).join(" | ") ||
                          categoryLabel[company.category]}
                    </span>
                  </div>

                  <div
                    className="company-summary__actions"
                    onClick={stop}
                    onMouseDown={stop}
                  >
                    {otherBuckets.map((bucket) => (
                      <button
                        key={bucket.value}
                        type="button"
                        disabled={isPending}
                        className={`bucket-action bucket-action--${bucket.modifier}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          handleMove(company.id, bucket.value);
                        }}
                      >
                        → {bucket.label}
                      </button>
                    ))}
                    {company.bucket !== "SIN_ASIGNAR" ? (
                      <button
                        type="button"
                        disabled={isPending}
                        className="bucket-action bucket-action--unassign"
                        onClick={(event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          handleMove(company.id, "SIN_ASIGNAR");
                        }}
                      >
                        Quitar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`bucket-action bucket-action--agendar${
                        isAgendaOpen ? " active" : ""
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        if (isAgendaOpen) {
                          setAgendaForId(null);
                        } else {
                          openAgendaFor(company.id);
                        }
                      }}
                    >
                      📅 Agendar
                    </button>
                    {wasFlashed ? (
                      <span className="agenda-flash">✓ Tarea creada</span>
                    ) : null}
                  </div>
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

              {isAgendaOpen ? (
                <div className="agenda-mini" onClick={stop}>
                  <div className="agenda-mini__head">
                    <strong>📅 Nueva tarea para {company.name}</strong>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setAgendaForId(null)}
                      aria-label="Cerrar"
                    >
                      ✕
                    </button>
                  </div>

                  <form
                    className="agenda-mini__form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleAgendaSubmit(company.id);
                    }}
                  >
                    <input
                      type="text"
                      className="agenda-mini__title"
                      placeholder="¿Qué hay que hacer? (ej: Llamar a Juan)"
                      value={miniTitle}
                      onChange={(event) => setMiniTitle(event.target.value)}
                      autoFocus
                    />

                    <div className="agenda-mini__row">
                      <div className="quick-add__when" role="group" aria-label="Cuándo">
                        <button
                          type="button"
                          className={miniWhen === "today" ? "chip chip--blue active" : "chip"}
                          onClick={() => handleMiniWhen("today")}
                        >
                          Hoy
                        </button>
                        <button
                          type="button"
                          className={
                            miniWhen === "tomorrow" ? "chip chip--violet active" : "chip"
                          }
                          onClick={() => handleMiniWhen("tomorrow")}
                        >
                          Mañana
                        </button>
                        <button
                          type="button"
                          className={miniWhen === "custom" ? "chip active" : "chip"}
                          onClick={() => handleMiniWhen("custom")}
                        >
                          Otra
                        </button>
                      </div>

                      {miniWhen === "custom" ? (
                        <input
                          type="date"
                          className="quick-add__date"
                          value={miniDate}
                          onChange={(event) => setMiniDate(event.target.value)}
                          aria-label="Fecha"
                        />
                      ) : null}

                      <input
                        type="time"
                        className="quick-add__time"
                        value={miniTime}
                        onChange={(event) => setMiniTime(event.target.value)}
                        aria-label="Hora (opcional)"
                      />

                      <select
                        className="quick-add__priority"
                        value={miniPriority}
                        onChange={(event) => setMiniPriority(event.target.value as Priority)}
                        aria-label="Prioridad"
                      >
                        <option value="HIGH">Alta</option>
                        <option value="MEDIUM">Media</option>
                        <option value="LOW">Baja</option>
                      </select>
                    </div>

                    <div className="agenda-mini__actions">
                      <button
                        type="submit"
                        className="save-button save-button--sm"
                        disabled={!miniTitle.trim()}
                      >
                        Agendar
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => setAgendaForId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </>
  );
}
