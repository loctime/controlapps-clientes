export function formatCurrency(value?: number | null) {
  if (typeof value !== "number") return "No definido";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value?: Date | string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium"
  }).format(new Date(value));
}
