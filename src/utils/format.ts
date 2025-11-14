export function formatMoney(value: number, locale = "es-CL"): string {
  return (value || 0).toLocaleString(locale, {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  });
}
