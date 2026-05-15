export const PRIMARY_FILTERS = [
  "comercio",
  "fabrica",
  "empresa",
  "industria",
  "servicio",
  "logistica",
  "salud",
  "agro",
  "construccion",
  "tecnologia"
] as const;

export const SECONDARY_FILTERS = [
  "pequeno",
  "mediano",
  "grande",
  "magnate",
  "familiar",
  "exportador",
  "local",
  "regional"
] as const;

export const ALLOWED_FILTERS = [...PRIMARY_FILTERS, ...SECONDARY_FILTERS] as const;

export const OFFERING_OPTIONS = [
  "landing_page",
  "automatizacion",
  "controldoc",
  "controlaudit",
  "controlbun",
  "horarios",
  "stock",
  "crm",
  "dashboard",
  "integraciones"
] as const;

export const FILTER_LABELS: Record<(typeof ALLOWED_FILTERS)[number], string> = {
  comercio: "Comercio",
  fabrica: "Fabrica",
  empresa: "Empresa",
  industria: "Industria",
  servicio: "Servicio",
  logistica: "Logistica",
  salud: "Salud",
  agro: "Agro",
  construccion: "Construccion",
  tecnologia: "Tecnologia",
  pequeno: "Pequeno",
  mediano: "Mediano",
  grande: "Grande",
  magnate: "Magnate",
  familiar: "Familiar",
  exportador: "Exportador",
  local: "Local",
  regional: "Regional"
};

export const OFFERING_LABELS: Record<(typeof OFFERING_OPTIONS)[number], string> = {
  landing_page: "Landing page",
  automatizacion: "Automatizacion",
  controldoc: "ControlDoc",
  controlaudit: "ControlAudit",
  controlbun: "ControlBun",
  horarios: "Horarios",
  stock: "Stock",
  crm: "CRM",
  dashboard: "Dashboard",
  integraciones: "Integraciones"
};

export function parseStoredFilters(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function sanitizeFilters(values: string[]) {
  const allowed = new Set(ALLOWED_FILTERS);

  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => allowed.has(value as (typeof ALLOWED_FILTERS)[number]))
    )
  );
}

export function serializeFilters(values: string[]) {
  const primary = values.filter((value) =>
    (PRIMARY_FILTERS as readonly string[]).includes(value)
  );
  const secondary = values.filter((value) =>
    (SECONDARY_FILTERS as readonly string[]).includes(value)
  );

  return [...primary, ...secondary].join(", ");
}

export function sanitizeOfferings(values: string[]) {
  const allowed = new Set(OFFERING_OPTIONS);

  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => allowed.has(value as (typeof OFFERING_OPTIONS)[number]))
    )
  );
}

export function serializeOfferings(values: string[]) {
  return values.join(", ");
}

export function getFilterLabel(value: string) {
  return FILTER_LABELS[value as keyof typeof FILTER_LABELS] ?? value;
}

export function getOfferingLabel(value: string) {
  return OFFERING_LABELS[value as keyof typeof OFFERING_LABELS] ?? value;
}
