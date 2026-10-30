export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character] ?? character;
  });
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (Array.isArray(value)) {
    return value.length ? value.map(String).join(", ") : "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function formatSectionTitle(value: string): string {
  const normalizedKey = value.toLowerCase();

  const labels: Record<string, string> = {
    notapplicableopenings: "Not Applicable",
    site_cleaned: "Site Cleaned",
    cabinets_cleaned: "Cabinets Cleaned",
    excess_material_removed: "Excess Material Removed",
    final_adjustment: "Final Adjustments",
    missing_materials_damages: "Missing Materials / Damages",
  };

  if (labels[normalizedKey]) {
    return labels[normalizedKey];
  }

  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
